from __future__ import annotations

import logging
from fastapi import BackgroundTasks
from sqlmodel import Session

from app.db import engine
from app.models import ReservationDB, Reservation
from app.services.logic import (
    create_gcal_reservation,
    patch_gcal_reservation,
    delete_gcal_reservation,
    get_calendar_for_professional,
)
from app.utils.date import TZ

logger = logging.getLogger("pelubot.integrations.gcal_background")


def queue_create_event(background: BackgroundTasks, reservation_id: str, engine_override=None) -> None:
    background.add_task(_create_event_task, reservation_id, engine_override)


def queue_patch_event(background: BackgroundTasks, reservation_id: str, engine_override=None) -> None:
    background.add_task(_patch_event_task, reservation_id, engine_override)


def queue_delete_event(background: BackgroundTasks, reservation_id: str, engine_override=None) -> None:
    background.add_task(_delete_event_task, reservation_id, engine_override)


def _to_reservation_model(row: ReservationDB) -> Reservation:
    return Reservation(
        id=row.id,
        service_id=row.service_id,
        professional_id=row.professional_id,
        start=row.start,
        end=row.end,
        status=row.status,
        google_event_id=row.google_event_id,
        google_calendar_id=row.google_calendar_id,
        customer_name=row.customer_name,
        customer_email=row.customer_email,
        customer_phone=row.customer_phone,
        notes=row.notes,
    )


def _resolved_engine(engine_override):
    if engine_override is not None:
        return engine_override
    return engine


def _create_event_task(reservation_id: str, engine_override=None) -> None:
    eng = _resolved_engine(engine_override)
    with Session(eng) as session:
        row = session.get(ReservationDB, reservation_id)
        if not row:
            logger.warning("GCal create skipped: reservation %s desaparecida", reservation_id)
            return
        calendar_id = row.google_calendar_id or get_calendar_for_professional(row.professional_id)
        if not calendar_id:
            logger.warning("GCal create skipped: sin calendario para %s", reservation_id)
            return
        try:
            event = create_gcal_reservation(
                _to_reservation_model(row),
                calendar_id=calendar_id,
                tz=getattr(TZ, "key", str(TZ)),
            )
        except Exception as exc:
            logger.warning("GCal create falló para %s: %s", reservation_id, exc)
            return
        row.google_event_id = event.get("id")
        row.google_calendar_id = calendar_id
        session.add(row)
        session.commit()
        logger.info("Evento GCal creado en background: reservation_id=%s event_id=%s", reservation_id, row.google_event_id)


def _patch_event_task(reservation_id: str, engine_override=None) -> None:
    eng = _resolved_engine(engine_override)
    with Session(eng) as session:
        row = session.get(ReservationDB, reservation_id)
        if not row:
            logger.warning("GCal patch skipped: reserva %s no encontrada", reservation_id)
            return
        if not row.google_event_id or not row.google_calendar_id:
            logger.info("GCal patch omitido: reserva %s sin evento asociado", reservation_id)
            return
        try:
            patch_gcal_reservation(
                row.google_event_id,
                row.start,
                row.end,
                row.google_calendar_id,
                tz=getattr(TZ, "key", str(TZ)),
            )
            logger.info("Evento GCal actualizado en background: reservation_id=%s", reservation_id)
        except Exception as exc:
            logger.warning("GCal patch falló para %s: %s", reservation_id, exc)


def _delete_event_task(reservation_id: str, engine_override=None) -> None:
    eng = _resolved_engine(engine_override)
    with Session(eng) as session:
        row = session.get(ReservationDB, reservation_id)
        if not row:
            logger.warning("GCal delete skipped: reserva %s no encontrada", reservation_id)
            return
        event_id = row.google_event_id
        calendar_id = row.google_calendar_id
        if event_id and calendar_id:
            try:
                delete_gcal_reservation(event_id, calendar_id)
                logger.info("Evento GCal eliminado en background: reservation_id=%s", reservation_id)
            except Exception as exc:
                logger.warning("GCal delete falló para %s: %s", reservation_id, exc)
                return
        row.google_event_id = None
        session.add(row)
        session.commit()
