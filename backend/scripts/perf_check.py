#!/usr/bin/env python3
"""Prueba ligera de rendimiento sobre el backend sin levantar un server externo."""

import os
import sys
import time
from pathlib import Path
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parents[1]
root_str = str(ROOT)
if root_str not in sys.path:
    sys.path.insert(0, root_str)

from fastapi.testclient import TestClient

from app.main import app
from app.services import logic as services_logic
from app.api import routes


def _noop_gcal(*args, **kwargs):
    return {"id": None}


services_logic.create_gcal_reservation = _noop_gcal
routes.create_gcal_reservation = _noop_gcal

API_KEY = os.getenv("API_KEY", "perf-key")
os.environ["API_KEY"] = API_KEY
os.environ.setdefault("PELUBOT_FAKE_GCAL", "1")

client = TestClient(app)


def next_workday(days_ahead: int = 14) -> date:
    d = date.today() + timedelta(days=days_ahead)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


def scenario() -> None:
    target = next_workday()
    date_str = target.isoformat()

    slots_resp = client.post(
        "/slots",
        json={"service_id": "corte_cabello", "date_str": date_str, "professional_id": "deinis"},
    )
    slots_resp.raise_for_status()
    slots = slots_resp.json().get("slots") or []
    if not slots:
        return

    start = slots[0]
    payload = {"service_id": "corte_cabello", "professional_id": "deinis", "start": start}

    res_create = client.post(
        "/reservations",
        headers={"X-API-Key": API_KEY},
        json=payload,
    )
    res_create.raise_for_status()
    message = res_create.json()["message"]
    res_id_part = message.split("ID: ")[1]
    res_id = res_id_part.split(",")[0].split()[0]

    res_cancel = client.delete(
        f"/reservations/{res_id}",
        headers={"X-API-Key": API_KEY},
    )
    res_cancel.raise_for_status()


def main(iterations: int = 50) -> None:
    # Warm-up
    for _ in range(5):
        scenario()

    start = time.perf_counter()
    for _ in range(iterations):
        scenario()
    duration = time.perf_counter() - start
    per_op = duration / iterations if iterations else 0
    print(f"Iteraciones: {iterations}")
    print(f"Tiempo total: {duration:.3f} s")
    print(f"Tiempo por flujo: {per_op*1000:.1f} ms")
    print(f"Reservas/s (aprox): {iterations / duration:.2f}")


if __name__ == "__main__":
    main()
