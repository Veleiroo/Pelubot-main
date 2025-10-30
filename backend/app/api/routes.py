"""
Rutas y endpoints de la API (estructura nueva).
"""
from __future__ import annotations
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Tuple, Optional
import os
import uuid
import logging

from fastapi import APIRouter, HTTPException, Depends, Request, Body, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from sqlalchemy import delete as sa_delete, text as _sql_text, func, inspect as sa_inspect

from app.data import (
    get_services,
    get_service_by_id,
    get_active_professionals,
    get_professional_by_id,
    get_professional_calendars,
)
from app.models import (
    SlotsQuery, SlotsOut,
    CancelReservationIn, ActionResult,
    RescheduleIn, RescheduleOut, ReservationIn, ReservationCreateOut,
    ReservationDB,
    DaysAvailabilityIn, DaysAvailabilityOut,
    CalendarSyncJobDB, CalendarJobOut, CalendarJobListOut, CalendarJobRetryIn,
    ReservationSyncStatusOut,
)
from app.services.logic import (
    find_available_slots,
    find_reservation, cancel_reservation,
    apply_reschedule,
    get_calendar_for_professional,
    sync_from_gcal_range,
    reconcile_db_to_gcal_range,
    detect_conflicts_range,
)
from app.services.calendar_queue import CalendarSyncAction, try_enqueue_calendar_job, refresh_queue_metrics
from app.db import get_session, engine
from app.utils.date import validate_target_dt, TZ, now_tz, MAX_AHEAD_DAYS
from app.core.metrics import RESERVATIONS_CREATED, RESERVATIONS_CANCELLED
from datetime import timezone as _utc_tz

logger = logging.getLogger("pelubot.api")

_ENV_NAME = os.getenv("ENV", "dev").lower()


def _load_api_key() -> str:
    key = (os.getenv("API_KEY") or "").strip()
    if not key:
        raise RuntimeError("API_KEY no configurada; define una clave segura en el entorno")
    if key.lower() == "changeme":
        raise RuntimeError("API_KEY no puede ser 'changeme'; define una clave única")
    return key


API_KEY = _load_api_key()
PUBLIC_RESERVATIONS_ENABLED = os.getenv("PUBLIC_RESERVATIONS_ENABLED", "false").lower() in ("1","true","yes","y","si","sí")

_allow_local_raw = os.getenv("ALLOW_LOCAL_NO_AUTH", "false").lower() in ("1","true","yes","y","si","sí")
if _allow_local_raw and _ENV_NAME in {"prod", "production"}:
    logger.warning("Ignorando ALLOW_LOCAL_NO_AUTH porque ENV indica entorno productivo")
ALLOW_LOCAL_NO_AUTH = (False if os.getenv("PYTEST_CURRENT_TEST") else _allow_local_raw) and _ENV_NAME not in {"prod", "production"}
_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


def _is_request_local(request: Request) -> bool:
    client_host = getattr(request.client, "host", None)
    forwarded = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    if forwarded:
        forwarded_host = forwarded.split(",")[0].strip()
        if forwarded_host and forwarded_host not in _LOCAL_HOSTS:
            return False
    return client_host in _LOCAL_HOSTS

def require_api_key(request: Request):
    """Pequeño guard: permite tráfico local en dev si así se configura."""
    if ALLOW_LOCAL_NO_AUTH and _is_request_local(request):
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


def _build_public_create_message(reservation_id: str, sync_status: str, sync_job_id: Optional[int]) -> str:
    base = f"Reserva creada exitosamente. ID: {reservation_id}."
    if sync_status == "queued":
        if sync_job_id is not None:
            return f"{base} Sincronización con Google Calendar encolada (job {sync_job_id})."
        return f"{base} Sincronización con Google Calendar encolada."
    if sync_status == "skipped":
        return f"{base} No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."
    return base

@router.get("/health")
def health():
    """Confirma que el servicio responde."""
    return {"ok": True}

@router.get("/ready", tags=["monitor"])
def readiness():
    """Verifica conectividad básica con la base de datos y Google Calendar."""
    status = {"db": "ok", "queue_worker": "ok"}
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as e:
        status["db"] = f"error: {e}"
        logger.exception("Readiness DB check failed")
    queue_pending: Optional[int] = None
    queue_processing: Optional[int] = None
    try:
        pending, processing = refresh_queue_metrics()
        queue_pending, queue_processing = pending, processing
    except Exception as e:
        status["queue_worker"] = f"error: {e}"
        logger.exception("Readiness queue metrics failed")
    ok = status["db"] == "ok" and status["queue_worker"] == "ok"
    payload = {"ok": ok, **status}
    if queue_pending is not None:
        payload["queue_pending"] = queue_pending
    if queue_processing is not None:
        payload["queue_processing"] = queue_processing
    return payload

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
    return get_services()

@router.get("/professionals")
def list_professionals():
    """Devuelve el catálogo estático de profesionales."""
    return get_active_professionals()

@router.get("/reservations")
def list_reservations(
    request: Request,
    session: Session = Depends(get_session),
    professional_id: Optional[str] = Query(default=None, description="Filtra por profesional"),
    status: Optional[str] = Query(default=None, description="Filtra por estado"),
    start_from: Optional[str] = Query(default=None, description="ISO8601 desde (incluido)"),
    start_to: Optional[str] = Query(default=None, description="ISO8601 hasta (incluido)"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Lista reservas con filtros básicos y paginación."""
    if not PUBLIC_RESERVATIONS_ENABLED:
        require_api_key(request)
    stmt = select(ReservationDB)
    if professional_id:
        stmt = stmt.where(ReservationDB.professional_id == professional_id)
    if status:
        stmt = stmt.where(ReservationDB.status == status)

    def _parse_bound(value: str, field: str) -> datetime:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"{field} inválido. Usa ISO 8601.")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TZ)
        else:
            dt = dt.astimezone(TZ)
        return dt

    if start_from:
        start_dt = _parse_bound(start_from, "start_from")
        stmt = stmt.where(ReservationDB.start >= start_dt)
    if start_to:
        end_dt = _parse_bound(start_to, "start_to")
        stmt = stmt.where(ReservationDB.start <= end_dt)

    stmt = stmt.order_by(ReservationDB.start).offset(offset).limit(limit)
    rows = session.exec(stmt).all()
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
            "customer_name": getattr(r, "customer_name", None),
            "customer_email": getattr(r, "customer_email", None),
            "customer_phone": getattr(r, "customer_phone", None),
            "notes": getattr(r, "notes", None),
            "created_at": created.isoformat() if created else None,
            "updated_at": updated.isoformat() if updated else None,
            "sync_status": getattr(r, "sync_status", None),
            "sync_job_id": getattr(r, "sync_job_id", None),
            "sync_last_error": getattr(r, "sync_last_error", None),
            "sync_updated_at": getattr(r, "sync_updated_at", None).isoformat() if getattr(r, "sync_updated_at", None) else None,
        })
    return out


@router.get("/reservations/{reservation_id}/sync", response_model=ReservationSyncStatusOut)
def get_reservation_sync_status(
    reservation_id: str,
    request: Request,
    session: Session = Depends(get_session),
):
    require_api_key(request)
    reservation = session.get(ReservationDB, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="La reserva no existe")
    return ReservationSyncStatusOut(
        reservation_id=reservation.id,
        sync_status=reservation.sync_status,
        sync_job_id=reservation.sync_job_id,
        sync_last_error=reservation.sync_last_error,
        sync_updated_at=reservation.sync_updated_at,
    )

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
    ok = cancel_reservation(session, payload.reservation_id)
    if ok:
        logger.info("Reservation cancelled: id=%s", payload.reservation_id)
        try:
            RESERVATIONS_CANCELLED.inc()
        except Exception:
            pass
        payload_sync = {"drop_calendar": False}
        if getattr(r, "google_event_id", None):
            payload_sync["event_id"] = r.google_event_id
        if getattr(r, "google_calendar_id", None):
            payload_sync["calendar_id"] = r.google_calendar_id
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=payload.reservation_id,
            action=CalendarSyncAction.DELETE,
            payload=payload_sync,
        )
        base = f"Reserva {payload.reservation_id} cancelada."
        if sync_status == "queued":
            suffix = " Sincronización con Google Calendar encolada."
            if sync_job_id is not None:
                suffix = f"{suffix[:-1]} (job {sync_job_id})."
        else:
            suffix = " No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."
        sync_error = None if sync_status == "queued" else suffix.strip()
        try:
            session.refresh(r)
        except Exception:
            pass
        try:
            r.sync_status = sync_status
            r.sync_job_id = sync_job_id
            r.sync_last_error = sync_error
            r.sync_updated_at = datetime.now(timezone.utc)
            session.add(r)
            session.commit()
        except Exception:
            session.rollback()
        return ActionResult(ok=True, message=f"{base}{suffix}")
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
    ok = cancel_reservation(session, reservation_id)
    if ok:
        logger.info("Reservation cancelled: id=%s", reservation_id)
        try:
            RESERVATIONS_CANCELLED.inc()
        except Exception:
            pass
        payload_sync = {"drop_calendar": False}
        if getattr(r, "google_event_id", None):
            payload_sync["event_id"] = r.google_event_id
        if getattr(r, "google_calendar_id", None):
            payload_sync["calendar_id"] = r.google_calendar_id
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=reservation_id,
            action=CalendarSyncAction.DELETE,
            payload=payload_sync,
        )
        base = f"Reserva {reservation_id} cancelada."
        if sync_status == "queued":
            suffix = " Sincronización con Google Calendar encolada."
            if sync_job_id is not None:
                suffix = f"{suffix[:-1]} (job {sync_job_id})."
        else:
            suffix = " No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."
        sync_error = None if sync_status == "queued" else suffix.strip()
        try:
            session.refresh(r)
        except Exception:
            pass
        try:
            r.sync_status = sync_status
            r.sync_job_id = sync_job_id
            r.sync_last_error = sync_error
            r.sync_updated_at = datetime.now(timezone.utc)
            session.add(r)
            session.commit()
        except Exception:
            session.rollback()
        return ActionResult(ok=True, message=f"{base}{suffix}")
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
    ok, msg, r = apply_reschedule(session, payload)
    if not ok or not r:
        raise HTTPException(status_code=400, detail=msg)
    calendar_id = getattr(r, "google_calendar_id", None) or get_calendar_for_professional(r.professional_id)
    sync_status = "skipped"
    sync_job_id: Optional[int] = None
    if r.google_event_id and calendar_id:
        payload_sync = {"calendar_id": calendar_id, "event_id": r.google_event_id}
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=r.id,
            action=CalendarSyncAction.UPDATE,
            payload=payload_sync,
        )
    else:
        payload_sync = {"calendar_id": calendar_id} if calendar_id else None
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=r.id,
            action=CalendarSyncAction.CREATE,
            payload=payload_sync,
        )
    session.refresh(r)
    message_out = msg if (isinstance(msg, str) and "Reprogramada" in msg) else f"Reprogramada: {msg}"
    if sync_status == "queued":
        message_out = f"{message_out} Sincronización con Google Calendar encolada."
    elif sync_status == "skipped":
        message_out = f"{message_out} No se pudo encolar la actualización en Google Calendar; revísalo manualmente."
    sync_error = None if sync_status == "queued" else (
        "No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."
        if sync_status == "skipped"
        else None
    )
    try:
        session.refresh(r)
    except Exception:
        pass
    try:
        r.sync_status = sync_status
        r.sync_job_id = sync_job_id
        r.sync_last_error = sync_error
        r.sync_updated_at = datetime.now(timezone.utc)
        session.add(r)
        session.commit()
    except Exception:
        session.rollback()
    logger.info("Reservation rescheduled: id=%s start=%s end=%s pro=%s", r.id, r.start.isoformat(), r.end.isoformat(), r.professional_id)
    return RescheduleOut(
        ok=True,
        message=message_out,
        reservation_id=r.id,
        start=r.start.isoformat(),
        end=r.end.isoformat(),
        google_sync_status=sync_status,
        sync_job_id=sync_job_id,
    )

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
    try:
        get_service_by_id(q.service_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="service_id no existe")
    if q.professional_id and not get_professional_by_id(q.professional_id):
        raise HTTPException(status_code=404, detail="professional_id no existe")
    avail = find_available_slots(session, q.service_id, d, q.professional_id, use_gcal_busy_override=False)
    # Filtrar horas ya pasadas si es el día de hoy
    if d == today:
        now_local = now_tz().replace(tzinfo=None)
        avail = [dt for dt in avail if dt >= now_local]
    return SlotsOut(service_id=q.service_id, date=d, professional_id=q.professional_id, slots=[dt.isoformat() for dt in avail])


@router.post("/slots/days", response_model=DaysAvailabilityOut)
def get_days_availability(body: DaysAvailabilityIn, session: Session = Depends(get_session)):
    """Enumera los días del rango que aún tienen huecos disponibles."""
    try:
        get_service_by_id(body.service_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="service_id no existe")
    if body.professional_id and not get_professional_by_id(body.professional_id):
        raise HTTPException(status_code=404, detail="professional_id no existe")
    if body.end < body.start:
        raise HTTPException(status_code=400, detail="Rango inválido")
    # Limitar rango para evitar abusos
    if (body.end - body.start).days > 62:
        raise HTTPException(status_code=400, detail="Rango demasiado grande (máx. 62 días)")
    today = now_tz().date()

    if body.professional_id:
        pro_ids_for_service = [body.professional_id]
    else:
        pro_ids_for_service = [
            p.id for p in get_active_professionals() if body.service_id in (p.services or [])
        ]
    gcal_busy_range: Dict[str, Dict[date, List[Tuple[datetime, datetime]]]] = {}

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

@router.post("/reservations", response_model=ReservationCreateOut)
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
    try:
        service = get_service_by_id(payload.service_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="service_id no existe")
    pro = get_professional_by_id(payload.professional_id)
    if pro is None:
        raise HTTPException(status_code=404, detail="professional_id no existe")
    if payload.service_id not in (pro.services or []):
        raise HTTPException(status_code=400, detail="El profesional no ofrece ese servicio")
    start = payload.start
    if start.tzinfo is None:
        start = start.replace(tzinfo=TZ)
    try:
        validate_target_dt(start)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    end = start + timedelta(minutes=service.duration_min)
    customer_name = payload.customer_name.strip()
    customer_phone = payload.customer_phone.strip()
    customer_email = str(payload.customer_email).strip() if payload.customer_email else None
    notes = payload.notes.strip() if payload.notes else None
    if not customer_phone:
        raise HTTPException(status_code=422, detail="Se requiere un teléfono de contacto")
    # Recalcular disponibilidad garantiza que el slot sigue libre tras la validación inicial.
    avail = find_available_slots(session, payload.service_id, start.date(), payload.professional_id)
    avail_naive = [_naive(dt) for dt in avail]
    if _naive(start) not in avail_naive:
        raise HTTPException(status_code=400, detail="Ese inicio no está disponible (horario o solapado). Consulta /slots.")
    res_id = str(uuid.uuid4())
    cal_id = get_calendar_for_professional(payload.professional_id)

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
            ReservationDB.status != "cancelada",
        )
        if session.exec(q).first():
            session.rollback()
            raise HTTPException(status_code=400, detail="El profesional ya tiene esa hora ocupada.")
        row = ReservationDB(
            id=res_id,
            service_id=payload.service_id,
            professional_id=payload.professional_id,
            start=start,
            end=end,
            google_event_id=None,
            google_calendar_id=cal_id,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            notes=notes,
        )
        session.add(row)
        session.commit()
        try:
            RESERVATIONS_CREATED.inc()
        except Exception:
            pass
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la reserva: {e}")

    sync_status, sync_job_id = try_enqueue_calendar_job(
        session,
        reservation_id=res_id,
        action=CalendarSyncAction.CREATE,
        payload={"calendar_id": cal_id} if cal_id else None,
    )

    sync_error = None if sync_status == "queued" else "No se pudo encolar la sincronización en Google Calendar; revísalo manualmente."
    try:
        session.refresh(row)
    except Exception:
        pass
    try:
        row.sync_status = sync_status
        row.sync_job_id = sync_job_id
        row.sync_last_error = sync_error
        row.sync_updated_at = datetime.now(timezone.utc)
        session.add(row)
        session.commit()
    except Exception:
        session.rollback()

    message = _build_public_create_message(res_id, sync_status, sync_job_id)
    payload_out = ReservationCreateOut(
        ok=True,
        message=message,
        reservation_id=res_id,
        google_event_id=None,
        sync_status=sync_status,
        sync_job_id=sync_job_id,
    )
    logger.info("Reservation created: id=%s calendar=%s start=%s end=%s", res_id, cal_id, start.isoformat(), end.isoformat())
    return payload_out

class AdminSqlRequest(BaseModel):
    statement: str = Field(..., min_length=1, max_length=10_000)
    params: Dict[str, Any] | None = None


class AdminSqlResponse(BaseModel):
    statement: str
    rows: List[Dict[str, Any]] | None = None
    rowcount: int | None = None
    last_insert_rowid: int | None = None


class AdminSqlTablesOut(BaseModel):
    tables: List[str]


class AdminTableQueryOut(BaseModel):
    table: str
    rows: List[Dict[str, Any]]
    rowcount: int
    limit: int
    offset: int


def _list_database_tables(connection) -> List[str]:
    try:
        inspector = sa_inspect(connection)
        tables = inspector.get_table_names()
    except Exception:  # noqa: BLE001
        tables = []
    return sorted(tables)


@router.get("/admin/sql/tables", response_model=AdminSqlTablesOut)
def admin_sql_tables(_=Depends(require_api_key)):
    with engine.connect() as conn:
        tables = _list_database_tables(conn)
    return AdminSqlTablesOut(tables=tables)


@router.get("/admin/sql/tables/{table_name}", response_model=AdminTableQueryOut)
def admin_sql_table_dump(
    table_name: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    _=Depends(require_api_key),
):
    with engine.connect() as conn:
        tables = _list_database_tables(conn)
        if table_name not in tables:
            raise HTTPException(status_code=404, detail=f"La tabla '{table_name}' no existe")
        safe_table = table_name.replace('"', '""')
        stmt = _sql_text(f'SELECT * FROM "{safe_table}" LIMIT :limit OFFSET :offset')
        rows = conn.execute(stmt, {"limit": limit, "offset": offset}).fetchall()
    data = [dict(row._mapping) for row in rows]
    return AdminTableQueryOut(table=table_name, rows=data, rowcount=len(data), limit=limit, offset=offset)


@router.post("/admin/sql", response_model=AdminSqlResponse)
def admin_sql_execute(
    payload: AdminSqlRequest,
    _=Depends(require_api_key),
):
    statement = payload.statement.strip()
    if not statement:
        raise HTTPException(status_code=400, detail="La sentencia SQL no puede estar vacía")
    params = payload.params or {}
    if not isinstance(params, dict):
        raise HTTPException(status_code=400, detail="`params` debe ser un objeto con parámetros nombrados")

    try:
        with engine.begin() as conn:
            result = conn.execute(_sql_text(statement), params)
            if result.returns_rows:
                rows = [dict(row._mapping) for row in result.fetchall()]
                return AdminSqlResponse(statement=statement, rows=rows, rowcount=len(rows))

            rowcount = result.rowcount if result.rowcount is not None else 0
            last_insert_rowid: Optional[int] = None
            try:
                last_insert_rowid = conn.exec_driver_sql("SELECT last_insert_rowid()").scalar()  # type: ignore[attr-defined]
            except Exception:
                last_insert_rowid = None
            return AdminSqlResponse(statement=statement, rowcount=rowcount, last_insert_rowid=last_insert_rowid)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error ejecutando SQL administrativo")
        raise HTTPException(status_code=400, detail=f"Error al ejecutar la sentencia: {exc}") from exc


class AdminSyncIn(BaseModel):
    mode: str | None = None
    start: str | None = None
    end: str | None = None
    days: int | None = None
    by_professional: bool | None = True
    calendar_id: str | None = None
    professional_id: str | None = None
    default_service: str | None = None


@router.get("/admin/calendar-jobs", response_model=CalendarJobListOut)
def admin_calendar_jobs(
    status: Optional[str] = Query(default=None, description="Filtra por estado: pending, processing, completed, failed"),
    reservation_id: Optional[str] = Query(default=None, description="Filtra por id de reserva"),
    limit: int = Query(default=100, ge=1, le=500, description="Número máximo de trabajos a devolver"),
    session: Session = Depends(get_session),
    _=Depends(require_api_key),
):
    stmt = (
        select(CalendarSyncJobDB)
        .order_by(CalendarSyncJobDB.id.desc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(CalendarSyncJobDB.status == status)
    if reservation_id:
        stmt = stmt.where(CalendarSyncJobDB.reservation_id == reservation_id)
    rows = session.exec(stmt).all()
    counts_raw = session.exec(
        select(CalendarSyncJobDB.status, func.count())
        .group_by(CalendarSyncJobDB.status)
    ).all()
    counts = {str(state): int(total) for state, total in counts_raw}
    jobs = [
        CalendarJobOut(
            id=row.id,
            reservation_id=row.reservation_id,
            action=row.action,
            status=row.status,
            attempts=row.attempts,
            available_at=row.available_at,
            locked_by=row.locked_by,
            locked_at=row.locked_at,
            heartbeat_at=row.heartbeat_at,
            last_error=row.last_error,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    refresh_queue_metrics()
    return CalendarJobListOut(jobs=jobs, counts=counts)


@router.post("/admin/calendar-jobs/{job_id}/retry", response_model=ActionResult)
def admin_calendar_job_retry(
    job_id: int,
    payload: CalendarJobRetryIn | None = Body(default=None),
    session: Session = Depends(get_session),
    _=Depends(require_api_key),
):
    job = session.get(CalendarSyncJobDB, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    delay_seconds = 0
    if payload and payload.delay_seconds is not None:
        delay_seconds = max(0, int(payload.delay_seconds))
    now_utc = datetime.now(timezone.utc)
    job.status = "pending"
    job.locked_by = None
    job.locked_at = None
    job.heartbeat_at = None
    job.updated_at = now_utc
    job.available_at = now_utc + timedelta(seconds=delay_seconds)
    session.add(job)
    session.commit()
    reservation = session.get(ReservationDB, job.reservation_id)
    if reservation:
        reservation.sync_status = "queued"
        reservation.sync_job_id = job.id
        reservation.sync_last_error = None
        reservation.sync_updated_at = now_utc
        session.add(reservation)
        session.commit()
    refresh_queue_metrics()
    if delay_seconds:
        return ActionResult(
            ok=True,
            message=f"Trabajo {job_id} reencolado. Disponible en {delay_seconds} segundos.",
        )
    return ActionResult(ok=True, message=f"Trabajo {job_id} reencolado y listo para ejecutar.")


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
            default_service=body.default_service or "corte_cabello",
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
    body = body or AdminClearCalendarsIn()
    if not (body.dry_run or (body.confirm and body.confirm.upper() == "DELETE")):
        return {"ok": False, "error": "Confirmación requerida: confirm='DELETE' o dry_run=true"}
    cals: list[str] = []
    if body.calendar_ids:
        cals.extend([c for c in body.calendar_ids if c])
    if body.calendar_id:
        cals.append(body.calendar_id)
    if body.by_professional or not cals:
        cals.extend([v for v in get_professional_calendars().values() if v])
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
    body = body or AdminCleanupOrphansIn()
    if not (body.dry_run or (body.confirm and body.confirm.upper() == "DELETE")):
        return {"ok": False, "error": "Confirmación requerida: confirm='DELETE' o dry_run=true"}
    cals: list[str] = []
    if body.calendar_ids:
        cals.extend([c for c in body.calendar_ids if c])
    if body.calendar_id:
        cals.append(body.calendar_id)
    if body.by_professional or not cals:
        cals.extend([v for v in get_professional_calendars().values() if v])
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
