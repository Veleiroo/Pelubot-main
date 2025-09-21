"""Pruebas de los endpoints de administración."""

import os
from datetime import date, timedelta

import pytest

from app.integrations.google_calendar import FakeCalendarService

API_KEY = "test-api-key"
os.environ["API_KEY"] = API_KEY
os.environ.setdefault("PELUBOT_FAKE_GCAL", "1")


@pytest.fixture()
def admin_headers():
    return {"X-API-Key": API_KEY}


def _future_workday(days: int = 7) -> date:
    d = date.today() + timedelta(days=days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


def test_admin_db_endpoints(app_client, admin_headers):
    info = app_client.get("/admin/db_info", headers=admin_headers)
    assert info.status_code == 200
    body = info.json()
    assert body["ok"] is True

    integrity = app_client.get("/admin/db_integrity", headers=admin_headers)
    assert integrity.status_code == 200
    assert "ok" in integrity.json()

    optimize = app_client.post("/admin/db_optimize", json={}, headers=admin_headers)
    assert optimize.status_code == 200
    opt_data = optimize.json()
    assert opt_data["ok"] is True

    checkpoint = app_client.post("/admin/db_checkpoint", headers=admin_headers)
    assert checkpoint.status_code == 200
    chk = checkpoint.json()
    assert chk["ok"] is True


def test_admin_sync_conflicts_and_cleanup(app_client, admin_headers, monkeypatch):
    from app.api import routes

    # Usa cliente fake para evitar llamadas reales a GCal
    monkeypatch.setattr(routes, "build_calendar", lambda: FakeCalendarService())

    target = _future_workday()
    start = target.isoformat()

    sync_payload = {"mode": "both", "start": start, "end": start}
    sync_resp = app_client.post("/admin/sync", json=sync_payload, headers=admin_headers)
    assert sync_resp.status_code == 200
    sync_body = sync_resp.json()
    assert "results" in sync_body

    conflicts = app_client.post(
        "/admin/conflicts",
        json={"start": start, "end": start},
        headers=admin_headers,
    )
    assert conflicts.status_code == 200
    conflicts_body = conflicts.json()
    assert "ok" in conflicts_body

    clear_resp = app_client.post(
        "/admin/clear_calendars",
        json={"dry_run": True, "start": start, "end": start},
        headers=admin_headers,
    )
    assert clear_resp.status_code == 200
    assert clear_resp.json()["ok"] is True

    cleanup = app_client.post(
        "/admin/cleanup_orphans",
        json={"dry_run": True},
        headers=admin_headers,
    )
    assert cleanup.status_code == 200
    assert cleanup.json()["ok"] is True


def test_admin_wipe_reservations_requires_confirm(app_client, admin_headers):
    resp = app_client.post("/admin/wipe_reservations", json={}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert "Confirmación requerida" in data.get("error", "")
