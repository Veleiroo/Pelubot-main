from __future__ import annotations

from datetime import datetime, timedelta

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
        assert session.get(ReservationDB, reservation.id) is None


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
        assert stored.google_event_id is None
        assert stored.google_calendar_id is None


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
