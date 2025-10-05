from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import StylistDB
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


def test_stylist_login_success_sets_cookie(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)

    resp = app_client.post("/pros/login", json={"identifier": "deinis", "password": "1234"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["stylist"]["id"] == "deinis"
    assert COOKIE_NAME in resp.cookies
    token = resp.cookies.get(COOKIE_NAME)
    assert token

    # Forzamos el jar del cliente en tests porque la cookie real se marca como "Secure" en ENV=prod
    app_client.cookies.set(COOKIE_NAME, token)

    me = app_client.get("/pros/me")
    assert me.status_code == 200
    assert me.json()["stylist"]["id"] == "deinis"


def test_stylist_login_rejects_invalid_password(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)

    resp = app_client.post("/pros/login", json={"identifier": "deinis", "password": "wrong"})
    assert resp.status_code == 401


def test_stylist_logout_invalidates_session(app_client: TestClient):
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    login = app_client.post("/pros/login", json={"identifier": "deinis", "password": "1234"})
    assert login.status_code == 200

    logout = app_client.post("/pros/logout")
    assert logout.status_code == 200
    assert logout.json()["ok"] is True

    me = app_client.get("/pros/me")
    assert me.status_code == 401
