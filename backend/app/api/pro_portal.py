"""Endpoints de autenticación y sesión para el portal de estilistas."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status, Body
from sqlalchemy import or_, text as _sql_text
from sqlalchemy.exc import InvalidRequestError
from sqlmodel import Session, select

from app.core.auth import (
    clear_stylist_session_cookie,
    create_stylist_session_token,
    get_current_stylist,
    set_stylist_session_cookie,
)
from app.db import get_session, engine
from app.models import (
    ActionResult,
    StylistAuthOut,
    StylistDB,
    StylistLoginIn,
    StylistPublic,
    StylistReservationsOut,
    StylistReservationOut,
    ReservationDB,
    ReservationIn,
    ReservationCreateOut,
    RescheduleIn,
    RescheduleOut,
    StylistRescheduleIn,
    StylistOverviewOut,
    StylistOverviewAppointment,
    StylistOverviewSummary,
    StylistStatsOut,
    StylistStatsSummary,
    StylistStatsTrendPoint,
    StylistStatsServicePerformance,
    StylistStatsRetentionBucket,
    StylistStatsInsight,
    ReservationSyncStatusOut,
)
from app.services.logic import (
    find_reservation,
    cancel_reservation,
    apply_reschedule,
    get_calendar_for_professional,
)
from app.services.calendar_queue import CalendarSyncAction, try_enqueue_calendar_job


from app.utils.date import now_tz, TZ, validate_target_dt
from app.utils.security import needs_rehash, verify_password, hash_password
from app.core.metrics import RESERVATIONS_CANCELLED, RESERVATIONS_RESCHEDULED, RESERVATIONS_CREATED
from app.data import get_service_by_id

logger = logging.getLogger("pelubot.api.pro_portal")
router = APIRouter(prefix="/pros", tags=["pros"])


def _to_public(stylist: StylistDB) -> StylistPublic:
    return StylistPublic(
        id=stylist.id,
        name=stylist.name,
        display_name=stylist.display_name,
        services=stylist.services or [],
        email=stylist.email,
        phone=stylist.phone,
        calendar_id=stylist.calendar_id,
        use_gcal_busy=bool(stylist.use_gcal_busy),
    )


def _to_local(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        try:
            return dt.replace(tzinfo=TZ)
        except Exception:
            return dt
    return dt.astimezone(TZ)


def _month_start(dt: datetime) -> datetime:
    localized = _to_local(dt) or now_tz()
    return localized.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    return dt.replace(year=year, month=month, day=1)


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        if current == 0:
            return 0.0
        return 100.0 if current > 0 else -100.0
    try:
        return ((current - previous) / previous) * 100
    except Exception:
        return 0.0


def _service_price(service_id: str | None) -> float:
    if not service_id:
        return 0.0
    try:
        service = get_service_by_id(service_id)
    except KeyError:
        return 0.0
    if not service:
        return 0.0
    try:
        return float(service.price_eur)
    except Exception:
        return 0.0


def _build_create_message(res_id: str, customer_name: str, service_name: str, start: datetime, queued: bool) -> str:
    base = f"Reserva {res_id} creada. Cliente: {customer_name}, {service_name} el {start.strftime('%d/%m/%Y %H:%M')}"
    if queued:
        return f"{base}. Sincronización con Google Calendar encolada."
    return f"{base}. No se pudo encolar la sincronización con Google Calendar; revisa el estado más tarde."


@router.post("/login", response_model=StylistAuthOut)
def stylist_login(
    payload: StylistLoginIn,
    response: Response,
    session: Session = Depends(get_session),
) -> StylistAuthOut:
    identifier = payload.identifier.strip()
    identifier_lower = identifier.lower()
    stmt = select(StylistDB).where(
        or_(
            StylistDB.id == identifier,
            StylistDB.id == identifier_lower,
            StylistDB.email == identifier,
            StylistDB.email == identifier_lower,
        )
    )
    stylist = session.exec(stmt).first()
    if not stylist or not stylist.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not verify_password(payload.password, stylist.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if needs_rehash(stylist.password_hash):
        stylist.password_hash = hash_password(payload.password)

    stylist.last_login_at = datetime.now(timezone.utc)
    session.add(stylist)
    session.commit()
    session.refresh(stylist)

    token, expires_at = create_stylist_session_token(stylist.id)
    set_stylist_session_cookie(response, token, expires_at)

    return StylistAuthOut(
        stylist=_to_public(stylist),
        session_expires_at=expires_at,
    )


@router.post("/logout", response_model=ActionResult)
def stylist_logout(response: Response) -> ActionResult:
    clear_stylist_session_cookie(response)
    return ActionResult(ok=True, message="Sesión cerrada")


@router.get("/me", response_model=StylistAuthOut)
def stylist_me(
    response: Response,
    stylist: StylistDB = Depends(get_current_stylist),
) -> StylistAuthOut:
    # Renovamos el token para extender la sesión de forma silenciosa
    token, expires_at = create_stylist_session_token(stylist.id)
    set_stylist_session_cookie(response, token, expires_at)
    return StylistAuthOut(stylist=_to_public(stylist), session_expires_at=expires_at)


@router.get("/reservations", response_model=StylistReservationsOut)
def stylist_reservations(
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
    days_ahead: int = 30,
    include_past_minutes: int = 0,
) -> StylistReservationsOut:
    days_ahead = max(1, min(days_ahead, 180))
    include_past_minutes = max(0, min(include_past_minutes, 1440))
    now = now_tz()
    start_boundary = now - timedelta(minutes=include_past_minutes)
    end_boundary = now + timedelta(days=days_ahead)

    stmt = (
        select(ReservationDB)
        .where(ReservationDB.professional_id == stylist.id)
        .where(ReservationDB.start <= end_boundary)
        .where(ReservationDB.end >= start_boundary)
        .order_by(ReservationDB.start)
    )
    rows = session.exec(stmt).all()
    reservations: list[StylistReservationOut] = []
    for row in rows:
        try:
            service = get_service_by_id(row.service_id)
        except KeyError:
            service = None
        start_local = _to_local(getattr(row, "start", None))
        end_local = _to_local(getattr(row, "end", None))
        created_local = _to_local(getattr(row, "created_at", None))
        updated_local = _to_local(getattr(row, "updated_at", None))
        reservations.append(
            StylistReservationOut(
                id=row.id,
                service_id=row.service_id,
                service_name=service.name if service else row.service_id,
                professional_id=row.professional_id,
                start=start_local or row.start,
                end=end_local or row.end,
                status=getattr(row, "status", "confirmada"),
                customer_name=row.customer_name,
                customer_email=row.customer_email,
                customer_phone=row.customer_phone,
                notes=row.notes,
                created_at=created_local or getattr(row, "created_at", None),
                updated_at=updated_local or getattr(row, "updated_at", None),
            )
        )
    return StylistReservationsOut(reservations=reservations)


@router.get("/overview", response_model=StylistOverviewOut)
def stylist_overview(
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> StylistOverviewOut:
    now = now_tz()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    rows = (
        session.exec(
            select(ReservationDB)
            .where(ReservationDB.professional_id == stylist.id)
            .where(ReservationDB.start >= start_of_day)
            .where(ReservationDB.start < end_of_day)
            .order_by(ReservationDB.start)
        ).all()
        if session is not None
        else []
    )

    appointments: list[StylistOverviewAppointment] = []
    counts = {"confirmada": 0, "asistida": 0, "no_asistida": 0, "cancelada": 0}
    upcoming: StylistOverviewAppointment | None = None

    last_visits: dict[str, date] = {}
    if session is not None:
        customer_names = {
            getattr(row, "customer_name", None)
            for row in rows
            if getattr(row, "customer_name", None)
        }
        if customer_names:
            try:
                stmt_last = (
                    select(ReservationDB)
                    .where(ReservationDB.professional_id == stylist.id)
                    .where(ReservationDB.start < start_of_day)
                    .where(ReservationDB.customer_name.in_(customer_names))
                    .order_by(ReservationDB.customer_name, ReservationDB.start.desc())
                )
                previous_reservations = session.exec(stmt_last).all()
            except Exception:
                previous_reservations = []

            for previous in previous_reservations:
                name = getattr(previous, "customer_name", None)
                if not name or name in last_visits:
                    continue
                last_start_local = _to_local(previous.start)
                if last_start_local is None:
                    continue
                last_visits[name] = last_start_local.date()

    for row in rows:
        start_local = _to_local(row.start)
        if start_local is None:
            continue
        end_local = _to_local(row.end)
        # Usar el status de la DB directamente
        status = getattr(row, "status", "confirmada")
        counts[status] = counts.get(status, 0) + 1
        try:
            service = get_service_by_id(row.service_id)
        except KeyError:
            service = None
        appointment = StylistOverviewAppointment(
            id=row.id,
            start=start_local,
            end=end_local,
            service_id=row.service_id,
            service_name=service.name if service else row.service_id,
            status=status,
            client_name=getattr(row, "customer_name", None),
            client_email=getattr(row, "customer_email", None),
            client_phone=getattr(row, "customer_phone", None),
            notes=getattr(row, "notes", None),
            last_visit=last_visits.get(getattr(row, "customer_name", None)),
        )
        appointments.append(appointment)
        if status != "cancelada" and start_local >= now:
            if upcoming is None or start_local < upcoming.start:
                upcoming = appointment

    summary = StylistOverviewSummary(
        total=len(appointments),
        confirmadas=counts["confirmada"],
        asistidas=counts["asistida"],
        no_asistidas=counts["no_asistida"],
        canceladas=counts["cancelada"],
    )

    tz_label = getattr(TZ, "key", None) or TZ.tzname(now) or "UTC"

    return StylistOverviewOut(
        date=start_of_day.date(),
        timezone=str(tz_label),
        summary=summary,
        upcoming=upcoming,
        appointments=appointments,
    )


@router.get("/stats", response_model=StylistStatsOut)
def stylist_stats(
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> StylistStatsOut:
    now = now_tz()
    current_month_start = _month_start(now)
    previous_month_start = _add_months(current_month_start, -1)
    next_month_start = _add_months(current_month_start, 1)
    series_months = [_add_months(current_month_start, offset) for offset in range(-5, 1)]
    series_start = series_months[0]

    reservations_raw = (
        session.exec(
            select(ReservationDB)
            .where(ReservationDB.professional_id == stylist.id)
            .order_by(ReservationDB.start)
        ).all()
        if session is not None
        else []
    )

    reservations_local: list[tuple[ReservationDB, datetime, float]] = []
    client_first_visit: dict[str, datetime] = {}
    client_last_visit: dict[str, datetime] = {}

    for row in reservations_raw:
        start_local = _to_local(getattr(row, "start", None))
        if start_local is None:
            continue
        price = _service_price(getattr(row, "service_id", None))
        reservations_local.append((row, start_local, price))

        customer_name = getattr(row, "customer_name", None)
        if customer_name:
            recorded_first = client_first_visit.get(customer_name)
            if recorded_first is None or start_local < recorded_first:
                client_first_visit[customer_name] = start_local
            recorded_last = client_last_visit.get(customer_name)
            if recorded_last is None or start_local > recorded_last:
                client_last_visit[customer_name] = start_local

    def _filter_period(start: datetime, end: datetime) -> list[tuple[ReservationDB, datetime, float]]:
        return [item for item in reservations_local if start <= item[1] < end]

    current_rows = _filter_period(current_month_start, next_month_start)
    previous_rows = _filter_period(previous_month_start, current_month_start)

    revenue_current = sum(price for _, _, price in current_rows)
    revenue_previous = sum(price for _, _, price in previous_rows)

    avg_ticket_current = revenue_current / len(current_rows) if current_rows else 0.0
    avg_ticket_previous = revenue_previous / len(previous_rows) if previous_rows else 0.0

    def _clients_for(rows: list[tuple[ReservationDB, datetime, float]]) -> set[str]:
        clients: set[str] = set()
        for reservation, _, _ in rows:
            name = getattr(reservation, "customer_name", None)
            if name:
                clients.add(name)
        return clients

    current_clients = _clients_for(current_rows)
    previous_clients = _clients_for(previous_rows)

    repeat_current = {
        name
        for name in current_clients
        if client_first_visit.get(name) and client_first_visit[name] < current_month_start
    }
    repeat_previous = {
        name
        for name in previous_clients
        if client_first_visit.get(name) and client_first_visit[name] < previous_month_start
    }

    repeat_rate_current = (len(repeat_current) / len(current_clients) * 100) if current_clients else 0.0
    repeat_rate_previous = (len(repeat_previous) / len(previous_clients) * 100) if previous_clients else 0.0

    new_clients_current = {
        name
        for name in current_clients
        if client_first_visit.get(name) and client_first_visit[name] >= current_month_start
    }
    new_clients_previous = {
        name
        for name in previous_clients
        if client_first_visit.get(name)
        and previous_month_start <= client_first_visit[name] < current_month_start
    }

    summary = StylistStatsSummary(
        total_revenue_eur=round(revenue_current, 2),
        revenue_change_pct=round(_pct_change(revenue_current, revenue_previous), 2),
        avg_ticket_eur=round(avg_ticket_current, 2),
        avg_ticket_change_pct=round(_pct_change(avg_ticket_current, avg_ticket_previous), 2),
        repeat_rate_pct=round(repeat_rate_current, 2),
        repeat_rate_change_pct=round(repeat_rate_current - repeat_rate_previous, 2),
        new_clients=len(new_clients_current),
        new_clients_change_pct=round(_pct_change(len(new_clients_current), len(new_clients_previous)), 2),
    )

    # Revenue series (last 6 months including current)
    monthly_revenue: dict[str, float] = {f"{month.year}-{month.month:02d}": 0.0 for month in series_months}
    monthly_appointments: dict[str, int] = {f"{month.year}-{month.month:02d}": 0 for month in series_months}

    for _, start_local, price in reservations_local:
        if start_local < series_start or start_local >= next_month_start:
            continue
        key = f"{start_local.year}-{start_local.month:02d}"
        if key in monthly_revenue:
            monthly_revenue[key] += price
            monthly_appointments[key] += 1

    revenue_series = []
    for month in series_months:
        key = f"{month.year}-{month.month:02d}"
        label = month.strftime("%b").capitalize()
        revenue_series.append(
            StylistStatsTrendPoint(
                period=key,
                label=label,
                revenue_eur=round(monthly_revenue.get(key, 0.0), 2),
                appointments=monthly_appointments.get(key, 0),
            )
        )

    # Services performance
    service_current: dict[str, dict[str, float | int | str]] = {}
    service_previous: dict[str, dict[str, float | int | str]] = {}

    def _register_service(
        container: dict[str, dict[str, float | int | str]],
        reservation: ReservationDB,
        price: float,
    ) -> None:
        service_id = getattr(reservation, "service_id", None) or "otros"
        try:
            service = get_service_by_id(service_id)
        except KeyError:
            service = None
        bucket = container.setdefault(
            service_id,
            {
                "service_name": service.name if service else service_id,
                "total_revenue_eur": 0.0,
                "total_appointments": 0,
            },
        )
        bucket["total_revenue_eur"] = float(bucket["total_revenue_eur"]) + price
        bucket["total_appointments"] = int(bucket["total_appointments"]) + 1

    for reservation, _, price in current_rows:
        _register_service(service_current, reservation, price)
    for reservation, _, price in previous_rows:
        _register_service(service_previous, reservation, price)

    top_services = []
    for service_id, payload in service_current.items():
        revenue_value = float(payload["total_revenue_eur"])
        prev_revenue = float(service_previous.get(service_id, {}).get("total_revenue_eur", 0.0))
        top_services.append(
            StylistStatsServicePerformance(
                service_id=service_id,
                service_name=str(payload["service_name"]),
                total_appointments=int(payload["total_appointments"]),
                total_revenue_eur=round(revenue_value, 2),
                growth_pct=round(_pct_change(revenue_value, prev_revenue), 2),
            )
        )

    top_services.sort(key=lambda item: item.total_revenue_eur, reverse=True)
    top_services = top_services[:5]

    # Retention buckets
    segments_meta = {
        "active-30": {
            "label": "Activas (<30 días)",
            "description": "Clientas que han vuelto en las últimas 4 semanas.",
        },
        "risk-90": {
            "label": "En seguimiento (30-90 días)",
            "description": "Planifica recordatorios o beneficios ligeros.",
        },
        "recover-90+": {
            "label": "Recuperar (>90 días)",
            "description": "Considera acciones de reactivación específicas.",
        },
    }

    def _segment_counts(reference: datetime) -> dict[str, int]:
        counts = {key: 0 for key in segments_meta.keys()}
        for last_visit in client_last_visit.values():
            delta_days = (reference - last_visit).days if reference >= last_visit else 0
            if delta_days <= 30:
                counts["active-30"] += 1
            elif delta_days <= 90:
                counts["risk-90"] += 1
            else:
                counts["recover-90+"] += 1
        return counts

    counts_current = _segment_counts(now)
    counts_previous = _segment_counts(current_month_start - timedelta(days=1))
    total_clients = sum(counts_current.values()) or 1

    retention = []
    for segment_id, meta in segments_meta.items():
        current_count = counts_current.get(segment_id, 0)
        previous_count = counts_previous.get(segment_id, 0)
        if current_count > previous_count:
            trend = "up"
        elif current_count < previous_count:
            trend = "down"
        else:
            trend = "steady"
        retention.append(
            StylistStatsRetentionBucket(
                id=segment_id,
                label=meta["label"],
                count=current_count,
                share_pct=round((current_count / total_clients) * 100, 1),
                trend=trend,
                description=meta["description"],
            )
        )

    # Insights
    insights: list[StylistStatsInsight] = []
    if summary.revenue_change_pct < 0:
        insights.append(
            StylistStatsInsight(
                id="revenue-decline",
                title="Revisa promociones para recuperar ingresos",
                description="Los ingresos han caído frente al mes anterior. Considera un paquete especial o recordar reservas recurrentes.",
                priority="high",
            )
        )
    if summary.new_clients_change_pct < 0:
        insights.append(
            StylistStatsInsight(
                id="new-clients",
                title="Activa campañas de captación",
                description="Llegan menos clientas nuevas que el mes pasado. Comparte contenido en redes o impulsa recomendaciones.",
                priority="medium",
            )
        )
    if summary.repeat_rate_pct < 55:
        insights.append(
            StylistStatsInsight(
                id="repeat-rate",
                title="Lanza beneficios de fidelización",
                description="La repetición está por debajo del objetivo. Un programa de puntos o recordatorios personalizados puede ayudar.",
                priority="medium",
            )
        )
    if not insights:
        insights.append(
            StylistStatsInsight(
                id="healthy-trend",
                title="¡Buen ritmo!",
                description="Tus métricas crecen de forma saludable. Mantén la comunicación con clientas y evalúa subir precios gradualmente.",
                priority="low",
            )
        )

    return StylistStatsOut(
        generated_at=now,
        summary=summary,
        revenue_series=revenue_series,
        top_services=top_services,
        retention=retention,
        insights=insights,
    )


@router.post("/reservations", response_model=ReservationCreateOut)
def stylist_create_reservation(
    payload: ReservationIn,
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ReservationCreateOut:
    """Permite a un profesional crear una reserva directamente desde su portal."""
    
    # Verificar que el profesional está creando la cita para sí mismo
    if payload.professional_id != stylist.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes crear citas para ti mismo"
        )
    
    # Verificar que el servicio existe
    try:
        service = get_service_by_id(payload.service_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    
    # Verificar que el profesional ofrece ese servicio
    if payload.service_id not in (stylist.services or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No ofreces este servicio"
        )
    
    # Validar la fecha/hora
    start = payload.start
    if start.tzinfo is None:
        start = start.replace(tzinfo=TZ)
    
    try:
        validate_target_dt(start)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    end = start + timedelta(minutes=service.duration_min)
    customer_name = payload.customer_name.strip()
    customer_phone = payload.customer_phone.strip()
    customer_email = str(payload.customer_email).strip() if payload.customer_email else None
    notes = payload.notes.strip() if payload.notes else None
    
    if not customer_phone:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Se requiere un teléfono de contacto")
    
    res_id = str(uuid.uuid4())
    cal_id = get_calendar_for_professional(stylist.id)

    # Bloquear la tabla para evitar condiciones de carrera en SQLite
    try:
        if str(engine.url).startswith("sqlite"):
            try:
                session.exec(_sql_text("BEGIN IMMEDIATE"))
            except Exception:
                pass
        
        # Verificar que no haya overlaps
        q = select(ReservationDB).where(
            ReservationDB.professional_id == stylist.id,
            ReservationDB.start < end,
            ReservationDB.end > start,
            ReservationDB.status != "cancelada",
        )
        if session.exec(q).first():
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya tienes una cita en esa hora."
            )
        
        row = ReservationDB(
            id=res_id,
            service_id=payload.service_id,
            professional_id=stylist.id,
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
        logger.exception("Error creando reserva desde portal pro")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo guardar la reserva: {e}"
        )
    sync_status, sync_job_id = try_enqueue_calendar_job(
        session,
        reservation_id=res_id,
        action=CalendarSyncAction.CREATE,
        payload={"calendar_id": cal_id} if cal_id else None,
    )

    sync_error = None
    if sync_status != "queued":
        sync_error = "No se pudo encolar la sincronización en Google Calendar."
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

    message = f"Reserva {res_id} creada. Cliente: {customer_name}, {service.name} el {start.strftime('%d/%m/%Y %H:%M')}."
    if sync_status == "queued":
        suffix = " Sincronización con Google Calendar encolada."
        if sync_job_id is not None:
            suffix = f"{suffix[:-1]} (job {sync_job_id})."
        message = f"{message}{suffix}"
    else:
        message = f"{message} No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."

    return ReservationCreateOut(
        ok=True,
        reservation_id=res_id,
        message=message,
        google_event_id=None,
        sync_status=sync_status,
        sync_job_id=sync_job_id,
    )


@router.post("/reservations/{reservation_id}/cancel", response_model=ActionResult)
def stylist_cancel_reservation(
    reservation_id: str,
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ActionResult:
    reservation = find_reservation(session, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")

    ok = cancel_reservation(session, reservation_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo cancelar la reserva")
    try:
        RESERVATIONS_CANCELLED.inc()
    except Exception:
        pass

    payload = {"drop_calendar": False}
    if getattr(reservation, "google_event_id", None):
        payload["event_id"] = reservation.google_event_id
    if getattr(reservation, "google_calendar_id", None):
        payload["calendar_id"] = reservation.google_calendar_id
    sync_status, sync_job_id = try_enqueue_calendar_job(
        session,
        reservation_id=reservation_id,
        action=CalendarSyncAction.DELETE,
        payload=payload,
    )

    base_message = f"Reserva {reservation_id} cancelada."
    if sync_status == "queued":
        extra = " Sincronización con Google Calendar encolada."
        if sync_job_id is not None:
            extra = f"{extra[:-1]} (job {sync_job_id})."
    else:
        extra = " No se pudo encolar la sincronización con Google Calendar; revísalo manualmente."

    sync_error = None if sync_status == "queued" else extra.strip()
    try:
        session.refresh(reservation)
    except Exception:
        pass
    try:
        reservation.sync_status = sync_status
        reservation.sync_job_id = sync_job_id
        reservation.sync_last_error = sync_error
        reservation.sync_updated_at = datetime.now(timezone.utc)
        session.add(reservation)
        session.commit()
    except Exception:
        session.rollback()
    return ActionResult(ok=True, message=f"{base_message}{extra}")


@router.post("/reservations/{reservation_id}/reschedule", response_model=RescheduleOut)
def stylist_reschedule_reservation(
    reservation_id: str,
    payload: StylistRescheduleIn = Body(...),
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> RescheduleOut:
    reservation = find_reservation(session, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")

    try:
        if str(engine.url).startswith("sqlite"):
            try:
                session.exec(_sql_text("BEGIN IMMEDIATE"))
            except Exception:
                pass
    except Exception:
        pass

    if payload.new_start:
        try:
            new_start_dt = datetime.fromisoformat(str(payload.new_start).replace("Z", "+00:00"))
            if new_start_dt.tzinfo is None:
                new_start_dt = new_start_dt.replace(tzinfo=TZ)
            validate_target_dt(new_start_dt)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_start inválido (ISO 8601 requerido).")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    else:
        base_start = reservation.start
        if base_start.tzinfo is None:
            base_start = base_start.replace(tzinfo=TZ)
        try:
            if payload.new_date:
                target_date = datetime.strptime(payload.new_date, "%Y-%m-%d").date()
            else:
                target_date = base_start.astimezone(TZ).date()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_date inválida. Usa YYYY-MM-DD.")
        try:
            if payload.new_time:
                target_time = datetime.strptime(payload.new_time, "%H:%M").time()
            else:
                target_time = base_start.astimezone(TZ).time()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_time inválida. Usa HH:MM (24h).")
        new_start_dt = datetime.combine(target_date, target_time).replace(tzinfo=TZ)
        try:
            validate_target_dt(new_start_dt)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    reschedule_payload = RescheduleIn(
        reservation_id=reservation_id,
        new_date=payload.new_date,
        new_time=payload.new_time,
        new_start=payload.new_start,
        professional_id=stylist.id,
    )

    ok, msg, updated = apply_reschedule(session, reschedule_payload)
    if not ok or not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    calendar_id = getattr(updated, "google_calendar_id", None) or get_calendar_for_professional(updated.professional_id)
    sync_status = "skipped"
    sync_job_id: Optional[int] = None
    if updated.google_event_id and calendar_id:
        payload_sync = {"calendar_id": calendar_id, "event_id": updated.google_event_id}
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=updated.id,
            action=CalendarSyncAction.UPDATE,
            payload=payload_sync,
        )
    else:
        payload_sync = {"calendar_id": calendar_id} if calendar_id else None
        sync_status, sync_job_id = try_enqueue_calendar_job(
            session,
            reservation_id=updated.id,
            action=CalendarSyncAction.CREATE,
            payload=payload_sync,
        )
    try:
        session.refresh(updated)
    except InvalidRequestError:
        refreshed = session.get(ReservationDB, reservation_id)
        if refreshed is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La reserva ya no existe tras reprogramar")
        updated = refreshed

    try:
        RESERVATIONS_RESCHEDULED.inc()
    except Exception:
        pass

    message_out = msg if isinstance(msg, str) else "Reserva reprogramada"
    if sync_status == "queued":
        message_out = f"{message_out} Sincronización con Google Calendar encolada."
    elif sync_status == "skipped":
        message_out = f"{message_out} No se pudo encolar la actualización en Google Calendar; revísalo manualmente."

    sync_error = None if sync_status == "queued" else "No se pudo encolar la sincronización con Google Calendar; revísalo manualmente." if sync_status == "skipped" else None
    try:
        session.refresh(updated)
    except Exception:
        pass
    try:
        updated.sync_status = sync_status
        updated.sync_job_id = sync_job_id
        updated.sync_last_error = sync_error
        updated.sync_updated_at = datetime.now(timezone.utc)
        session.add(updated)
        session.commit()
    except Exception:
        session.rollback()
    return RescheduleOut(
        ok=True,
        message=message_out,
        reservation_id=updated.id,
        start=updated.start.isoformat() if hasattr(updated.start, "isoformat") else None,
        end=updated.end.isoformat() if hasattr(updated.end, "isoformat") else None,
        google_sync_status=sync_status,
        sync_job_id=sync_job_id,
    )


@router.post("/reservations/{reservation_id}/mark-attended", response_model=ActionResult)
def stylist_mark_attended(
    reservation_id: str,
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ActionResult:
    """Marca una reserva como asistida (el cliente vino y fue atendido)."""
    reservation = find_reservation(session, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
    
    # Sin restricciones: el profesional puede marcar cualquier cita como asistida
    # (incluso canceladas, por si hubo un error)
    reservation.status = "asistida"
    session.add(reservation)
    session.commit()
    
    return ActionResult(ok=True, message=f"Reserva {reservation_id} marcada como asistida.")


@router.post("/reservations/{reservation_id}/mark-no-show", response_model=ActionResult)
def stylist_mark_no_show(
    reservation_id: str,
    reason: str = Body(None, embed=True),
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ActionResult:
    """Marca una reserva como no asistida (el cliente no se presentó - no-show)."""
    reservation = find_reservation(session, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
    
    # Sin restricciones: el profesional decide cuándo marcar no-show
    reservation.status = "no_asistida"
    
    # Si se proporciona una razón, añadirla a las notas
    if reason:
        existing_notes = reservation.notes or ""
        timestamp = now_tz().strftime("%Y-%m-%d %H:%M")
        no_show_note = f"\n[{timestamp}] No-show: {reason.strip()}"
        reservation.notes = (existing_notes + no_show_note).strip()
    
    session.add(reservation)
    session.commit()

    message = f"Reserva {reservation_id} marcada como no asistida."
    if reason:
        message += f" Motivo registrado: {reason}"

    return ActionResult(ok=True, message=message)


@router.get("/reservations/{reservation_id}/sync", response_model=ReservationSyncStatusOut)
def stylist_reservation_sync_status(
    reservation_id: str,
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ReservationSyncStatusOut:
    reservation = session.get(ReservationDB, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
    return ReservationSyncStatusOut(
        reservation_id=reservation.id,
        sync_status=reservation.sync_status,
        sync_job_id=reservation.sync_job_id,
        sync_last_error=reservation.sync_last_error,
        sync_updated_at=reservation.sync_updated_at,
    )


@router.delete("/reservations/{reservation_id}", response_model=ActionResult)
def stylist_delete_reservation(
    reservation_id: str,
    stylist: StylistDB = Depends(get_current_stylist),
    session: Session = Depends(get_session),
) -> ActionResult:
    """Elimina definitivamente una reserva del portal profesional."""
    reservation = find_reservation(session, reservation_id)
    if not reservation or reservation.professional_id != stylist.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")

    gcal_event_id = getattr(reservation, "google_event_id", None)
    gcal_calendar_id = getattr(reservation, "google_calendar_id", None)

    sync_note = None
    if gcal_event_id and gcal_calendar_id:
        try:
            sync_status, job_id = try_enqueue_calendar_job(
                session,
                reservation_id=reservation_id,
                action=CalendarSyncAction.DELETE,
                payload={
                    "event_id": gcal_event_id,
                    "calendar_id": gcal_calendar_id,
                    "drop_calendar": True,
                },
            )
            if sync_status == "queued" and job_id is not None:
                sync_note = f" Se encoló la eliminación en Google Calendar (job {job_id})."
            else:
                sync_note = " No se pudo encolar la eliminación en Google Calendar; revísalo manualmente."
        except Exception as exc:
            session.rollback()
            logger.warning("No se pudo encolar la eliminación del evento de Google Calendar %s: %s", gcal_event_id, exc)
            sync_note = " No se pudo encolar la eliminación en Google Calendar; revísalo manualmente."

    try:
        session.delete(reservation)
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.exception("Error eliminando reserva %s", reservation_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo eliminar la reserva") from exc

    message = f"Reserva {reservation_id} eliminada definitivamente."
    if sync_note:
        message += sync_note
    return ActionResult(ok=True, message=message)
