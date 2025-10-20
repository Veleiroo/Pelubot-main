"""Cola interna para sincronizar reservas con Google Calendar."""
from __future__ import annotations

import logging
import os
import threading
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import CalendarSyncJobDB, Reservation, ReservationDB
from app.services.logic import (
    create_gcal_reservation,
    delete_gcal_reservation,
    patch_gcal_reservation,
)
from app.utils.date import TZ

logger = logging.getLogger("pelubot.calendar_queue")


class CalendarSyncAction(str, Enum):
    """Tipos de trabajo soportados para Google Calendar."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_payload(payload: Optional[dict]) -> dict:
    if not payload:
        return {}
    if isinstance(payload, dict):
        return payload
    return dict(payload)


def _reservation_from_row(row: ReservationDB) -> Reservation:
    """Convierte una fila SQLModel en el modelo pydantic utilizado por la integración."""

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


def enqueue_calendar_job(
    session: Session,
    *,
    reservation_id: str,
    action: CalendarSyncAction | str,
    payload: Optional[dict] = None,
    available_at: Optional[datetime] = None,
) -> CalendarSyncJobDB:
    """Inserta un trabajo en la cola local de sincronización."""

    job = CalendarSyncJobDB(
        reservation_id=reservation_id,
        action=(action.value if isinstance(action, CalendarSyncAction) else str(action)),
        payload=_ensure_payload(payload),
        available_at=available_at or _utcnow(),
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    logger.info(
        "Encolado trabajo GCal id=%s reservation=%s action=%s available_at=%s",
        job.id,
        reservation_id,
        job.action,
        job.available_at.isoformat(),
    )
    return job


class CalendarSyncWorker:
    """Hilo en segundo plano que procesa trabajos pendientes."""

    def __init__(self, poll_interval: float = 2.0, *, max_attempts: int = 5):
        self.poll_interval = poll_interval
        self.max_attempts = max_attempts
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._engine = engine

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, name="gcal-sync-worker", daemon=True)
        self._thread.start()
        logger.info("Worker de sincronización Google Calendar iniciado.")

    def stop(self, timeout: float = 5.0) -> None:
        if not self._thread:
            return
        self._stop_event.set()
        with suppress(Exception):
            self._thread.join(timeout=timeout)
        logger.info("Worker de sincronización Google Calendar detenido.")

    def _run_loop(self) -> None:
        backoff = self.poll_interval
        while not self._stop_event.is_set():
            try:
                processed = self._process_once()
            except Exception:
                logger.exception("Error procesando trabajos de Google Calendar")
                processed = False
            if processed:
                backoff = self.poll_interval
                continue
            # Nada que hacer; esperar con backoff simple para no saturar la CPU
            self._stop_event.wait(backoff)
            backoff = min(backoff * 2, 30)

    def _process_once(self) -> bool:
        now = _utcnow()
        job_id: Optional[int] = None
        reservation_id: Optional[str] = None
        action: Optional[str] = None
        payload: dict = {}
        attempts = 0

        with Session(self._engine) as session:
            stmt = (
                select(CalendarSyncJobDB)
                .where(
                    CalendarSyncJobDB.status == "pending",
                    CalendarSyncJobDB.available_at <= now,
                )
                .order_by(CalendarSyncJobDB.available_at, CalendarSyncJobDB.id)
                .limit(1)
            )
            job = session.exec(stmt).first()
            if not job:
                return False
            job.status = "processing"
            job.attempts += 1
            job.updated_at = _utcnow()
            session.add(job)
            session.commit()
            session.refresh(job)
            job_id = job.id
            reservation_id = job.reservation_id
            action = job.action
            payload = _ensure_payload(job.payload)
            attempts = job.attempts

        if not job_id or not reservation_id or not action:
            return False

        success = False
        error_message: Optional[str] = None
        try:
            success = self._execute_action(reservation_id, action, payload)
        except Exception as exc:  # noqa: BLE001 - registramos y reintentamos
            error_message = str(exc)
            logger.exception(
                "Fallo ejecutando trabajo GCal id=%s reservation=%s action=%s", job_id, reservation_id, action
            )
        else:
            error_message = None

        with Session(self._engine) as session:
            job = session.get(CalendarSyncJobDB, job_id)
            if not job:
                return True
            job.updated_at = _utcnow()
            if success:
                job.status = "completed"
                job.last_error = None
                job.completed_at = _utcnow()
            else:
                job.last_error = error_message
                if attempts >= self.max_attempts:
                    job.status = "failed"
                else:
                    job.status = "pending"
                    delay = int(os.getenv("GCAL_QUEUE_RETRY_SECONDS", "60"))
                    job.available_at = _utcnow() + timedelta(seconds=delay * attempts)
            session.add(job)
            session.commit()
        return True

    def _execute_action(self, reservation_id: str, action: str, payload: dict) -> bool:
        action_value = CalendarSyncAction(action)
        if action_value is CalendarSyncAction.CREATE:
            return self._handle_create(reservation_id, payload)
        if action_value is CalendarSyncAction.UPDATE:
            return self._handle_update(reservation_id, payload)
        if action_value is CalendarSyncAction.DELETE:
            return self._handle_delete(reservation_id, payload)
        raise ValueError(f"Acción de sincronización no soportada: {action}")

    def _handle_create(self, reservation_id: str, payload: dict) -> bool:
        with Session(self._engine) as session:
            reservation = session.get(ReservationDB, reservation_id)
            if reservation is None:
                logger.info("Reserva %s no existe. Marcamos trabajo como completado.", reservation_id)
                return True
            calendar_id = payload.get("calendar_id") or reservation.google_calendar_id
            if not calendar_id:
                logger.info("Reserva %s sin calendar_id, nada que sincronizar", reservation_id)
                return True
            res_model = _reservation_from_row(reservation)
            event = create_gcal_reservation(res_model, calendar_id=calendar_id)
            event_id = event.get("id") if isinstance(event, dict) else None
            reservation.google_event_id = event_id
            reservation.google_calendar_id = calendar_id
            session.add(reservation)
            session.commit()
            logger.info(
                "Reserva %s sincronizada en Google Calendar (evento %s)", reservation_id, event_id
            )
            return True

    def _handle_update(self, reservation_id: str, payload: dict) -> bool:
        with Session(self._engine) as session:
            reservation = session.get(ReservationDB, reservation_id)
            if reservation is None:
                logger.info("Reserva %s no existe al actualizar; asumimos completado.", reservation_id)
                return True
            calendar_id = payload.get("calendar_id") or reservation.google_calendar_id
            if not calendar_id:
                logger.info("Reserva %s sin calendar_id al actualizar", reservation_id)
                return True
            event_id = reservation.google_event_id or payload.get("event_id")
            tz_name = payload.get("tz") or getattr(TZ, "key", str(TZ))
            if not event_id:
                res_model = _reservation_from_row(reservation)
                event = create_gcal_reservation(res_model, calendar_id=calendar_id, tz=tz_name)
                event_id = event.get("id") if isinstance(event, dict) else None
                reservation.google_event_id = event_id
            else:
                patch_gcal_reservation(event_id, reservation.start, reservation.end, calendar_id, tz=tz_name)
            reservation.google_calendar_id = calendar_id
            session.add(reservation)
            session.commit()
            logger.info(
                "Reserva %s actualizada en Google Calendar (evento %s)", reservation_id, event_id
            )
            return True

    def _handle_delete(self, reservation_id: str, payload: dict) -> bool:
        calendar_id = payload.get("calendar_id")
        event_id = payload.get("event_id")
        drop_calendar = payload.get("drop_calendar", True)
        if not calendar_id or not event_id:
            with Session(self._engine) as session:
                reservation = session.get(ReservationDB, reservation_id)
                if reservation is None:
                    logger.info(
                        "Trabajo delete para reserva %s sin datos y sin fila en BD. Marcamos completado.",
                        reservation_id,
                    )
                    return True
                calendar_id = calendar_id or reservation.google_calendar_id
                event_id = event_id or reservation.google_event_id
        if calendar_id and event_id:
            delete_gcal_reservation(event_id, calendar_id)
            logger.info("Evento %s eliminado de calendario %s", event_id, calendar_id)
        else:
            logger.info(
                "Trabajo delete para reserva %s sin calendar/event id. No hay nada que borrar.",
                reservation_id,
            )
        with Session(self._engine) as session:
            reservation = session.get(ReservationDB, reservation_id)
            if reservation is None:
                return True
            reservation.google_event_id = None
            if drop_calendar:
                reservation.google_calendar_id = None
            session.add(reservation)
            session.commit()
        return True


_worker: Optional[CalendarSyncWorker] = None


def start_worker() -> None:
    global _worker
    if os.getenv("PELUBOT_DISABLE_GCAL_WORKER", "").lower() in {"1", "true", "yes", "si", "sí"}:
        logger.info("Worker de Google Calendar deshabilitado por variable de entorno.")
        return
    if _worker is None:
        poll_interval = float(os.getenv("GCAL_QUEUE_POLL_SECONDS", "2"))
        max_attempts = int(os.getenv("GCAL_QUEUE_MAX_ATTEMPTS", "5"))
        _worker = CalendarSyncWorker(poll_interval=poll_interval, max_attempts=max_attempts)
    _worker.start()


def stop_worker() -> None:
    if _worker:
        _worker.stop()
