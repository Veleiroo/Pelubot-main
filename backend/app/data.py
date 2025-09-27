from __future__ import annotations
import os
from typing import List, Dict
from datetime import time
"""Catálogo estático de servicios, profesionales y configuración horaria."""

from app.models import Service, Professional

# Servicios disponibles
SERVICES: List[Service] = [
    Service(id="corte_cabello", name="Corte de cabello", duration_min=30, price_eur=13.0),
    Service(id="corte_barba", name="Corte + arreglo de barba", duration_min=45, price_eur=18.0),
    Service(id="arreglo_barba", name="Arreglo de barba", duration_min=15, price_eur=10.0),
    Service(id="corte_jubilado", name="Corte de jubilado", duration_min=30, price_eur=7.0),
]

# Profesionales y servicios que prestan (temporal hasta actualizar asignaciones)
PROS: List[Professional] = [
    Professional(id="deinis", name="Deinis Barber", services=["corte_cabello", "corte_barba", "arreglo_barba", "corte_jubilado"]),
]

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
PRO_CALENDAR: Dict[str, str] = {
    "deinis": os.getenv("PRO_DEINIS_CALENDAR_ID", _default_calendar),
}

# Uso de busy de GCAL por profesional (se desactiva por defecto)
PRO_USE_GCAL_BUSY: Dict[str, bool] = {"deinis": False}
