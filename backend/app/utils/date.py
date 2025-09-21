"""Herramientas de fechas con zona horaria consistente para PeluBot."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")

MAX_AHEAD_DAYS = 183  # ~6 meses


def now_tz() -> datetime:
    """Devuelve la fecha/hora actual en la zona configurada."""
    return datetime.now(TZ)


def validate_target_dt(dt: datetime) -> None:
    """Verifica que la fecha esté en el futuro y dentro del rango permitido."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    _now = now_tz()
    if dt < _now:
        raise ValueError("La fecha/hora está en el pasado.")
    if dt > _now + timedelta(days=MAX_AHEAD_DAYS):
        raise ValueError("La fecha/hora excede el límite de 6 meses.")
