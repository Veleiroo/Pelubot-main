"""Catálogo dinámico de servicios y profesionales.

Las utilidades consultan la base de datos en caliente (con caché configurable)
para obtener servicios activos, estilistas y calendarios asociados. Cuando las
tablas están vacías, se inicializan con valores por defecto para mantener la
compatibilidad con el MVP.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager
from datetime import time as dt_time
from typing import Dict, Iterable, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import Professional, Service, ServiceCatalogDB, StylistDB

logger = logging.getLogger("pelubot.data")


_CACHE_TTL_SECONDS = max(5, int(os.getenv("CATALOG_CACHE_SECONDS", "30")))

_DEFAULT_SERVICES_DATA: List[Dict[str, object]] = [
    {"id": "corte_cabello", "name": "Corte de cabello", "duration_min": 30, "price_eur": 13.0},
    {"id": "corte_barba", "name": "Corte + arreglo de barba", "duration_min": 45, "price_eur": 18.0},
    {"id": "arreglo_barba", "name": "Arreglo de barba", "duration_min": 15, "price_eur": 10.0},
    {"id": "corte_jubilado", "name": "Corte de jubilado", "duration_min": 30, "price_eur": 7.0},
]


def _default_services_payload() -> Dict[str, object]:
    services = [Service(**data) for data in _DEFAULT_SERVICES_DATA]
    service_by_id = {s.id: s for s in services}
    return {"services": services, "service_by_id": service_by_id}


def _clone_service(service: Service) -> Service:
    copy_fn = getattr(service, "model_copy", None)
    if callable(copy_fn):
        return copy_fn()
    dump_fn = getattr(service, "model_dump", None)
    payload = dump_fn() if callable(dump_fn) else service.dict()  # type: ignore[attr-defined]
    return Service(**payload)


_services_state = {
    "expires_at": 0.0,
    "data": None,
}


def invalidate_services_cache() -> None:
    """Invalida el caché de servicios."""

    _services_state["expires_at"] = 0.0
    _services_state["data"] = None


def _services_from_rows(rows: List[ServiceCatalogDB]) -> Dict[str, object]:
    active_services: List[Service] = []
    by_id: Dict[str, Service] = {}
    for row in rows:
        if not row.is_active:
            continue
        service = Service(
            id=row.id,
            name=row.name,
            duration_min=row.duration_min,
            price_eur=row.price_eur,
        )
        active_services.append(service)
        by_id[service.id] = service
    if not active_services:
        payload = _default_services_payload()
        return payload
    return {"services": active_services, "service_by_id": by_id}


def _seed_default_services(session: Session) -> List[ServiceCatalogDB]:
    """Inserta servicios por defecto cuando la tabla está vacía."""

    defaults = [
        ServiceCatalogDB(
            id=data["id"],
            name=data["name"],
            duration_min=int(data["duration_min"]),  # type: ignore[arg-type]
            price_eur=float(data["price_eur"]),  # type: ignore[arg-type]
            sort_order=index,
            is_active=True,
        )
        for index, data in enumerate(_DEFAULT_SERVICES_DATA)
    ]
    session.add_all(defaults)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
    return defaults


def _build_services(session: Session) -> Dict[str, object]:
    rows = session.exec(
        select(ServiceCatalogDB).order_by(ServiceCatalogDB.sort_order, ServiceCatalogDB.name)
    ).all()
    if not rows:
        try:
            rows = _seed_default_services(session)
        except Exception:
            logger.exception("No se pudo inicializar el catálogo de servicios; usando valores por defecto")
            return _default_services_payload()
    return _services_from_rows(rows)


def _load_services(session: Optional[Session] = None, *, use_cache: bool = True) -> Dict[str, object]:
    if use_cache:
        expires_at: float = _services_state.get("expires_at", 0.0) or 0.0
        data = _services_state.get("data")
        if data is not None and _monotonic() < expires_at:
            return data  # type: ignore[return-value]

    with _session_scope(session) as scoped:
        try:
            data = _build_services(scoped)
        except Exception:
            logger.exception("Fallo al cargar servicios desde la base de datos")
            data = _default_services_payload()

    _services_state["data"] = data
    _services_state["expires_at"] = _monotonic() + _CACHE_TTL_SECONDS
    return data


def get_services(*, session: Optional[Session] = None, use_cache: bool = True) -> List[Service]:
    """Devuelve la lista de servicios activos."""

    data = _load_services(session=session, use_cache=use_cache)
    return [_clone_service(service) for service in data["services"]]


def get_service_by_id(
    service_id: str,
    *,
    session: Optional[Session] = None,
    use_cache: bool = True,
) -> Service:
    """Obtiene un servicio por su ID."""

    data = _load_services(session=session, use_cache=use_cache)
    service = data["service_by_id"].get(service_id)
    if service is None:
        raise KeyError(f"Servicio {service_id!r} no encontrado")
    return _clone_service(service)


def get_service_map(*, session: Optional[Session] = None, use_cache: bool = True) -> Dict[str, Service]:
    """Devuelve un mapa ID -> servicio activo."""

    data = _load_services(session=session, use_cache=use_cache)
    return {svc_id: _clone_service(svc) for svc_id, svc in data["service_by_id"].items()}


WEEKLY_SCHEDULE = {
    0: [(dt_time(10, 0), dt_time(14, 0)), (dt_time(16, 0), dt_time(20, 0))],
    1: [(dt_time(10, 0), dt_time(14, 0)), (dt_time(16, 0), dt_time(20, 0))],
    2: [(dt_time(10, 0), dt_time(14, 0)), (dt_time(16, 0), dt_time(20, 0))],
    3: [(dt_time(10, 0), dt_time(14, 0)), (dt_time(16, 0), dt_time(20, 0))],
    4: [(dt_time(10, 0), dt_time(14, 0)), (dt_time(16, 0), dt_time(20, 0))],
    5: [(dt_time(10, 0), dt_time(14, 0))],
    6: [],
}


# ---------------------------------------------------------------------------
# Profesionales dinámicos con caché
# ---------------------------------------------------------------------------

_DEFAULT_PROFESSIONALS: List[Professional] = [
    Professional(
        id="deinis",
        name="Deinis Barber",
        services=[data["id"] for data in _DEFAULT_SERVICES_DATA],
    )
]

_DEFAULT_CALENDAR = os.getenv("GCAL_CALENDAR_ID", os.getenv("GCAL_TEST_CALENDAR_ID", "pelubot.test@gmail.com"))
_DEFAULT_USES_GCAL = False

_catalog_state = {
    "expires_at": 0.0,
    "data": None,
}


def _monotonic() -> float:
    return time.monotonic()


@contextmanager
def _session_scope(session: Optional[Session]):
    if session is not None:
        yield session
        return
    created = Session(engine)
    try:
        yield created
    finally:
        created.close()


def invalidate_catalog_cache() -> None:
    """Invalida los cachés de servicios y profesionales."""

    invalidate_services_cache()
    _catalog_state["expires_at"] = 0.0
    _catalog_state["data"] = None


def _resolve_services(row: StylistDB, default_service_ids: List[str]) -> List[str]:
    user_services = [s for s in (row.services or []) if isinstance(s, str)]
    if user_services:
        return user_services
    return list(default_service_ids)


def _calendar_for(row_id: str, calendar_id: Optional[str]) -> str:
    env_key = f"PRO_{row_id.upper()}_CALENDAR_ID"
    return calendar_id or os.getenv(env_key, _DEFAULT_CALENDAR)


def _build_catalog(session: Session) -> Dict[str, object]:
    service_data = _load_services(session=session)
    default_service_ids = list(service_data["service_by_id"].keys())
    if not default_service_ids:
        default_service_ids = [data["id"] for data in _DEFAULT_SERVICES_DATA]

    rows: List[StylistDB] = session.exec(select(StylistDB).where(StylistDB.is_active == True)).all()  # noqa: E712
    if not rows:
        pros = list(_DEFAULT_PROFESSIONALS)
        calendars = {p.id: _calendar_for(p.id, None) for p in pros}
        use_gcal = {p.id: _DEFAULT_USES_GCAL for p in pros}
    else:
        pros = []
        calendars: Dict[str, str] = {}
        use_gcal: Dict[str, bool] = {}
        for row in rows:
            pro = Professional(
                id=row.id,
                name=row.display_name or row.name,
                services=_resolve_services(row, default_service_ids),
            )
            pros.append(pro)
            calendars[row.id] = _calendar_for(row.id, row.calendar_id)
            use_gcal[row.id] = bool(row.use_gcal_busy)

    pro_by_id = {pro.id: pro for pro in pros}
    return {
        "pros": pros,
        "pro_by_id": pro_by_id,
        "calendars": calendars,
        "use_gcal": use_gcal,
    }


def _load_catalog(session: Optional[Session] = None, *, use_cache: bool = True) -> Dict[str, object]:
    if use_cache:
        expires_at: float = _catalog_state.get("expires_at", 0.0) or 0.0
        data = _catalog_state.get("data")
        if data is not None and _monotonic() < expires_at:
            return data  # type: ignore[return-value]

    with _session_scope(session) as scoped:
        try:
            data = _build_catalog(scoped)
        except Exception:
            logger.exception("No se pudo cargar el catálogo de estilistas; usando valores por defecto")
            data = _build_catalog_from_defaults()

    _catalog_state["data"] = data
    _catalog_state["expires_at"] = _monotonic() + _CACHE_TTL_SECONDS
    return data


def _build_catalog_from_defaults() -> Dict[str, object]:
    calendars = {p.id: _calendar_for(p.id, None) for p in _DEFAULT_PROFESSIONALS}
    use_gcal = {p.id: _DEFAULT_USES_GCAL for p in _DEFAULT_PROFESSIONALS}
    pro_by_id = {p.id: p for p in _DEFAULT_PROFESSIONALS}
    return {
        "pros": list(_DEFAULT_PROFESSIONALS),
        "pro_by_id": pro_by_id,
        "calendars": calendars,
        "use_gcal": use_gcal,
    }


def get_active_professionals(
    *, session: Optional[Session] = None, use_cache: bool = True
) -> List[Professional]:
    """Devuelve la lista de profesionales activos (con caché)."""

    data = _load_catalog(session, use_cache=use_cache)
    return list(data["pros"])


def get_professional_by_id(
    pro_id: str,
    *,
    session: Optional[Session] = None,
    use_cache: bool = True,
) -> Optional[Professional]:
    data = _load_catalog(session, use_cache=use_cache)
    pro = data["pro_by_id"].get(pro_id)
    return pro  # type: ignore[return-value]


def get_professional_ids(*, session: Optional[Session] = None, use_cache: bool = True) -> List[str]:
    return [pro.id for pro in get_active_professionals(session=session, use_cache=use_cache)]


def get_professional_calendars(
    *, session: Optional[Session] = None, use_cache: bool = True
) -> Dict[str, str]:
    data = _load_catalog(session, use_cache=use_cache)
    return dict(data["calendars"])


def calendar_for_professional(
    pro_id: str,
    *, session: Optional[Session] = None, use_cache: bool = True
) -> str:
    calendars = get_professional_calendars(session=session, use_cache=use_cache)
    return calendars.get(pro_id, _DEFAULT_CALENDAR)


def professional_uses_gcal_busy(
    pro_id: str,
    *, session: Optional[Session] = None, use_cache: bool = True
) -> bool:
    data = _load_catalog(session, use_cache=use_cache)
    use_gcal: Dict[str, bool] = data["use_gcal"]  # type: ignore[assignment]
    return use_gcal.get(pro_id, _DEFAULT_USES_GCAL)


def professionals_using_gcal(
    *, session: Optional[Session] = None, use_cache: bool = True
) -> Dict[str, bool]:
    data = _load_catalog(session, use_cache=use_cache)
    return dict(data["use_gcal"])


def iter_professional_calendars(
    *, session: Optional[Session] = None, use_cache: bool = True
) -> Iterable[tuple[str, str]]:
    calendars = get_professional_calendars(session=session, use_cache=use_cache)
    return calendars.items()
