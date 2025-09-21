"""
Rutas y endpoints de la API (estructura nueva).
"""
from __future__ import annotations
from datetime import datetime, time, timedelta
from typing import Dict, List, Tuple, Optional
import os
import uuid
import logging

from fastapi import APIRouter, HTTPException, Depends, Request, Body
from sqlmodel import Session, select
from sqlalchemy import delete as sa_delete, text as _sql_text

from app.data import SERVICES, PROS, SERVICE_BY_ID, PRO_BY_ID
from app.models import (
    SlotsQuery, SlotsOut,
    Reservation, CancelReservationIn, ActionResult,
    RescheduleIn, RescheduleOut, ReservationIn,
    ReservationDB,
    DaysAvailabilityIn, DaysAvailabilityOut,
)
from app.services.logic import (
    find_available_slots,
    find_reservation, cancel_reservation,
    apply_reschedule,
    create_gcal_reservation,
    patch_gcal_reservation,
    delete_gcal_reservation,
    get_calendar_for_professional,
    sync_from_gcal_range,
    reconcile_db_to_gcal_range,
    detect_conflicts_range,
    collect_gcal_busy_for_range,
)
from app.db import get_session, engine
from app.utils.date import validate_target_dt, TZ, now_tz, MAX_AHEAD_DAYS
from app.core.metrics import RESERVATIONS_CREATED, RESERVATIONS_RESCHEDULED, RESERVATIONS_CANCELLED
from datetime import timezone as _utc_tz

logger = logging.getLogger("pelubot.api")

API_KEY = os.getenv("API_KEY", "changeme")
PUBLIC_RESERVATIONS_ENABLED = os.getenv("PUBLIC_RESERVATIONS_ENABLED", "false").lower() in ("1","true","yes","y","si","sí")
# En tests, forzamos autenticación aunque ALLOW_LOCAL_NO_AUTH esté activado en .env
_allow_local = os.getenv("ALLOW_LOCAL_NO_AUTH", "false").lower() in ("1","true","yes","y","si","sí")
ALLOW_LOCAL_NO_AUTH = False if os.getenv("PYTEST_CURRENT_TEST") else _allow_local

def require_api_key(request: Request):
    """Pequeño guard: permite tráfico local en dev si así se configura."""
    client_host = getattr(request.client, "host", None)
    if ALLOW_LOCAL_NO_AUTH and client_host in ("127.0.0.1", "localhost"):
        return
    # Para desarrollo, permitir sin autenticación si ALLOW_LOCAL_NO_AUTH está activado
    if ALLOW_LOCAL_NO_AUTH:
        return
    key = request.headers.get("X-API-Key") or ""
    auth = request.headers.get("Authorization") or ""
    if not key and auth:
        parts = auth.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            key = parts[1].strip()
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")

router = APIRouter()

GCAL_CALENDAR_ID = os.getenv("GCAL_CALENDAR_ID", os.getenv("GCAL_TEST_CALENDAR_ID", "pelubot.test@gmail.com"))

@router.get("/health")
def health():
    """Confirma que el servicio responde."""
    return {"ok": True}

@router.get("/ready", tags=["monitor"])
def readiness():
    """Verifica conectividad básica con la base de datos y Google Calendar."""
    status = {"db": "ok", "gcal": "ok"}
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as e:
        status["db"] = f"error: {e}"
    try:
        # Cliente de Google Calendar: integración nueva
        from app.integrations.google_calendar import build_calendar
        _ = build_calendar()
    except Exception as e:
        status["gcal"] = f"error: {e}"
    ok = all(v == "ok" for v in status.values())
    return {"ok": ok, **status}

@router.get("/")
def home():
    """Lista rutas de prueba para exploración manual."""
    return {
        "status": "ok",
        "try": [
            "/health", "/docs",
            "/services", "/professionals", "/slots",
            "/reservations", "/cancel_reservation (POST)",
            "/reservations/{reservation_id} (DELETE)",
            "/reschedule (POST)",
        ],
    }

@router.get("/services")
def list_services():
    """Devuelve el catálogo estático de servicios."""
    return SERVICES

@router.get("/professionals")
def list_professionals():
    """Devuelve el catálogo estático de profesionales."""
    return PROS

@router.get("/reservations")
def list_reservations(session: Session = Depends(get_session)):
    """Lista reservas ordenadas por inicio, normalizando TZ si faltan."""
    rows = session.exec(select(ReservationDB).order_by(ReservationDB.start)).all()
    logger.info("List reservations: %s rows", len(rows))
    out = []
    for r in rows:
        created = r.created_at
        updated = getattr(r, "updated_at", None)
        start = r.start
        end = r.end
        # Normalizamos TZ por compatibilidad con datos antiguos/externos.
        if start is not None and getattr(start, "tzinfo", None) is None:
            try:
                start = start.replace(tzinfo=TZ)
            except Exception:
                pass
        if end is not None and getattr(end, "tzinfo", None) is None:
            try:
                end = end.replace(tzinfo=TZ)
            except Exception:
                pass
        if created is not None and created.tzinfo is None:
            created = created.replace(tzinfo=_utc_tz.utc)
        if updated is not None and updated.tzinfo is None:
            updated = updated.replace(tzinfo=_utc_tz.utc)
        out.append({
            "id": r.id,
            "service_id": r.service_id,
            "professional_id": r.professional_id,
            "start": start.isoformat() if hasattr(start, "isoformat") else start,
            "end": end.isoformat() if hasattr(end, "isoformat") else end,
            "google_event_id": r.google_event_id,
            "google_calendar_id": r.google_calendar_id,
            "created_at": created.isoformat() if created else None,
            "updated_at": updated.isoformat() if updated else None,
        })
    return out

@router.post("/cancel_reservation", response_model=ActionResult)
def cancel_reservation_post(
    request: Request,
    payload: dict | None = Body(None),
    session: Session = Depends(get_session),
):
    require_api_key(request)
    """Cancela una reserva existente a partir del identificador recibido en el cuerpo."""
    if payload is None:
        # Preferimos el manejo estándar de FastAPI con HTTPException
        raise HTTPException(status_code=422, detail="Payload requerido")
    try:
        payload = CancelReservationIn(**payload)
    except Exception:
        raise HTTPException(status_code=422, detail="Payload inválido")
    logger.info("Cancel reservation requested: id=%s", payload.reservation_id)
    r = find_reservation(session, payload.reservation_id)
    if not r:
        raise HTTPException(status_code=404, detail="La reserva no existe")
    if r.google_event_id:
        try:
            delete_gcal_reservation(r.google_event_id, r.google_calendar_id or GCAL_CALENDAR_ID)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"No se pudo borrar en Google Calendar: {e}")
    ok = cancel_reservation(session, payload.reservation_id)
    if ok:
        logger.info("Reservation cancelled: id=%s", payload.reservation_id)
        try:
            RESERVATIONS_CANCELLED.inc()
        except Exception:
            pass
        return ActionResult(ok=True, message=f"Reserva {payload.reservation_id} cancelada.")
    raise HTTPException(status_code=500, detail="No se pudo cancelar la reserva")

@router.delete("/reservations/{reservation_id}", response_model=ActionResult)
def cancel_reservation_delete(
    reservation_id: str,
    request: Request,
    session: Session = Depends(get_session),
):
    require_api_key(request)
    """Cancela una reserva existente a partir del identificador en la URL."""
    logger.info("Cancel reservation requested: id=%s", reservation_id)
    r = find_reservation(session, reservation_id)
    if not r:
        raise HTTPException(status_code=404, detail="La reserva no existe")
    if r.google_event_id:
        try:
            delete_gcal_reservation(r.google_event_id, r.google_calendar_id or GCAL_CALENDAR_ID)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"No se pudo borrar en Google Calendar: {e}")
    ok = cancel_reservation(session, reservation_id)
    if ok:
        logger.info("Reservation cancelled: id=%s", reservation_id)
        try:
            RESERVATIONS_CANCELLED.inc()
        except Exception:
            pass
        return ActionResult(ok=True, message=f"Reserva {reservation_id} cancelada.")
    raise HTTPException(status_code=500, detail="No se pudo cancelar la reserva")

@router.post("/reschedule", response_model=RescheduleOut)
def reschedule_post(
    request: Request,
    payload: dict | None = Body(None),
    session: Session = Depends(get_session),
):
    require_api_key(request)
    """Reprograma una reserva validando horario, solapes y sincronización con Google Calendar."""
    # Serializa escrituras en SQLite para evitar condiciones de carrera
    try:
        if str(engine.url).startswith("sqlite"):
            try:
                session.exec(_sql_text("BEGIN IMMEDIATE"))
            except Exception:
                pass
    except Exception:
        pass
    if payload is None:
        raise HTTPException(status_code=422, detail="Payload requerido")
    try:
        payload = RescheduleIn(**payload)
    except Exception:
        raise HTTPException(status_code=422, detail="Payload inválido")
    logger.info("Reschedule requested: id=%s new_date=%s new_time=%s new_pro=%s", payload.reservation_id, payload.new_date, payload.new_time, payload.professional_id)
    r_prev = find_reservation(session, payload.reservation_id)
    if not r_prev:
        raise HTTPException(status_code=404, detail="La reserva no existe")
    if payload.new_start:
        try:
            new_start = datetime.fromisoformat(str(payload.new_start).replace("Z", "+00:00"))
            if new_start.tzinfo is None:
                new_start = new_start.replace(tzinfo=TZ)
            validate_target_dt(new_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="new_start inválido (ISO 8601 requerido).")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif payload.new_date and payload.new_time:
        try:
            new_start = datetime.strptime(f"{payload.new_date} {payload.new_time}", "%Y-%m-%d %H:%M")
            if new_start.tzinfo is None:
                new_start = new_start.replace(tzinfo=TZ)
            validate_target_dt(new_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Fecha/hora inválidas (formato).")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    old_start, old_end, old_pro, old_cal = r_prev.start, r_prev.end, r_prev.professional_id, r_prev.google_calendar_id
    ok, msg, r = apply_reschedule(session, payload)
    if not ok or not r:
        raise HTTPException(status_code=400, detail=msg)
    message_out = msg if (isinstance(msg, str) and "Reprogramada" in msg) else f"Reprogramada: {msg}"
    if r.google_event_id:
        try:
            new_cal = get_calendar_for_professional(r.professional_id)
            if old_cal and old_cal != new_cal:
                delete_gcal_reservation(r.google_event_id, old_cal)
                # Cambio de profesional implica mover el evento entre calendarios.
                gnew = create_gcal_reservation(Reservation(id=r.id, service_id=r.service_id, professional_id=r.professional_id, start=r.start, end=r.end, google_event_id=r.google_event_id, google_calendar_id=new_cal), calendar_id=new_cal)
                r.google_event_id = gnew.get("id"); r.google_calendar_id = new_cal
            else:
                # Mismo calendario: podríamos reutilizar evento con un patch.
                patch_gcal_reservation(r.google_event_id, r.start, r.end, old_cal or new_cal)
                r.google_calendar_id = old_cal or new_cal
            session.add(r); session.commit(); session.refresh(r)
        except Exception as e:
            r.start, r.end, r.professional_id, r.google_calendar_id = old_start, old_end, old_pro, old_cal
            session.add(r); session.commit()
            raise HTTPException(status_code=502, detail=f"No se pudo reprogramar en Google Calendar: {e}")
    logger.info("Reservation rescheduled: id=%s start=%s end=%s pro=%s", r.id, r.start.isoformat(), r.end.isoformat(), r.professional_id)
    return RescheduleOut(ok=True, message=message_out, reservation_id=r.id, start=r.start.isoformat(), end=r.end.isoformat())

@router.post("/reservations/reschedule", response_model=RescheduleOut)
def reschedule_post_alias(
    request: Request,
    payload: dict | None = Body(None),
    session: Session = Depends(get_session),
):
    """Alias legada del endpoint de reprogramación."""
    if payload is None:
        raise HTTPException(status_code=422, detail="Payload requerido")
    return reschedule_post(request, payload, session)

@router.post("/slots", response_model=SlotsOut)
def get_slots(q: SlotsQuery, session: Session = Depends(get_session)):
    """Calcula los huecos disponibles para un servicio en una fecha concreta."""
    logger.info("Slots query: service=%s date=%s pro=%s", q.service_id, q.date_str, q.professional_id)
    try:
        d = datetime.strptime(q.date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str debe ser YYYY-MM-DD")
    # Validación específica para /slots: permitimos el día de hoy aunque ya haya pasado 00:00,
    # pero seguimos limitando a no más de ~6 meses vista.
    today = now_tz().date()
    if d < today:
        raise HTTPException(status_code=400, detail="La fecha está en el pasado.")
    if d > today + timedelta(days=MAX_AHEAD_DAYS):
        raise HTTPException(status_code=400, detail="La fecha excede el límite de 6 meses.")
    if q.service_id not in SERVICE_BY_ID:
        raise HTTPException(status_code=404, detail="service_id no existe")
    if q.professional_id and q.professional_id not in PRO_BY_ID:
        raise HTTPException(status_code=404, detail="professional_id no existe")
    avail = find_available_slots(session, q.service_id, d, q.professional_id, use_gcal_busy_override=q.use_gcal)
    # Filtrar horas ya pasadas si es el día de hoy
    if d == today:
        now_local = now_tz().replace(tzinfo=None)
        avail = [dt for dt in avail if dt >= now_local]
    return SlotsOut(service_id=q.service_id, date=d, professional_id=q.professional_id, slots=[dt.isoformat() for dt in avail])


@router.post("/slots/days", response_model=DaysAvailabilityOut)
def get_days_availability(body: DaysAvailabilityIn, session: Session = Depends(get_session)):
    """Enumera los días del rango que aún tienen huecos disponibles."""
    if body.service_id not in SERVICE_BY_ID:
        raise HTTPException(status_code=404, detail="service_id no existe")
    if body.professional_id and body.professional_id not in PRO_BY_ID:
        raise HTTPException(status_code=404, detail="professional_id no existe")
    if body.end < body.start:
        raise HTTPException(status_code=400, detail="Rango inválido")
    # Limitar rango para evitar abusos
    if (body.end - body.start).days > 62:
        raise HTTPException(status_code=400, detail="Rango demasiado grande (máx. 62 días)")
    today = now_tz().date()

    pro_ids_for_service = (
        [body.professional_id]
        if body.professional_id
        else [p.id for p in PROS if body.service_id in (p.services or [])]
    )
    gcal_busy_range = collect_gcal_busy_for_range(
        pro_ids_for_service,
        body.start,
        body.end,
        use_gcal_override=body.use_gcal,
    )

    available_days: list[str] = []
    d = body.start
    while d <= body.end:
        if d >= today and d <= today + timedelta(days=MAX_AHEAD_DAYS):
            precomputed_busy: Optional[Dict[str, List[Tuple[datetime, datetime]]]] = None
            if gcal_busy_range:
                busy_map: Dict[str, List[Tuple[datetime, datetime]]] = {}
                for pid in pro_ids_for_service:
                    intervals = gcal_busy_range.get(pid, {}).get(d, [])
                    if intervals:
                        busy_map[pid] = intervals
                if busy_map:
                    precomputed_busy = busy_map

            slots = find_available_slots(
                session,
                body.service_id,
                d,
                body.professional_id,
                use_gcal_busy_override=body.use_gcal,
                precomputed_busy=precomputed_busy,
            )
            if d == today:
                now_local = now_tz().replace(tzinfo=None)
                slots = [dt for dt in slots if dt >= now_local]
            if slots:
                available_days.append(d.isoformat())
        d += timedelta(days=1)
    return DaysAvailabilityOut(service_id=body.service_id, start=body.start, end=body.end, professional_id=body.professional_id, available_days=available_days)

def _naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt

@router.post("/reservations", response_model=ActionResult)
def create_reservation(
    request: Request,
    payload: dict | None = Body(None),
    session: Session = Depends(get_session),
):
    if not PUBLIC_RESERVATIONS_ENABLED:
        require_api_key(request)
    """Crea una reserva nueva y sincroniza con Google Calendar cuando sea posible."""
    if payload is None:
        raise HTTPException(status_code=422, detail="Payload requerido")
    try:
        payload = ReservationIn(**payload)
    except Exception:
        raise HTTPException(status_code=422, detail="Payload inválido")
    logger.info("Create reservation: service=%s pro=%s start=%s", payload.service_id, payload.professional_id, payload.start.isoformat())
    if payload.service_id not in SERVICE_BY_ID:
        raise HTTPException(status_code=404, detail="service_id no existe")
    if payload.professional_id not in PRO_BY_ID:
        raise HTTPException(status_code=404, detail="professional_id no existe")
    # Compatibilidad: el profesional debe ofrecer el servicio solicitado
    try:
        pro = PRO_BY_ID[payload.professional_id]
        if payload.service_id not in (pro.services or []):
            raise HTTPException(status_code=400, detail="El profesional no ofrece ese servicio")
    except Exception:
        pass
    start = payload.start
    if start.tzinfo is None:
        start = start.replace(tzinfo=TZ)
    try:
        validate_target_dt(start)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    service = SERVICE_BY_ID[payload.service_id]
    end = start + timedelta(minutes=service.duration_min)
    # Recalcular disponibilidad garantiza que el slot sigue libre tras la validación inicial.
    avail = find_available_slots(session, payload.service_id, start.date(), payload.professional_id)
    avail_naive = [_naive(dt) for dt in avail]
    if _naive(start) not in avail_naive:
        raise HTTPException(status_code=400, detail="Ese inicio no está disponible (horario o solapado). Consulta /slots.")
    res_id = str(uuid.uuid4())
    cal_id = get_calendar_for_professional(payload.professional_id)
    gcal_id = None

    # NOTA: bloqueamos la tabla para evitar condiciones de carrera en SQLite.
    try:
        if str(engine.url).startswith("sqlite"):
            try:
                session.exec(_sql_text("BEGIN IMMEDIATE"))
            except Exception:
                pass
        q = select(ReservationDB).where(
            ReservationDB.professional_id == payload.professional_id,
            ReservationDB.start < end,
            ReservationDB.end > start,
        )
        if session.exec(q).first():
            session.rollback()
            raise HTTPException(status_code=400, detail="El profesional ya tiene esa hora ocupada.")
        row = ReservationDB(id=res_id, service_id=payload.service_id, professional_id=payload.professional_id, start=start, end=end, google_event_id=None, google_calendar_id=cal_id)
        session.add(row)
        session.commit()
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la reserva: {e}")

    # NOTA: se sincroniza después del commit para no deshacer la reserva si Google falla.
    try:
        gcal_event = create_gcal_reservation(Reservation(id=res_id, service_id=payload.service_id, professional_id=payload.professional_id, start=start, end=end), calendar_id=cal_id)
        gcal_id = gcal_event.get("id")
        r_upd = session.get(ReservationDB, res_id)
        if r_upd:
            r_upd.google_event_id = gcal_id
            r_upd.google_calendar_id = cal_id
            session.add(r_upd); session.commit()
        logger.info("Evento Google Calendar creado: %s", gcal_id)
    except Exception as e:
        logger.warning("Google Calendar no disponible; reserva sin sincronización: %s", e)

    message = f"Reserva creada exitosamente. ID: {res_id}"
    if gcal_id:
        message += f", Evento Google Calendar: {gcal_id}"
    else:
        message += " (sin sincronización con Google Calendar)"
    logger.info("Reservation created: id=%s gcal_event=%s calendar=%s start=%s end=%s", res_id, gcal_id, cal_id, start.isoformat(), end.isoformat())
    return ActionResult(ok=True, message=message)

# Admin
from pydantic import BaseModel

class AdminSyncIn(BaseModel):
    mode: str | None = None
    start: str | None = None
    end: str | None = None
    days: int | None = None
    by_professional: bool | None = True
    calendar_id: str | None = None
    professional_id: str | None = None
    default_service: str | None = None

@router.post("/admin/sync")
def admin_sync(body: AdminSyncIn | None = None, session: Session = Depends(get_session), _=Depends(require_api_key)):
    """Sincroniza la BD con Google Calendar: importa, exporta o ambos según `mode`."""
    from datetime import date, timedelta
    body = body or AdminSyncIn()
    mode = (body.mode or "import").lower()
    start = date.fromisoformat(body.start) if body.start else date.today()
    if body.end:
        end = date.fromisoformat(body.end)
    else:
        days = body.days if body.days and body.days > 0 else 7
        end = start + timedelta(days=max(0, days - 1))
    by_prof = True if body.by_professional is None else bool(body.by_professional)
    results: dict[str, dict] = {}
    if mode in ("import", "both"):
        results["import"] = sync_from_gcal_range(
            session,
            start,
            end,
            default_service=body.default_service or "corte",
            by_professional=by_prof,
            calendar_id=body.calendar_id,
            professional_id=body.professional_id,
        )
    if mode in ("push", "both"):
        results["push"] = reconcile_db_to_gcal_range(
            session,
            start,
            end,
            by_professional=by_prof,
            calendar_id=body.calendar_id,
            professional_id=body.professional_id,
        )

    per_task_ok = {name: res.get("ok", True) for name, res in results.items()}
    overall_ok = all(per_task_ok.values()) if per_task_ok else True
    errors = {
        name: res.get("error")
        for name, res in results.items()
        if res.get("ok", True) is False and res.get("error")
    }

    payload = {
        "ok": overall_ok,
        "mode": mode,
        "range": (start.isoformat(), end.isoformat()),
        "results": results,
    }
    if errors:
        payload["errors"] = errors
    return payload

class AdminConflictsIn(BaseModel):
    start: str | None = None
    end: str | None = None
    days: int | None = None
    by_professional: bool | None = True
    calendar_id: str | None = None
    professional_id: str | None = None

@router.post("/admin/conflicts")
def admin_conflicts(body: AdminConflictsIn | None = None, session: Session = Depends(get_session), _=Depends(require_api_key)):
    """Detecta discrepancias entre la BD y Google Calendar en el rango solicitado."""
    from datetime import date, timedelta
    body = body or AdminConflictsIn()
    start = date.fromisoformat(body.start) if body.start else date.today()
    if body.end:
        end = date.fromisoformat(body.end)
    else:
        days = body.days if body.days and body.days > 0 else 7
        end = start + timedelta(days=max(0, days - 1))
    by_prof = True if body.by_professional is None else bool(body.by_professional)
    summary = detect_conflicts_range(session, start, end, by_professional=by_prof, calendar_id=body.calendar_id, professional_id=body.professional_id)
    return {"ok": bool(summary.get("ok")), "range": (start.isoformat(), end.isoformat()), **summary}

class AdminClearCalendarsIn(BaseModel):
    by_professional: bool | None = True
    calendar_id: str | None = None
    calendar_ids: list[str] | None = None
    start: str | None = None
    end: str | None = None
    only_pelubot: bool | None = False
    dry_run: bool | None = True
    confirm: str | None = None

from app.integrations.google_calendar import build_calendar, clear_calendar, list_events_allpages, delete_event

@router.post("/admin/clear_calendars")
def admin_clear_calendars(body: AdminClearCalendarsIn | None = None, _=Depends(require_api_key)):
    """Limpia calendarios de Google con opciones de dry-run y filtro por eventos de PeluBot."""
    from app.data import PRO_CALENDAR
    body = body or AdminClearCalendarsIn()
    if not (body.dry_run or (body.confirm and body.confirm.upper() == "DELETE")):
        return {"ok": False, "error": "Confirmación requerida: confirm='DELETE' o dry_run=true"}
    cals: list[str] = []
    if body.calendar_ids:
        cals.extend([c for c in body.calendar_ids if c])
    if body.calendar_id:
        cals.append(body.calendar_id)
    if body.by_professional or not cals:
        cals.extend([v for v in PRO_CALENDAR.values() if v])
    cals = sorted(set(cals))
    if not cals:
        return {"ok": False, "error": "No hay calendarios destino"}
    tmin = f"{body.start}T00:00:00" if body.start else None
    tmax = f"{body.end}T23:59:59" if body.end else None
    try:
        svc = build_calendar()
    except Exception as e:
        return {"ok": False, "error": f"gcal client: {e}"}
    results = {}; total_deleted = total_listed = total_skipped = 0
    for cal in cals:
        res = clear_calendar(svc, cal, time_min=tmin, time_max=tmax, only_pelubot=bool(body.only_pelubot), dry_run=bool(body.dry_run))
        results[cal] = res
        total_deleted += res.get("deleted", 0); total_listed += res.get("total_listed", 0); total_skipped += res.get("skipped", 0)
    return {"ok": True, "dry_run": bool(body.dry_run), "only_pelubot": bool(body.only_pelubot), "calendars": cals, "range": (body.start, body.end), "totals": {"listed": total_listed, "deleted": total_deleted, "skipped": total_skipped}, "results": results}

# --- Wipe de reservas en BD (peligroso) ---
class AdminWipeReservationsIn(BaseModel):
    confirm: str | None = None

# --- Limpieza de eventos huérfanos en Google Calendar ---
class AdminCleanupOrphansIn(BaseModel):
    by_professional: bool | None = True
    calendar_id: str | None = None
    calendar_ids: list[str] | None = None
    start: str | None = None
    end: str | None = None
    dry_run: bool | None = True
    confirm: str | None = None

@router.post("/admin/cleanup_orphans")
def admin_cleanup_orphans(body: AdminCleanupOrphansIn | None = None, session: Session = Depends(get_session), _=Depends(require_api_key)):
    """Elimina eventos en Google Calendar cuyo reservation_id ya no existe en la BD."""
    """Borra eventos en GCal con private.reservation_id cuyo ID no existe en la BD local.
    Requiere confirm='DELETE' si dry_run es False.
    """
    from app.data import PRO_CALENDAR
    body = body or AdminCleanupOrphansIn()
    if not (body.dry_run or (body.confirm and body.confirm.upper() == "DELETE")):
        return {"ok": False, "error": "Confirmación requerida: confirm='DELETE' o dry_run=true"}
    cals: list[str] = []
    if body.calendar_ids:
        cals.extend([c for c in body.calendar_ids if c])
    if body.calendar_id:
        cals.append(body.calendar_id)
    if body.by_professional or not cals:
        cals.extend([v for v in PRO_CALENDAR.values() if v])
    cals = sorted(set(cals))
    if not cals:
        return {"ok": False, "error": "No hay calendarios destino"}
    tmin = f"{body.start}T00:00:00" if body.start else None
    tmax = f"{body.end}T23:59:59" if body.end else None
    try:
        svc = build_calendar()
    except Exception as e:
        return {"ok": False, "error": f"gcal client: {e}"}
    results: dict[str, dict] = {}
    totals = {"listed": 0, "orphans_found": 0, "deleted": 0, "skipped": 0}
    for cal in cals:
        items = []
        try:
            items = list_events_allpages(svc, cal, time_min=tmin, time_max=tmax)
        except Exception:
            items = []
        listed = len(items)
        orphans = deleted = skipped = 0
        for it in items:
            ev_id = it.get("id")
            if not ev_id:
                continue
            priv = (it.get("extendedProperties") or {}).get("private") or {}
            rid = priv.get("reservation_id")
            if not rid:
                continue
            r = session.get(ReservationDB, rid)
            if r is None:
                orphans += 1
                if not body.dry_run:
                    try:
                        delete_event(svc, cal, ev_id)
                        deleted += 1
                    except Exception:
                        skipped += 1
        results[cal] = {"listed": listed, "orphans_found": orphans, "deleted": deleted, "skipped": skipped}
        totals["listed"] += listed; totals["orphans_found"] += orphans; totals["deleted"] += deleted; totals["skipped"] += skipped
    return {"ok": True, "dry_run": bool(body.dry_run), "calendars": cals, "range": (body.start, body.end), "totals": totals, "results": results}

@router.post("/admin/wipe_reservations")
def admin_wipe_reservations(body: AdminWipeReservationsIn | None = None, session: Session = Depends(get_session), _=Depends(require_api_key)):
    """Elimina todas las reservas locales tras confirmación explícita."""
    body = body or AdminWipeReservationsIn()
    if not (body.confirm and body.confirm.upper() == "DELETE"):
        return {"ok": False, "error": "Confirmación requerida: confirm='DELETE'"}
    try:
        session.exec(sa_delete(ReservationDB))
        session.commit()
        return {"ok": True, "message": "Todas las reservas eliminadas"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo limpiar la BD: {e}")

# --- Info y optimización de base de datos ---
@router.get("/admin/db_info")
def admin_db_info(session: Session = Depends(get_session), _=Depends(require_api_key)):
    """Muestra metadatos de la base de datos y estadísticas básicas de reservas."""
    db_url_env = os.getenv("DATABASE_URL")
    is_sqlite = str(engine.url).startswith("sqlite")
    sqlite_path = None
    file_exists = file_size = None
    if is_sqlite:
        # Obtiene la ruta de forma robusta a través de engine.url.database
        try:
            raw = getattr(engine.url, "database", None)
            if raw:
                sqlite_path = os.path.abspath(raw)
        except Exception:
            sqlite_path = None
        if sqlite_path and os.path.exists(sqlite_path):
            try:
                file_exists = True
                file_size = os.path.getsize(sqlite_path)
            except Exception:
                pass
    count = session.exec(select(ReservationDB)).all()
    total = len(count)
    first = min((r.start for r in count), default=None)
    last = max((r.start for r in count), default=None)
    pragma = {}
    if is_sqlite:
        try:
            with engine.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA journal_mode;").scalar()
                pragma["journal_mode"] = res
                res2 = conn.exec_driver_sql("PRAGMA synchronous;").scalar()
                pragma["synchronous"] = res2
                fk = conn.exec_driver_sql("PRAGMA foreign_keys;").scalar()
                pragma["foreign_keys"] = fk
        except Exception:
            pass
    return {
        "ok": True,
        "engine_url": str(engine.url),
        "env_DATABASE_URL": db_url_env,
        "is_sqlite": is_sqlite,
        "sqlite_path": sqlite_path,
        "file_exists": file_exists,
        "file_size": file_size,
        "reservations": {"total": total, "first": first.isoformat() if first else None, "last": last.isoformat() if last else None},
        "pragma": pragma,
    }

@router.get("/admin/db_integrity")
def admin_db_integrity(_=Depends(require_api_key)):
    """Ejecuta `PRAGMA integrity_check` en SQLite."""
    """Ejecuta PRAGMA integrity_check y devuelve ok/detail.
    Útil para verificar integridad tras operaciones o caídas.
    """
    is_sqlite = str(engine.url).startswith("sqlite")
    if not is_sqlite:
        return {"ok": False, "detail": "Solo soportado en SQLite"}
    try:
        with engine.connect() as conn:
            res = conn.exec_driver_sql("PRAGMA integrity_check;").scalar()
        return {"ok": (res == "ok"), "detail": res}
    except Exception as e:
        return {"ok": False, "detail": str(e)}

class AdminDbOptimizeIn(BaseModel):
    vacuum: bool | None = True
    analyze: bool | None = True
    optimize: bool | None = True

@router.post("/admin/db_optimize")
def admin_db_optimize(body: AdminDbOptimizeIn | None = None, _=Depends(require_api_key)):
    """Lanza VACUUM/ANALYZE/PRAGMA optimize en SQLite según parámetros."""
    body = body or AdminDbOptimizeIn()
    is_sqlite = str(engine.url).startswith("sqlite")
    actions = {"vacuum": False, "analyze": False, "optimize": False}
    if not is_sqlite:
        return {"ok": False, "error": "Solo soportado en SQLite"}
    try:
        with engine.connect() as conn:
            if body.vacuum:
                conn.exec_driver_sql("VACUUM")
                actions["vacuum"] = True
            if body.analyze:
                conn.exec_driver_sql("ANALYZE")
                actions["analyze"] = True
            if body.optimize:
                try:
                    conn.exec_driver_sql("PRAGMA optimize;")
                    actions["optimize"] = True
                except Exception:
                    pass
        return {"ok": True, "actions": actions}
    except Exception as e:
        return {"ok": False, "error": str(e), "actions": actions}

# Checkpoint WAL (SQLite)
class AdminDbCheckpointOut(BaseModel):
    ok: bool
    result: list | None = None
    error: str | None = None

@router.post("/admin/db_checkpoint", response_model=AdminDbCheckpointOut)
def admin_db_checkpoint(_=Depends(require_api_key)):
    """Fuerza un checkpoint WAL en SQLite."""
    is_sqlite = str(engine.url).startswith("sqlite")
    if not is_sqlite:
        return AdminDbCheckpointOut(ok=False, error="Solo soportado en SQLite")
    try:
        with engine.connect() as conn:
            res = conn.exec_driver_sql("PRAGMA wal_checkpoint(TRUNCATE);").fetchone()
        return AdminDbCheckpointOut(ok=True, result=list(res) if res else [])
    except Exception as e:
        return AdminDbCheckpointOut(ok=False, error=str(e))
