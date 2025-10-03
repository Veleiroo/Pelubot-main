from __future__ import annotations
import logging
import os
from typing import Dict, List, Optional
from datetime import time
"""Catálogo de servicios, profesionales y configuración horaria."""

from app.models import Service, Professional

logger = logging.getLogger("pelubot.data")

# Servicios disponibles
SERVICES: List[Service] = [
    Service(id="corte_cabello", name="Corte de cabello", duration_min=30, price_eur=13.0),
    Service(id="corte_barba", name="Corte + arreglo de barba", duration_min=45, price_eur=18.0),
    Service(id="arreglo_barba", name="Arreglo de barba", duration_min=15, price_eur=10.0),
    Service(id="corte_jubilado", name="Corte de jubilado", duration_min=30, price_eur=7.0),
]

# Profesionales y servicios que prestan (defaults para despliegues sin BD)
_PROS_DEFAULT: List[Professional] = [
    Professional(id="deinis", name="Deinis Barber", services=["corte_cabello", "corte_barba", "arreglo_barba", "corte_jubilado"]),
]


def _load_stylist_rows() -> Optional[List[object]]:
    """Intenta leer estilistas activos desde la base de datos."""
    try:
        from sqlmodel import Session, select
        from app.db import engine
        from app.models import StylistDB
    except Exception as exc:  # pragma: no cover - import/runtime guard
        logger.debug("No se pudo importar dependencias de BD para estilistas: %s", exc)
        return None

    try:
        with Session(engine) as session:
            rows = session.exec(select(StylistDB).where(StylistDB.is_active == True)).all()  # noqa: E712
            return rows or None
    except Exception as exc:  # pragma: no cover - BD no inicializada o en test
        logger.debug("No se pudieron cargar estilistas desde BD: %s", exc)
        return None


_STYLIST_ROWS = _load_stylist_rows()

PROS: List[Professional] = (
    [
        Professional(
            id=row.id,
            name=row.display_name or row.name,
            services=row.services or [],
        )
        for row in _STYLIST_ROWS
    ]
    if _STYLIST_ROWS
    else _PROS_DEFAULT
)

# Índices rápidos
SERVICE_BY_ID: Dict[str, Service] = {s.id: s for s in SERVICES}
PRO_BY_ID: Dict[str, Professional] = {p.id: p for p in PROS}

# Horario semanal
WEEKLY_SCHEDULE = {
    0: [(time(10, 0), time(14, 0)), (time(16, 0), time(20, 0))],
    1: [(time(10, 0), time(14, 0)), (time(16, 0), time(20, 0))],
    2: [(time(10, 0), time(14, 0)), (time(16, 0), time(20, 0))],
    3: [(time(10, 0), time(14, 0)), (time(16, 0), time(20, 0))],
    4: [(time(10, 0), time(14, 0)), (time(16, 0), time(20, 0))],
    5: [(time(10, 0), time(14, 0))],
    6: [],
}

# Mapa profesional → calendario (IDs reales)
_default_calendar = os.getenv("GCAL_CALENDAR_ID", "deinis-barber@example.com")
if _STYLIST_ROWS:
    PRO_CALENDAR: Dict[str, str] = {
        row.id: (row.calendar_id or os.getenv(f"PRO_{row.id.upper()}_CALENDAR_ID", _default_calendar))
        for row in _STYLIST_ROWS
    }
    PRO_USE_GCAL_BUSY: Dict[str, bool] = {
        row.id: bool(row.use_gcal_busy) for row in _STYLIST_ROWS
    }
else:
    PRO_CALENDAR: Dict[str, str] = {
        "deinis": os.getenv("PRO_DEINIS_CALENDAR_ID", _default_calendar),
    }
    PRO_USE_GCAL_BUSY: Dict[str, bool] = {"deinis": False}
