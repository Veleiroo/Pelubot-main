#!/usr/bin/env python3
"""Valida la creación de reservas para todos los servicios y ejecuta pruebas de estrés.

Uso básico:

    python backend/scripts/validate_services.py \
        --api-key <API_KEY_REAL> --days-ahead 10

Argumentos principales:
  --base           URL base del backend (por defecto http://127.0.0.1:8776)
  --api-key        API key para endpoints protegidos (obligatoria para crear/cancelar)
  --days-ahead     Días en el futuro para buscar huecos (por defecto 10)
  --keep           No cancelar las reservas creadas (por defecto se cancelan)
  --stress N       Ejecuta N ciclos adicionales de creación/cancelación para prueba de estrés
  --stress-service Servicio a usar en la prueba de estrés (por defecto corte_cabello)
  --stress-pro     Profesional para la prueba de estrés (por defecto deinis)

La validación estándar crea una reserva por cada combinación profesional/servicio,
comprueba que obtiene `google_event_id` y, salvo que se indique `--keep`, la cancela
después para dejar el calendario limpio.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List
from urllib import request, error


ROOT = Path(__file__).resolve().parents[1]
root_str = str(ROOT)
if root_str not in sys.path:
    sys.path.insert(0, root_str)

from app.data import PROS, SERVICES, SERVICE_BY_ID  # noqa  # pylint: disable=wrong-import-position


CUSTOMER_NAME = os.getenv("CUSTOMER_NAME", "Validator Bot")
CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "+34987654321")
CUSTOMER_EMAIL = os.getenv("CUSTOMER_EMAIL", "validator@example.com")
CUSTOMER_NOTES = os.getenv("CUSTOMER_NOTES")


@dataclass
class ReservationResult:
    service_id: str
    professional_id: str
    start: str | None
    reservation_id: str | None
    google_event_id: str | None
    ok: bool
    error: str | None = None


def _json_request(
    base: str,
    path: str,
    method: str = "POST",
    payload: Dict | None = None,
    headers: Dict[str, str] | None = None,
    timeout: int = 20,
) -> Dict:
    data = None if payload is None else json.dumps(payload).encode()
    req = request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for key, value in headers.items():
            req.add_header(key, value)
    with request.urlopen(req, timeout=timeout) as resp:  # type: ignore[arg-type]
        body = resp.read().decode()
    return json.loads(body)


def _delete(base: str, path: str, headers: Dict[str, str], timeout: int = 20) -> Dict:
    req = request.Request(base + path, method="DELETE")
    for key, value in headers.items():
        req.add_header(key, value)
    with request.urlopen(req, timeout=timeout) as resp:  # type: ignore[arg-type]
        body = resp.read().decode()
    return json.loads(body)


def next_workday(days_ahead: int) -> date:
    target = date.today() + timedelta(days=days_ahead)
    while target.weekday() == 6:  # domingo
        target += timedelta(days=1)
    return target


def validate_service(
    base: str,
    api_key: str,
    professional_id: str,
    service_id: str,
    days_ahead: int,
) -> ReservationResult:
    date_str = next_workday(days_ahead).isoformat()
    try:
        slots_resp = _json_request(
            base,
            "/slots",
            payload={
                "service_id": service_id,
                "professional_id": professional_id,
                "date_str": date_str,
            },
        )
    except error.HTTPError as exc:  # pragma: no cover - reporting en CLI
        return ReservationResult(service_id, professional_id, None, None, None, False, f"/slots {exc}")

    slots: List[str] = slots_resp.get("slots") or []
    if not slots:
        return ReservationResult(service_id, professional_id, None, None, None, False, "Sin huecos disponibles")

    start = slots[0]

    try:
        payload = {
            "service_id": service_id,
            "professional_id": professional_id,
            "start": start,
            "customer_name": CUSTOMER_NAME,
            "customer_phone": CUSTOMER_PHONE,
            "customer_email": CUSTOMER_EMAIL,
        }
        if CUSTOMER_NOTES:
            payload["customer_notes"] = CUSTOMER_NOTES

        create_resp = _json_request(
            base,
            "/reservations",
            payload=payload,
            headers={"X-API-Key": api_key},
        )
    except error.HTTPError as exc:  # pragma: no cover - reporting en CLI
        return ReservationResult(service_id, professional_id, start, None, None, False, f"/reservations {exc}")

    reservation_id = create_resp.get("reservation_id")
    google_event_id = create_resp.get("google_event_id")
    ok = bool(create_resp.get("ok")) and bool(reservation_id)
    if not ok:
        return ReservationResult(
            service_id,
            professional_id,
            start,
            reservation_id,
            google_event_id,
            False,
            "Respuesta inesperada al crear la reserva",
        )

    return ReservationResult(
        service_id,
        professional_id,
        start,
        reservation_id,
        google_event_id,
        google_event_id is not None,
        None if google_event_id else "google_event_id ausente",
    )


def cancel_reservation(base: str, api_key: str, reservation_id: str) -> Dict:
    return _delete(base, f"/reservations/{reservation_id}", headers={"X-API-Key": api_key})


def check_conflicts(base: str, api_key: str, day: date) -> Dict:
    return _json_request(
        base,
        "/admin/conflicts",
        payload={
            "start": day.isoformat(),
            "end": day.isoformat(),
        },
        headers={"X-API-Key": api_key},
    )


def stress_test(
    base: str,
    api_key: str,
    professional_id: str,
    service_id: str,
    days_ahead: int,
    iterations: int,
) -> Dict:
    successes = 0
    failures: List[str] = []
    date_str = next_workday(days_ahead).isoformat()
    for idx in range(iterations):
        try:
            slots_resp = _json_request(
                base,
                "/slots",
                payload={
                    "service_id": service_id,
                    "professional_id": professional_id,
                    "date_str": date_str,
                },
            )
            slots: List[str] = slots_resp.get("slots") or []
            if not slots:
                failures.append(f"Iteración {idx+1}: sin huecos disponibles")
                break

            start = slots[idx % len(slots)]
            payload = {
                "service_id": service_id,
                "professional_id": professional_id,
                "start": start,
                "customer_name": CUSTOMER_NAME,
                "customer_phone": CUSTOMER_PHONE,
                "customer_email": CUSTOMER_EMAIL,
            }
            if CUSTOMER_NOTES:
                payload["customer_notes"] = CUSTOMER_NOTES

            create_resp = _json_request(
                base,
                "/reservations",
                payload=payload,
                headers={"X-API-Key": api_key},
            )
            reservation_id = create_resp.get("reservation_id")
            google_event_id = create_resp.get("google_event_id")
            if not (create_resp.get("ok") and reservation_id and google_event_id):
                failures.append(f"Iteración {idx+1}: respuesta inválida {create_resp}")
                break

            cancel_reservation(base, api_key, reservation_id)
            successes += 1
            time.sleep(0.15)
        except error.HTTPError as exc:  # pragma: no cover - CLI
            failures.append(f"Iteración {idx+1}: HTTPError {exc}")
            break
    return {
        "iterations": iterations,
        "successes": successes,
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Valida servicios y ejecuta estrés contra el backend")
    parser.add_argument("--base", default=os.getenv("BASE", "http://127.0.0.1:8776"))
    parser.add_argument("--api-key", default=os.getenv("API_KEY"))
    parser.add_argument("--days-ahead", type=int, default=int(os.getenv("DAYS_AHEAD", "10")))
    parser.add_argument("--keep", action="store_true", help="No cancelar las reservas creadas")
    parser.add_argument("--stress", type=int, default=0, help="Iteraciones para prueba de estrés")
    parser.add_argument("--stress-service", default="corte_cabello")
    parser.add_argument("--stress-pro", default="deinis")
    args = parser.parse_args()

    if not args.api_key:
        parser.error("Se requiere --api-key o variable de entorno API_KEY")

    base = args.base.rstrip("/")
    api_key = args.api_key
    days_ahead = args.days_ahead

    print(json.dumps({"accion": "validacion_servicios", "fecha": date.today().isoformat()}))

    results: List[ReservationResult] = []
    for professional in PROS:
        for service_id in professional.services:
            if service_id not in SERVICE_BY_ID:
                results.append(
                    ReservationResult(
                        service_id,
                        professional.id,
                        None,
                        None,
                        None,
                        False,
                        "Servicio inexistente en catálogo",
                    )
                )
                continue

            result = validate_service(base, api_key, professional.id, service_id, days_ahead)
            results.append(result)
            payload = {
                "service_id": service_id,
                "professional_id": professional.id,
                "start": result.start,
                "ok": result.ok,
                "reservation_id": result.reservation_id,
                "google_event_id": result.google_event_id,
                "error": result.error,
            }
            print(json.dumps({"resultado": payload}))

            if result.ok and result.reservation_id and not args.keep:
                cancel_resp = cancel_reservation(base, api_key, result.reservation_id)
                print(json.dumps({"cancelacion": cancel_resp}))

    all_ok = all(r.ok for r in results)
    if all_ok:
        day = next_workday(days_ahead)
        conflicts = check_conflicts(base, api_key, day)
        print(json.dumps({"conflictos": conflicts}))

    if args.stress > 0:
        stress_summary = stress_test(
            base,
            api_key,
            args.stress_pro,
            args.stress_service,
            days_ahead,
            args.stress,
        )
        print(json.dumps({"stress": stress_summary}))

    resumen = {
        "total": len(results),
        "exitos": sum(1 for r in results if r.ok),
        "fallos": [
            {
                "service_id": r.service_id,
                "professional_id": r.professional_id,
                "motivo": r.error,
            }
            for r in results
            if not r.ok
        ],
    }
    print(json.dumps({"resumen": resumen}))


if __name__ == "__main__":
    main()
