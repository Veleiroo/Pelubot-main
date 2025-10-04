"""Endpoints de autenticación y sesión para el portal de estilistas."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status, Body
from sqlalchemy import or_, text as _sql_text
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
    RescheduleIn,
    RescheduleOut,
    StylistRescheduleIn,
    StylistOverviewOut,
    StylistOverviewAppointment,
    StylistOverviewSummary,
)
from app.services.logic import find_reservation, cancel_reservation, apply_reschedule
from app.utils.date import now_tz, TZ, validate_target_dt
from app.utils.security import needs_rehash, verify_password, hash_password
from app.core.metrics import RESERVATIONS_CANCELLED, RESERVATIONS_RESCHEDULED
from app.data import SERVICE_BY_ID

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
    reservations = [
        StylistReservationOut(
            id=row.id,
            service_id=row.service_id,
            professional_id=row.professional_id,
            start=row.start,
            end=row.end,
            customer_name=row.customer_name,
            customer_email=row.customer_email,
            customer_phone=row.customer_phone,
            notes=row.notes,
            created_at=row.created_at,
            updated_at=getattr(row, "updated_at", None),
        )
        for row in rows
    ]
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

    def _to_local(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            try:
                return dt.replace(tzinfo=TZ)
            except Exception:
                return dt
        return dt.astimezone(TZ)

    appointments: list[StylistOverviewAppointment] = []
    counts = {"confirmada": 0, "pendiente": 0, "cancelada": 0}
    upcoming: StylistOverviewAppointment | None = None

    for row in rows:
        start_local = _to_local(row.start)
        if start_local is None:
            continue
        end_local = _to_local(row.end)
        status = "confirmada" if start_local <= now else "pendiente"
        counts[status] += 1
        service = SERVICE_BY_ID.get(row.service_id)
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
        )
        appointments.append(appointment)
        if status != "cancelada" and start_local >= now:
            if upcoming is None or start_local < upcoming.start:
                upcoming = appointment

    summary = StylistOverviewSummary(
        total=len(appointments),
        confirmadas=counts["confirmada"],
        pendientes=counts["pendiente"],
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
    return ActionResult(ok=True, message=f"Reserva {reservation_id} cancelada.")


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

    if updated.google_event_id:
        updated.google_event_id = None
        updated.google_calendar_id = None
        session.add(updated)
        session.commit()
        session.refresh(updated)
        msg = f"{msg} Sincronización con Google Calendar deshabilitada para reprogramaciones."

    try:
        RESERVATIONS_RESCHEDULED.inc()
    except Exception:
        pass

    message_out = msg if isinstance(msg, str) else "Reserva reprogramada"
    return RescheduleOut(
        ok=True,
        message=message_out,
        reservation_id=updated.id,
        start=updated.start.isoformat() if hasattr(updated.start, "isoformat") else None,
        end=updated.end.isoformat() if hasattr(updated.end, "isoformat") else None,
    )
