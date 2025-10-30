from __future__ import annotations

from datetime import datetime, timedelta, date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import ReservationDB, StylistDB
from app.utils.date import TZ, now_tz
from app.utils.security import hash_password

COOKIE_NAME = "pro_session"


def _seed_stylist(engine, **overrides) -> StylistDB:
    data = {
        "id": "deinis",
        "name": "Deinis Barber",
        "display_name": "Deinis",
        "email": "deinis@example.com",
        "services": ["corte_cabello"],
        "password_hash": hash_password("1234"),
        "is_active": True,
    }
    data.update(overrides)
    stylist = StylistDB(**data)
    with Session(engine) as session:
        session.add(stylist)
        session.commit()
        session.refresh(stylist)
        return stylist


def _seed_reservation(engine, *, reservation_id: str, professional_id: str, start: datetime, duration_minutes: int = 30, **extras) -> ReservationDB:
    end = start + timedelta(minutes=duration_minutes)
    payload = {
        "id": reservation_id,
        "service_id": "corte_cabello",
        "professional_id": professional_id,
        "start": start,
        "end": end,
        "customer_name": "Cliente Test",
        "customer_phone": "+34123456789",
    }
    payload.update(extras)
    row = ReservationDB(**payload)
    with Session(engine) as session:
        session.add(row)
        session.commit()
        session.refresh(row)
        return row


def _login(app_client: TestClient, identifier: str, password: str) -> str:
    resp = app_client.post("/pros/login", json={"identifier": identifier, "password": password})
    assert resp.status_code == 200
    token = resp.cookies.get(COOKIE_NAME)
    assert token
    app_client.cookies.set(COOKIE_NAME, token)
    return token


def test_stylist_cancel_reservation_removes_booking(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    start = datetime(2050, 1, 5, 10, 0, tzinfo=TZ)
    reservation = _seed_reservation(engine, reservation_id="res-can-1", professional_id="deinis", start=start)

    _login(app_client, "deinis", "1234")
    resp = app_client.post(f"/pros/reservations/{reservation.id}/cancel")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert "cancelada" in body["message"].lower()

    with Session(engine) as session:
        stored = session.get(ReservationDB, reservation.id)
        assert stored is not None
        assert stored.status == "cancelada"
        assert stored.sync_status == "queued"
        assert stored.sync_job_id is not None


def test_stylist_cannot_cancel_other_professional_reservation(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    _seed_stylist(engine, id="alex", email="alex@example.com", name="Alex", display_name="Alex", password_hash=hash_password("alexpass"))
    start = datetime(2050, 1, 7, 11, 0, tzinfo=TZ)
    reservation = _seed_reservation(engine, reservation_id="res-can-2", professional_id="alex", start=start)

    _login(app_client, "deinis", "1234")
    resp = app_client.post(f"/pros/reservations/{reservation.id}/cancel")
    assert resp.status_code == 404

    with Session(engine) as session:
        assert session.get(ReservationDB, reservation.id) is not None


def test_stylist_reschedule_updates_reservation(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    start = (now_tz() + timedelta(days=7)).replace(hour=9, minute=0, second=0, microsecond=0)
    reservation = _seed_reservation(
        engine,
        reservation_id="res-resch-1",
        professional_id="deinis",
        start=start,
        google_event_id="gcal-123",
        google_calendar_id="primary",
    )

    _login(app_client, "deinis", "1234")
    resp = app_client.post(
        f"/pros/reservations/{reservation.id}/reschedule",
        json={"new_time": "12:00"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["reservation_id"] == reservation.id
    assert data["start"]
    new_start = datetime.fromisoformat(data["start"].replace("Z", "+00:00"))
    assert new_start.date() == start.date()
    assert new_start.hour == 12
    assert new_start.minute == 0

    with Session(engine) as session:
        stored = session.get(ReservationDB, reservation.id)
        assert stored is not None
        assert stored.start.hour == 12
        assert stored.google_event_id == "gcal-123"
        assert stored.google_calendar_id == "primary"
        assert stored.sync_status == "queued"
        assert stored.sync_job_id is not None


def test_stylist_reservation_sync_status_endpoint(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    start = (now_tz() + timedelta(days=10)).replace(hour=9, minute=0, second=0, microsecond=0)
    reservation = _seed_reservation(
        engine,
        reservation_id="res-sync-1",
        professional_id="deinis",
        start=start,
        google_event_id="gcal-456",
        google_calendar_id="primary",
    )

    _login(app_client, "deinis", "1234")
    # Reprogramar para encolar un job y luego consultar el estado
    resp = app_client.post(
        f"/pros/reservations/{reservation.id}/reschedule",
        json={"new_time": "10:00"},
    )
    assert resp.status_code == 200

    sync_resp = app_client.get(f"/pros/reservations/{reservation.id}/sync")
    assert sync_resp.status_code == 200
    payload = sync_resp.json()
    assert payload["reservation_id"] == reservation.id
    assert payload["sync_status"] == "queued"
    assert payload["sync_job_id"] is not None


def test_stylist_reschedule_forbidden_for_other_professional(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    _seed_stylist(engine, id="alex", email="alex@example.com", name="Alex", display_name="Alex", password_hash=hash_password("alexpass"))
    start = datetime(2050, 3, 15, 10, 30, tzinfo=TZ)
    reservation = _seed_reservation(engine, reservation_id="res-resch-2", professional_id="alex", start=start)

    _login(app_client, "deinis", "1234")
    resp = app_client.post(
        f"/pros/reservations/{reservation.id}/reschedule",
        json={"new_time": "13:00"},
    )
    assert resp.status_code == 404

    with Session(engine) as session:
        stored = session.get(ReservationDB, reservation.id)
        assert stored is not None
        assert stored.start.hour == 10


def test_stylist_reservations_history_filters(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine, services=["corte_cabello", "corte_barba"])
    base_date = date(2050, 6, 1)
    _seed_reservation(
        engine,
        reservation_id="hist-1",
        professional_id="deinis",
        start=datetime(2050, 6, 1, 10, 0, tzinfo=TZ),
        customer_name="Ana Cliente",
        customer_phone="+34000000001",
        status="confirmada",
        service_id="corte_cabello",
    )
    _seed_reservation(
        engine,
        reservation_id="hist-2",
        professional_id="deinis",
        start=datetime(2050, 6, 5, 12, 0, tzinfo=TZ),
        customer_name="Luis Cliente",
        customer_phone="+34000000002",
        status="cancelada",
        service_id="corte_barba",
    )
    _seed_reservation(
        engine,
        reservation_id="hist-3",
        professional_id="deinis",
        start=datetime(2050, 6, 10, 9, 30, tzinfo=TZ),
        customer_name="Carlos Test",
        customer_phone="+34000000003",
        status="asistida",
        service_id="corte_cabello",
    )

    _login(app_client, "deinis", "1234")
    resp = app_client.get("/pros/reservations/history")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total"] == 3
    items = payload["items"]
    # Orden descendente por fecha
    assert [item["id"] for item in items] == ["hist-3", "hist-2", "hist-1"]

    # Filtro por estado
    resp_status = app_client.get("/pros/reservations/history", params={"status": "cancelada"})
    assert resp_status.status_code == 200
    data_status = resp_status.json()
    assert data_status["total"] == 1
    assert data_status["items"][0]["id"] == "hist-2"

    # Búsqueda por nombre
    resp_search = app_client.get("/pros/reservations/history", params={"search": "luis"})
    assert resp_search.status_code == 200
    data_search = resp_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["id"] == "hist-2"

    # Rango de fechas
    resp_range = app_client.get(
        "/pros/reservations/history",
        params={"date_from": base_date.isoformat(), "date_to": (base_date + timedelta(days=4)).isoformat()},
    )
    assert resp_range.status_code == 200
    data_range = resp_range.json()
    assert data_range["total"] == 1
    assert data_range["items"][0]["id"] == "hist-1"
