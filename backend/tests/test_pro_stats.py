import pytest
from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.auth import SESSION_COOKIE_NAME, create_stylist_session_token
from app.models import ReservationDB, StylistDB
from app.utils.date import TZ


def test_pro_stats_endpoint(app_client, monkeypatch):
    from app.api import pro_portal as pro_portal_module
    from app.utils import date as date_utils

    fixed_now = datetime(2025, 10, 20, 10, 0, tzinfo=TZ)
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
            services=["corte_cabello", "corte_barba", "arreglo_barba"],
        )
        session.add(stylist)
        session.commit()

        def _create_reservation(
            *,
            reservation_id: str,
            start: datetime,
            customer_name: str,
            service_id: str,
        ) -> ReservationDB:
            end = start + timedelta(minutes=30)
            return ReservationDB(
                id=reservation_id,
                service_id=service_id,
                professional_id=stylist.id,
                start=start,
                end=end,
                customer_name=customer_name,
            )

        reservations = [
            # Previous month (September)
            _create_reservation(
                reservation_id="sep-alice",
                start=datetime(2025, 9, 2, 10, 0, tzinfo=TZ),
                customer_name="Alice",
                service_id="corte_cabello",
            ),
            _create_reservation(
                reservation_id="sep-diego",
                start=datetime(2025, 9, 10, 11, 0, tzinfo=TZ),
                customer_name="Diego",
                service_id="corte_barba",
            ),
            _create_reservation(
                reservation_id="sep-eva",
                start=datetime(2025, 9, 18, 12, 0, tzinfo=TZ),
                customer_name="Eva",
                service_id="corte_barba",
            ),
            # Current month (October)
            _create_reservation(
                reservation_id="oct-alice-1",
                start=datetime(2025, 10, 2, 10, 0, tzinfo=TZ),
                customer_name="Alice",
                service_id="corte_cabello",
            ),
            _create_reservation(
                reservation_id="oct-bob",
                start=datetime(2025, 10, 5, 9, 0, tzinfo=TZ),
                customer_name="Bob",
                service_id="corte_barba",
            ),
            _create_reservation(
                reservation_id="oct-alice-2",
                start=datetime(2025, 10, 12, 14, 0, tzinfo=TZ),
                customer_name="Alice",
                service_id="corte_barba",
            ),
            _create_reservation(
                reservation_id="oct-clara",
                start=datetime(2025, 10, 20, 13, 0, tzinfo=TZ),
                customer_name="Clara",
                service_id="arreglo_barba",
            ),
        ]

        session.add_all(reservations)
        session.commit()

    token, _ = create_stylist_session_token("stylist-1")
    app_client.cookies.set(SESSION_COOKIE_NAME, token)

    response = app_client.get("/pros/stats")
    assert response.status_code == 200
    body = response.json()

    summary = body["summary"]
    assert summary["total_revenue_eur"] == 59.0
    assert summary["revenue_change_pct"] == pytest.approx(20.41, rel=1e-2)
    assert summary["avg_ticket_eur"] == 14.75
    assert summary["avg_ticket_change_pct"] == pytest.approx(-9.68, rel=1e-2)
    assert summary["repeat_rate_pct"] == pytest.approx(33.33, rel=1e-2)
    assert summary["repeat_rate_change_pct"] == pytest.approx(33.33, rel=1e-2)
    assert summary["new_clients"] == 2
    assert summary["new_clients_change_pct"] == pytest.approx(-33.33, rel=1e-2)

    revenue_series = body["revenue_series"]
    assert len(revenue_series) == 6
    assert revenue_series[-1]["revenue_eur"] == 59.0
    assert revenue_series[-2]["revenue_eur"] == 49.0

    top_services = body["top_services"]
    assert [service["service_id"] for service in top_services] == [
        "corte_barba",
        "corte_cabello",
        "arreglo_barba",
    ]
    assert top_services[0]["total_revenue_eur"] == 36.0
    assert top_services[0]["growth_pct"] == 0.0

    retention = {bucket["id"]: bucket for bucket in body["retention"]}
    assert retention["active-30"]["count"] == 3
    assert retention["active-30"]["trend"] == "down"
    assert retention["risk-90"]["count"] == 2
    assert retention["risk-90"]["trend"] == "up"

    insights = body["insights"]
    assert len(insights) >= 1