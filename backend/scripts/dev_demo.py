#!/usr/bin/env python3
"""
Ayudante de demo para desarrollo:
- Opcionalmente limpia Google Calendar vía endpoint admin
- Crea una reserva de demo y comprueba conflictos

Variables de entorno:
  BASE                por defecto http://127.0.0.1:8776
  API_KEY             por defecto dev-key
SERVICE_ID          por defecto corte_cabello
  PROFESSIONAL_ID     por defecto deinis
  DAYS_AHEAD          por defecto 10
  CLEAR_ALL           por defecto true (si es true, borra todo; si es false, solo eventos de Pelubot)

Uso:
  python backend/scripts/dev_demo.py              # limpiar+demo
  python backend/scripts/dev_demo.py --no-clear   # solo demo
  python backend/scripts/dev_demo.py --clear-only # solo limpiar
"""
from __future__ import annotations
import json
import os
from datetime import date, timedelta
from urllib import request

BASE = os.getenv("BASE", "http://127.0.0.1:8776")
API_KEY = os.getenv("API_KEY", "dev-key")
SERVICE_ID = os.getenv("SERVICE_ID", "corte_cabello")
PROFESSIONAL_ID = os.getenv("PROFESSIONAL_ID", "deinis")
DAYS_AHEAD = int(os.getenv("DAYS_AHEAD", "10"))
CLEAR_ALL = (os.getenv("CLEAR_ALL", "true").lower() in ("1","true","yes","y","si","sí"))
CUSTOMER_NAME = os.getenv("CUSTOMER_NAME", "Demo User")
CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "+34123456789")
CUSTOMER_EMAIL = os.getenv("CUSTOMER_EMAIL", "demo@example.com")


def _get(path: str):
    """Realiza una petición GET y devuelve el JSON resultante."""
    with request.urlopen(BASE + path) as r:
        return json.loads(r.read().decode())


def _post(path: str, payload: dict | None = None, headers: dict | None = None):
    """Envía una petición POST con JSON opcional y cabeceras extra."""
    data = None if payload is None else json.dumps(payload).encode()
    req = request.Request(BASE + path, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with request.urlopen(req) as r:
        return json.loads(r.read().decode())


def next_workday(days: int) -> date:
    """Calcula el siguiente día laboral evitando domingos."""
    d = date.today() + timedelta(days=days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


def clear_calendars():
    """Invoca el endpoint admin para limpiar calendarios según configuración."""
    body = {
        "dry_run": False,
        "confirm": "DELETE",
        "only_pelubot": (not CLEAR_ALL and True) or False,
    }
    out = _post("/admin/clear_calendars", body, headers={"X-API-Key": API_KEY})
    return out


def demo_flow():
    """Ejecuta el flujo de demo: busca slot, crea reserva y detecta conflictos."""
    d = next_workday(DAYS_AHEAD)
    slots = _post("/slots", {"service_id": SERVICE_ID, "date_str": d.isoformat(), "professional_id": PROFESSIONAL_ID})
    arr = slots.get("slots") or []
    if not arr:
        return {"ok": False, "error": "No hay huecos disponibles"}
    first = arr[0]
    created = _post(
        "/reservations",
        {
            "service_id": SERVICE_ID,
            "professional_id": PROFESSIONAL_ID,
            "start": first,
            "customer_name": CUSTOMER_NAME,
            "customer_phone": CUSTOMER_PHONE,
            "customer_email": CUSTOMER_EMAIL,
        },
        headers={"X-API-Key": API_KEY},
    )
    conf = _post(
        "/admin/conflicts",
        {"start": first.split("T")[0], "end": first.split("T")[0]},
        headers={"X-API-Key": API_KEY},
    )
    return {"slots": len(arr), "created": created, "conflicts": conf}


def main():
    """Punto de entrada CLI para limpiar calendarios y crear una reserva demo."""
    import sys
    do_clear = True
    clear_only = False
    if len(sys.argv) > 1:
        if sys.argv[1] == "--no-clear":
            do_clear = False
        elif sys.argv[1] == "--clear-only":
            clear_only = True

    health = _get("/health")
    ready = _get("/ready")
    print(json.dumps({"health": health, "ready": ready}))

    if do_clear or clear_only:
        cleared = clear_calendars()
        print(json.dumps({"cleared": cleared}))
        if clear_only:
            return

    result = demo_flow()
    print(json.dumps(result))


if __name__ == "__main__":
    main()
