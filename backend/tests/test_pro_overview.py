from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.auth import SESSION_COOKIE_NAME, create_stylist_session_token
from app.models import ReservationDB, StylistDB
from app.utils.date import TZ


def test_pro_overview_returns_summary(app_client, monkeypatch):
    from app.api import pro_portal as pro_portal_module
    from app.utils import date as date_utils

    fixed_now = datetime(2025, 10, 4, 10, 0, tzinfo=TZ)
    monkeypatch.setattr(date_utils, "now_tz", lambda: fixed_now)
    monkeypatch.setattr(pro_portal_module, "now_tz", lambda: fixed_now)
    monkeypatch.setenv("PRO_PORTAL_SECRET", "test-secret")
    from app.core import auth as auth_module
    monkeypatch.setattr(auth_module, "_SESSION_SECRET", "test-secret", raising=False)
    monkeypatch.setattr(auth_module, "_SESSION_SECRET_RUNTIME", "test-secret", raising=False)

    engine = app_client.app.state.test_engine
    with Session(engine) as session:
        stylist = StylistDB(
            id="stylist-1",
            name="Stylist Uno",
            display_name="Stylist Uno",
            email="stylist@example.com",
            password_hash="hash",
            services=["corte_cabello"],
        )
        session.add(stylist)
        session.commit()

        past_start = fixed_now - timedelta(hours=1)
        future_start = fixed_now + timedelta(hours=2)
        past_end = past_start + timedelta(minutes=30)
        future_end = future_start + timedelta(minutes=30)
        last_week_start = fixed_now - timedelta(days=7)
        last_week_end = last_week_start + timedelta(minutes=30)

        session.add_all(
            [
                ReservationDB(
                    id="res-1",
                    service_id="corte_cabello",
                    professional_id=stylist.id,
                    start=past_start,
                    end=past_end,
                    customer_name="Cliente 1",
                    customer_email="cliente1@example.com",
                    customer_phone="+34111111111",
                    notes="Prefiere servicio express",
                ),
                ReservationDB(
                    id="res-2",
                    service_id="corte_cabello",
                    professional_id=stylist.id,
                    start=future_start,
                    end=future_end,
                    customer_name="Cliente 2",
                    customer_email="cliente2@example.com",
                    customer_phone="+34222222222",
                    notes="Tinte previo al evento",
                ),
                ReservationDB(
                    id="res-3",
                    service_id="corte_cabello",
                    professional_id=stylist.id,
                    start=last_week_start,
                    end=last_week_end,
                    customer_name="Cliente 2",
                    customer_email="cliente2@example.com",
                ),
            ]
        )
        session.commit()

    token, _ = create_stylist_session_token("stylist-1")
    app_client.cookies.set(SESSION_COOKIE_NAME, token)

    resp = app_client.get("/pros/overview")
    assert resp.status_code == 200
    body = resp.json()

    assert body["date"] == "2025-10-04"
    assert body["timezone"]

    assert body["summary"] == {
        "total": 2,
        "confirmadas": 2,
        "asistidas": 0,
        "no_asistidas": 0,
        "canceladas": 0,
    }
    assert len(body["appointments"]) == 2

    upcoming = body["upcoming"]
    assert upcoming
    assert upcoming["id"] == "res-2"
    assert upcoming["last_visit"] == "2025-09-27"
    assert upcoming["client_email"] == "cliente2@example.com"
    assert upcoming["client_phone"] == "+34222222222"
    assert upcoming["notes"] == "Tinte previo al evento"

    first = body["appointments"][0]
    assert first["service_name"] == "Corte de cabello"
    assert first["status"] == "confirmada"
    assert first["client_name"] == "Cliente 1"
    assert first["client_email"] == "cliente1@example.com"
    assert first["client_phone"] == "+34111111111"
    assert first["notes"] == "Prefiere servicio express"
