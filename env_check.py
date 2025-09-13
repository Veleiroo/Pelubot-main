#!/usr/bin/env python3
"""Validador simple de variables de entorno para Pelubot.

Comprueba la presencia de variables necesarias y reporta las faltantes.
No muestra valores de secretos.
"""
import os
import sys
from pathlib import Path

REQUIRED = [
    "API_KEY",
    "TZ",
    "ORIGINS",
    "GCAL_CALENDAR_ID",
]

EITHER = (
    "GOOGLE_OAUTH_JSON",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
)

def main() -> int:
    missing = [var for var in REQUIRED if not os.getenv(var)]
    if not any(os.getenv(v) for v in EITHER):
        missing.append("GOOGLE_OAUTH_JSON or GOOGLE_SERVICE_ACCOUNT_JSON")

    if missing:
        print("Faltan variables:")
        for name in missing:
            print(f"- {name}")
        return 1

    db_url = os.getenv("DATABASE_URL", "")
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        if not Path(db_path).exists():
            print(f"Aviso: no se encontró la base SQLite en {db_path}")

    print("Entorno correcto.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
