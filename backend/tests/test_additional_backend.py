"""Pruebas adicionales del backend: readiness y autenticación."""

import os
from datetime import date, timedelta

API_KEY = "test-api-key"
os.environ["API_KEY"] = API_KEY


def _next_workday(days_ahead: int = 32) -> date:
    d = date.today() + timedelta(days=days_ahead)
    while d.weekday() == 6:  # domingo
        d += timedelta(days=1)
    return d


def test_ready_ok_and_gcal_fail(app_client, monkeypatch):
    # ok
    r = app_client.get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True

    # simular fallo en cliente gcal
    import app.integrations.google_calendar as gcal

    def boom():
        raise RuntimeError("boom")

    monkeypatch.setattr(gcal, "build_calendar", boom)
    r2 = app_client.get("/ready")
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["ok"] is False
    assert isinstance(b2.get("gcal"), str) and "error:" in b2["gcal"].lower()


def test_auth_required_on_protected_endpoints(app_client):
    # Falta API key -> 401
    assert app_client.post("/reservations", json={}).status_code == 401
    assert app_client.post("/cancel_reservation", json={}).status_code == 401
    assert app_client.post("/reservations/reschedule", json={}).status_code == 401


def test_public_reservations_enabled_without_key(app_client, monkeypatch):
    import app.api.routes as routes

    monkeypatch.setattr(routes, "PUBLIC_RESERVATIONS_ENABLED", True)

    target = _next_workday()
    slots = app_client.post(
        "/slots",
        json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"},
    )
    assert slots.status_code == 200
    start = slots.json()["slots"][0]

    res = app_client.post(
        "/reservations",
        json={"service_id": "corte_cabello", "professional_id": "deinis", "start": start},
    )
    assert res.status_code == 200
    res_id = res.json().get("reservation_id")
    assert res_id

    app_client.delete(
        f"/reservations/{res_id}",
        headers={"X-API-Key": API_KEY},
    )


def test_admin_sync_propagates_errors(app_client, monkeypatch):
    import app.api.routes as routes

    def fake_import(*args, **kwargs):
        return {"ok": False, "error": "boom"}

    def fake_push(*args, **kwargs):
        return {"ok": True}

    monkeypatch.setattr(routes, "sync_from_gcal_range", fake_import)
    monkeypatch.setattr(routes, "reconcile_db_to_gcal_range", fake_push)

    r = app_client.post(
        "/admin/sync",
        json={"mode": "import"},
        headers={"X-API-Key": API_KEY},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False, body
    assert body["results"]["import"]["ok"] is False
    assert body["errors"]["import"] == "boom"


def test_reservations_order_and_created_at_tz(app_client):
    target = _next_workday()
    r_slots = app_client.post(
        "/slots",
        json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"},
    )
    assert r_slots.status_code == 200
    slots = r_slots.json()["slots"]
    assert len(slots) >= 2

    start1 = slots[0]

    payload1 = {"service_id": "corte_cabello", "professional_id": "deinis", "start": start1}
    r1 = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload1)
    assert r1.status_code == 200
    res_id1 = r1.json().get("reservation_id")

    r_slots_after = app_client.post(
        "/slots",
        json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"},
    )
    assert r_slots_after.status_code == 200
    remaining_slots = r_slots_after.json()["slots"]
    assert remaining_slots, "after reservar debe seguir habiendo huecos"

    payload2 = {"service_id": "corte_cabello", "professional_id": "deinis", "start": remaining_slots[0]}
    r2 = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload2)
    assert r2.status_code == 200
    res_id2 = r2.json().get("reservation_id")

    # listar y validar orden y created_at con tz
    rlist = app_client.get("/reservations")
    assert rlist.status_code == 200
    items = rlist.json()
    assert len(items) >= 2
    starts = [it["start"] for it in items]
    assert starts == sorted(starts)
    # created_at debe tener tz (+00:00 o Z)
    assert "created_at" in items[0]
    cat = items[0]["created_at"]
    assert "T" in cat and ("+00:00" in cat or cat.endswith("Z"))


def test_overlap_same_slot_is_rejected(app_client):
    target = _next_workday()
    r = app_client.post("/slots", json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"})
    assert r.status_code == 200
    slots = r.json()["slots"]
    assert len(slots) >= 1
    start = slots[0]

    payload = {"service_id": "corte_cabello", "professional_id": "deinis", "start": start}
    r1 = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
    assert r1.status_code == 200
    r2 = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
    assert r2.status_code == 400


def test_delete_cancel_and_double_cancel(app_client):
    target = _next_workday()
    r = app_client.post("/slots", json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"})
    start = r.json()["slots"][0]
    create_payload = {"service_id": "corte_cabello", "professional_id": "deinis", "start": start}
    r_create = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=create_payload)
    assert r_create.status_code == 200
    res_id = r_create.json().get("reservation_id")

    # cancelar por DELETE
    r_del = app_client.delete(f"/reservations/{res_id}", headers={"X-API-Key": API_KEY})
    assert r_del.status_code == 200
    # segunda vez -> 404
    r_del2 = app_client.delete(f"/reservations/{res_id}", headers={"X-API-Key": API_KEY})
    assert r_del2.status_code == 404
