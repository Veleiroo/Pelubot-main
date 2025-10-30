"""Cola interna para sincronizar reservas con Google Calendar."""
from __future__ import annotations

import logging
import os
import threading
import time
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import func
from sqlmodel import Session, select

from prometheus_client import Counter, Gauge, Histogram

from app.db import engine
from app.models import CalendarSyncJobDB, Reservation, ReservationDB
from app.services.logic import (
    create_gcal_reservation,
    delete_gcal_reservation,
    patch_gcal_reservation,
)
from app.utils.date import TZ

logger = logging.getLogger("pelubot.calendar_queue")


QUEUE_PENDING_GAUGE = Gauge(
    "pelubot_calendar_jobs_pending",
    "Trabajos pendientes de ejecutar en la cola de Google Calendar",
)
QUEUE_PROCESSING_GAUGE = Gauge(
    "pelubot_calendar_jobs_processing",
    "Trabajos actualmente en procesamiento por el worker de Google Calendar",
)
QUEUE_JOB_DURATION = Histogram(
    "pelubot_calendar_job_duration_seconds",
    "Duración de los trabajos procesados en la cola de Google Calendar",
    labelnames=("action", "result"),
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60),
)
QUEUE_JOB_TOTAL = Counter(
    "pelubot_calendar_jobs_processed_total",
    "Trabajos procesados por el worker de Google Calendar",
    labelnames=("action", "result"),
)


def _set_queue_gauges(pending: int, processing: int) -> None:
    try:
        QUEUE_PENDING_GAUGE.set(max(pending, 0))
    except Exception as exc:
        logger.warning("No se pudo actualizar la métrica de trabajos pendientes: %s", exc)
    try:
        QUEUE_PROCESSING_GAUGE.set(max(processing, 0))
    except Exception as exc:
        logger.warning("No se pudo actualizar la métrica de trabajos en proceso: %s", exc)


def refresh_queue_metrics(engine_override=None) -> tuple[int, int]:
    """Recalcula y expone métricas agregadas de la cola."""

    eng = engine_override or engine
    try:
        with Session(eng) as session:
            pending = session.scalar(
                select(func.count())
                .select_from(CalendarSyncJobDB)
                .where(CalendarSyncJobDB.status == "pending")
            ) or 0
            processing = session.scalar(
                select(func.count())
                .select_from(CalendarSyncJobDB)
                .where(CalendarSyncJobDB.status == "processing")
            ) or 0
    except Exception as exc:
        logger.exception("No se pudieron refrescar las métricas de la cola de Google Calendar")
        _set_queue_gauges(0, 0)
        raise
    _set_queue_gauges(pending, processing)
    return pending, processing


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
        sync_status=row.sync_status,
        sync_job_id=row.sync_job_id,
        sync_last_error=row.sync_last_error,
        sync_updated_at=row.sync_updated_at,
    )


def set_reservation_sync_state(
    session: Session,
    reservation_id: str,
    *,
    status: Optional[str],
    job_id: Optional[int],
    error: Optional[str] = None,
) -> None:
    reservation = session.get(ReservationDB, reservation_id)
    if not reservation:
        return
    reservation.sync_status = status
    reservation.sync_job_id = job_id
    reservation.sync_last_error = error
    reservation.sync_updated_at = _utcnow()
    session.add(reservation)
    

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
    refresh_queue_metrics()
    return job


def try_enqueue_calendar_job(
    session: Session,
    *,
    reservation_id: str,
    action: CalendarSyncAction | str,
    payload: Optional[dict] = None,
    available_at: Optional[datetime] = None,
) -> tuple[str, Optional[int]]:
    """Encola un trabajo y devuelve el estado de sincronización y el id asignado."""

    try:
        job = enqueue_calendar_job(
            session,
            reservation_id=reservation_id,
            action=action,
            payload=payload,
            available_at=available_at,
        )
    except Exception as exc:  # noqa: BLE001 - queremos registrar el fallo sin propagarlo
        logger.warning(
            "No se pudo encolar trabajo de Google Calendar: reservation=%s action=%s error=%s",
            reservation_id,
            action,
            exc,
        )
        with suppress(Exception):
            session.rollback()
        return "skipped", None
    return "queued", job.id


class CalendarSyncWorker:
    """Hilo en segundo plano que procesa trabajos pendientes."""

    def __init__(self, poll_interval: float = 2.0, *, max_attempts: int = 5):
        self.poll_interval = poll_interval
        self.max_attempts = max_attempts
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._engine = engine
        self.worker_id: Optional[str] = None
        try:
            stale_env = os.getenv("GCAL_QUEUE_STALE_SECONDS")
            self._stale_seconds = float(stale_env) if stale_env else 0.0
        except ValueError:
            self._stale_seconds = 0.0

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
        try:
            self._thread.join(timeout=timeout)
        except Exception as exc:  # noqa: BLE001 - registramos errores de parada
            logger.warning("Error al detener el worker de Google Calendar: %s", exc)
        self.worker_id = None
        logger.info("Worker de sincronización Google Calendar detenido.")

    def _run_loop(self) -> None:
        self.worker_id = f"{os.getpid()}:{threading.current_thread().name}"
        try:
            self._recover_stuck_jobs()
        except Exception:
            logger.exception("Error recuperando trabajos atascados de Google Calendar")
        refresh_queue_metrics(self._engine)
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

    def _recover_stuck_jobs(self) -> None:
        stale_seconds = self._stale_seconds if self._stale_seconds > 0 else max(self.poll_interval * 2, 60.0)
        threshold = _utcnow() - timedelta(seconds=stale_seconds)
        recovered = 0
        with Session(self._engine) as session:
            stale_expr = func.coalesce(
                CalendarSyncJobDB.heartbeat_at,
                CalendarSyncJobDB.locked_at,
                CalendarSyncJobDB.updated_at,
                CalendarSyncJobDB.created_at,
            )
            jobs = (
                session.exec(
                    select(CalendarSyncJobDB).where(
                        CalendarSyncJobDB.status == "processing",
                        stale_expr <= threshold,
                    )
                ).all()
            )
            if not jobs:
                self._update_queue_gauges(session)
                return
            now = _utcnow()
            for job in jobs:
                logger.warning(
                    "Reactivando trabajo atascado id=%s action=%s locked_by=%s",
                    job.id,
                    job.action,
                    job.locked_by,
                )
                job.status = "pending"
                job.locked_by = None
                job.locked_at = None
                job.heartbeat_at = None
                job.updated_at = now
                if job.available_at is not None and job.available_at.tzinfo is None:
                    job.available_at = job.available_at.replace(tzinfo=timezone.utc)
                if job.available_at is None or job.available_at > now:
                    job.available_at = now
                set_reservation_sync_state(
                    session,
                    job.reservation_id,
                    status="queued",
                    job_id=job.id,
                    error=job.last_error,
                )
                session.add(job)
                recovered += 1
            session.commit()
            self._update_queue_gauges(session)
        if recovered:
            logger.warning("Worker %s reactivó %s trabajos encolados", self.worker_id, recovered)

    def _update_queue_gauges(self, session: Session) -> None:
        try:
            pending = session.scalar(
                select(func.count())
                .select_from(CalendarSyncJobDB)
                .where(CalendarSyncJobDB.status == "pending")
            ) or 0
            processing = session.scalar(
                select(func.count())
                .select_from(CalendarSyncJobDB)
                .where(CalendarSyncJobDB.status == "processing")
            ) or 0
        except Exception as exc:
            logger.warning("No se pudieron obtener métricas de la cola desde la sesión actual: %s", exc)
            return
        _set_queue_gauges(int(pending), int(processing))

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
                self._update_queue_gauges(session)
                return False
            job.status = "processing"
            job.attempts += 1
            job.locked_by = self.worker_id or f"{os.getpid()}:{threading.current_thread().name}"
            job.locked_at = now
            job.heartbeat_at = now
            job.updated_at = now
            session.add(job)
            session.commit()
            session.refresh(job)
            job_id = job.id
            reservation_id = job.reservation_id
            action = job.action
            payload = _ensure_payload(job.payload)
            attempts = job.attempts
            self._update_queue_gauges(session)

        if not job_id or not reservation_id or not action:
            refresh_queue_metrics(self._engine)
            return False

        success = False
        error_message: Optional[str] = None
        start_time = time.perf_counter()
        try:
            success = self._execute_action(reservation_id, action, payload)
        except Exception as exc:  # noqa: BLE001 - registramos y reintentamos
            error_message = str(exc)
            logger.exception(
                "Fallo ejecutando trabajo GCal id=%s reservation=%s action=%s", job_id, reservation_id, action
            )
        else:
            error_message = None
        duration = time.perf_counter() - start_time

        result_label = "success" if success else "failure"
        try:
            QUEUE_JOB_TOTAL.labels(action=action, result=result_label).inc()
            QUEUE_JOB_DURATION.labels(action=action, result=result_label).observe(duration)
        except Exception as exc:
            logger.warning("No se pudieron actualizar métricas de trabajos de Google Calendar: %s", exc)

        with Session(self._engine) as session:
            job = session.get(CalendarSyncJobDB, job_id)
            if not job:
                refresh_queue_metrics(self._engine)
                return True
            now_update = _utcnow()
            job.updated_at = now_update
            if success:
                job.status = "completed"
                job.last_error = None
                job.completed_at = now_update
                set_reservation_sync_state(
                    session,
                    reservation_id,
                    status="synced",
                    job_id=job_id,
                    error=None,
                )
            else:
                job.last_error = error_message
                job.completed_at = None
                if attempts >= self.max_attempts:
                    job.status = "failed"
                    set_reservation_sync_state(
                        session,
                        reservation_id,
                        status="failed",
                        job_id=job_id,
                        error=error_message,
                    )
                else:
                    job.status = "pending"
                    delay = int(os.getenv("GCAL_QUEUE_RETRY_SECONDS", "60"))
                    job.available_at = _utcnow() + timedelta(seconds=delay * attempts)
                    set_reservation_sync_state(
                        session,
                        reservation_id,
                        status="queued",
                        job_id=job_id,
                        error=error_message,
                    )
            job.locked_by = None
            job.locked_at = None
            job.heartbeat_at = None
            session.add(job)
            session.commit()
            self._update_queue_gauges(session)
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
