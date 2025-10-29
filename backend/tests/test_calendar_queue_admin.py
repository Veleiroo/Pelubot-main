from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import Session

from app.api.routes import API_KEY
from app.models import CalendarSyncJobDB, ReservationDB
from app.services.calendar_queue import CalendarSyncWorker, refresh_queue_metrics


def _to_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def test_worker_recovers_stuck_jobs(app_client):
    engine = app_client.app.state.test_engine
    locked_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    with Session(engine) as session:
        job = CalendarSyncJobDB(
            reservation_id="res-stuck",
            action="update",
            status="processing",
            locked_by="obsolete-worker",
            locked_at=locked_at,
            heartbeat_at=locked_at,
            available_at=locked_at,
        )
        session.add(job)
        session.commit()
        job_id = job.id

    worker = CalendarSyncWorker(poll_interval=0.1)
    worker._engine = engine  # usar el engine de pruebas
    worker.worker_id = "test-worker"
    worker._recover_stuck_jobs()

    with Session(engine) as session:
        refreshed = session.get(CalendarSyncJobDB, job_id)
        assert refreshed is not None
        assert refreshed.status == "pending"
        assert refreshed.locked_by is None
        assert refreshed.locked_at is None
        assert refreshed.heartbeat_at is None
        assert refreshed.available_at is not None
        assert _to_aware(refreshed.available_at) <= datetime.now(timezone.utc)

    pending, processing = refresh_queue_metrics(engine)
    assert processing == 0
    assert pending >= 1


def test_admin_calendar_jobs_endpoints(app_client):
    engine = app_client.app.state.test_engine
    with Session(engine) as session:
        job = CalendarSyncJobDB(
            reservation_id="res-admin",
            action="create",
            status="failed",
            attempts=3,
            last_error="timeout",
            available_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        session.add(job)
        session.commit()
        job_id = job.id

    headers = {"X-API-Key": API_KEY}
    resp = app_client.get("/admin/calendar-jobs", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body.get("jobs"), list)
    assert any(job["id"] == job_id for job in body["jobs"])
    assert body["counts"]["failed"] >= 1

    retry_resp = app_client.post(
        f"/admin/calendar-jobs/{job_id}/retry",
        headers=headers,
        json={"delay_seconds": 5},
    )
    assert retry_resp.status_code == 200
    retry_body = retry_resp.json()
    assert retry_body["ok"] is True

    with Session(engine) as session:
        retried = session.get(CalendarSyncJobDB, job_id)
        assert retried is not None
        assert retried.status == "pending"
        assert retried.available_at is not None
        assert _to_aware(retried.available_at) > datetime.now(timezone.utc)
        assert retried.locked_by is None


def test_admin_reservation_sync_status_endpoint(app_client):
    engine = app_client.app.state.test_engine
    with Session(engine) as session:
        reservation = ReservationDB(
            id="res-api-sync",
            service_id="corte_cabello",
            professional_id="deinis",
            start=datetime.now(timezone.utc) + timedelta(days=1),
            end=datetime.now(timezone.utc) + timedelta(days=1, minutes=30),
            sync_status="failed",
            sync_job_id=42,
            sync_last_error="timeout",
        )
        session.add(reservation)
        session.commit()

    headers = {"X-API-Key": API_KEY}
    resp = app_client.get("/reservations/res-api-sync/sync", headers=headers)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload == {
        "reservation_id": "res-api-sync",
        "sync_status": "failed",
        "sync_job_id": 42,
        "sync_last_error": "timeout",
        "sync_updated_at": None,
    }

    unauth = app_client.get("/reservations/res-api-sync/sync")
    assert unauth.status_code == 401
