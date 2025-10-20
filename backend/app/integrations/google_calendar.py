from __future__ import annotations
from typing import Dict, Any, Optional, List

from pathlib import Path

from dotenv import load_dotenv

_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"
if _ROOT_ENV.exists():
    load_dotenv(dotenv_path=_ROOT_ENV, override=False)
else:
    load_dotenv(override=False)

from google.oauth2.service_account import Credentials as SA
from google.oauth2.credentials import Credentials as UserCreds
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

import base64
import json
import os
from datetime import datetime, timedelta, timezone
import logging
import threading
import time
import httplib2

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

SCOPES = ["https://www.googleapis.com/auth/calendar"]

logger = logging.getLogger("pelubot.integrations.google_calendar")

# Cliente de Calendar aislado por hilo (evita compartir conexiones entre workers)
_thread_local = threading.local()

def _get_cached_service() -> Optional[Any]:
    return getattr(_thread_local, "svc", None)

def _set_cached_service(svc: Any | None) -> None:
    if svc is None and hasattr(_thread_local, "svc"):
        delattr(_thread_local, "svc")
        return
    _thread_local.svc = svc

GCAL_HTTP_TIMEOUT = float(os.getenv("GCAL_HTTP_TIMEOUT", "8"))
GCAL_HTTP_RETRIES = int(os.getenv("GCAL_HTTP_RETRIES", "1"))
GCAL_HTTP_RETRY_WAIT = float(os.getenv("GCAL_HTTP_RETRY_WAIT", "0.6"))

def iso_datetime(dt_or_str, tz: str = "Europe/Madrid") -> str:
    """
    Devuelve ISO 8601 con zona horaria real (RFC3339).
    Acepta datetime o string. Si no trae TZ, aplica ZoneInfo.
    """
    if isinstance(dt_or_str, datetime):
        dt = dt_or_str
        if dt.tzinfo is None and ZoneInfo:
            dt = dt.replace(tzinfo=ZoneInfo(tz))
        return dt.isoformat()
    s = str(dt_or_str).strip()
    if s.endswith("Z") or ("+" in s[10:] or "-" in s[10:]):
        return s
    fmt = "%Y-%m-%dT%H:%M:%S" if len(s) == 19 else "%Y-%m-%dT%H:%M"
    dt = datetime.strptime(s, fmt)
    if ZoneInfo:
        dt = dt.replace(tzinfo=ZoneInfo(tz))
        return dt.isoformat()
    return s + "+02:00"

def _load_sa_creds() -> Optional[SA]:
    """Carga credenciales de service account desde env (JSON o base64) o ruta."""
    sa_json_b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64")
    if sa_json_b64:
        try:
            decoded = base64.b64decode(sa_json_b64).decode("utf-8")
            info = json.loads(decoded)
        except Exception:
            return None
    else:
        sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_PATH")
        if not sa_json:
            return None
        if sa_json.strip().startswith("{"):
            info = json.loads(sa_json)
        else:
            with open(sa_json, "r", encoding="utf-8") as fh:
                info = json.load(fh)
    creds = SA.from_service_account_info(info, scopes=SCOPES)
    subject = os.getenv("GOOGLE_IMPERSONATE_EMAIL")
    if subject:
        creds = creds.with_subject(subject)
    return creds

def _load_user_creds() -> Optional[UserCreds]:
    """Carga credenciales OAuth de usuario y refresca tokens expirados."""
    from pathlib import Path

    raw_oauth = (os.getenv("GOOGLE_OAUTH_JSON") or "").strip()
    here = Path(__file__).resolve().parent
    backend_root = here.parent

    def _expand_candidates(items):
        expanded = []
        for cand in items:
            try:
                if cand.is_dir():
                    expanded.extend(sorted(cand.glob("*.json")))
                else:
                    expanded.append(cand)
            except Exception:
                continue
        return expanded

    info_path: Optional[Path] = None
    info: Dict | None = None

    if not raw_oauth:
        candidates: List[Path] = [backend_root / "oauth_tokens.json"]
        candidates.extend(sorted((backend_root / "tmp").glob("*.json")))
        for cand in candidates:
            try:
                if cand.exists():
                    info_path = cand
                    break
            except Exception:
                continue
        if info_path is None:
            return None
        info = json.loads(info_path.read_text(encoding="utf-8"))
    elif raw_oauth.startswith("{"):
        info = json.loads(raw_oauth)
    else:
        p = Path(raw_oauth)
        candidates: List[Path] = []
        if p.is_absolute():
            candidates.append(p)
        else:
            cwd = Path(os.getcwd())
            candidates.extend(
                [
                    cwd / p,
                    backend_root / p,
                    backend_root / "tmp" / p.name,
                    here / p,
                    here / p.name,
                ]
            )
        for cand in _expand_candidates(candidates):
            try:
                if cand.exists():
                    info_path = cand
                    break
            except Exception:
                continue
        if info_path is None:
            return None
        info = json.loads(info_path.read_text(encoding="utf-8"))

    if info is None:
        return None
    creds = UserCreds.from_authorized_user_info(info, SCOPES)
    if creds:
        try:
            needs_refresh = bool(getattr(creds, "expired", False))
            expiry = getattr(creds, "expiry", None)
            if not needs_refresh and expiry:
                threshold = datetime.now(timezone.utc) + timedelta(minutes=5)
                try:
                    if expiry.tzinfo is None:
                        expiry = expiry.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
                if expiry and expiry <= threshold:
                    needs_refresh = True
            if needs_refresh and getattr(creds, "refresh_token", None):
                creds.refresh(Request())
                if info_path:
                    info_path.write_text(creds.to_json(), encoding="utf-8")
        except Exception:
            pass
    return creds

class _FakeFreebusy:
    """Simula la operación freebusy del cliente oficial."""
    def __init__(self):
        self._body = None
    def query(self, body):
        self._body = body
        return self
    def execute(self):
        calendars = {}
        try:
            items = (self._body or {}).get("items", [])
            if items:
                for it in items:
                    cal_id = it.get("id") or "primary"
                    calendars[cal_id] = {"busy": []}
        except Exception:
            calendars["primary"] = {"busy": []}
        return {"calendars": calendars}

class _FakeEventsOp:
    """Replica el wrapper de resultados con método `execute()`."""
    def __init__(self, result):
        self._result = result
    def execute(self):
        return self._result

class _FakeEvents:
    """Expone operaciones básicas de eventos sobre un diccionario en memoria."""
    def __init__(self, store: dict):
        self._store = store
    def insert(self, calendarId: str, body: dict):
        event_id = f"fake-{len(self._store) + 1}"
        self._store[event_id] = {**body, "id": event_id, "calendarId": calendarId}
        return _FakeEventsOp({"id": event_id})
    def patch(self, calendarId: str, eventId: str, body: dict):
        ev = self._store.get(eventId, {"id": eventId, "calendarId": calendarId})
        ev.update(body)
        self._store[eventId] = ev
        return _FakeEventsOp({"id": eventId})
    def delete(self, calendarId: str, eventId: str):
        self._store.pop(eventId, None)
        return _FakeEventsOp({})
    def list(self, calendarId: str, timeMin: str, timeMax: str, singleEvents: bool = True, orderBy: str = "startTime", pageToken: Optional[str] = None, timeZone: Optional[str] = None):
        return _FakeEventsOp({"items": []})

class FakeCalendarService:
    """Cliente falso para tests y modo demo."""
    def __init__(self):
        self._events_store: dict[str, dict] = {}
    def freebusy(self):
        return _FakeFreebusy()
    def events(self):
        return _FakeEvents(self._events_store)
    def calendarList(self):
        class _CL:
            def list(self_inner):
                return _FakeEventsOp({"items": []})
        return _CL()

def _build_http_client() -> httplib2.Http:
    """Crea cliente HTTP con timeout configurable."""
    return httplib2.Http(timeout=GCAL_HTTP_TIMEOUT, disable_ssl_certificate_validation=False)

def _reset_thread_client() -> None:
    """Elimina el cliente cacheado para forzar reconstrucción tras fallo."""
    _set_cached_service(None)

def _call_with_retry(op: callable, action: str) -> Any:
    """Ejecuta la llamada al API con retry ligero y reseteo de cliente."""
    attempts = GCAL_HTTP_RETRIES + 1
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return op()
        except Exception as exc:
            last_exc = exc
            logger.warning("Google Calendar %s falló (intento %s/%s): %s", action, attempt, attempts, exc)
            _reset_thread_client()
            if attempt < attempts:
                time.sleep(GCAL_HTTP_RETRY_WAIT)
                continue
            break
    raise RuntimeError(f"Error {action}: {last_exc}") from last_exc

def build_calendar() -> Any:
    """
    Crea el cliente de Calendar priorizando Service Account y fallback OAuth.
    En pytest o con PELUBOT_FAKE_GCAL=1 devuelve cliente falso.
    """
    if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("PELUBOT_FAKE_GCAL") == "1":
        return FakeCalendarService()
    cached = _get_cached_service()
    if cached is not None:
        return cached
    try:
        sa = _load_sa_creds()
        if sa:
            svc = build("calendar", "v3", credentials=sa, http=_build_http_client(), cache_discovery=False)
            _set_cached_service(svc)
            return svc
        oa = _load_user_creds()
        if oa:
            svc = build("calendar", "v3", credentials=oa, http=_build_http_client(), cache_discovery=False)
            _set_cached_service(svc)
            return svc
    except Exception as e:
        if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("PELUBOT_FAKE_GCAL") == "1":
            return FakeCalendarService()
        _reset_thread_client()
        raise RuntimeError(f"Error al crear cliente de Google Calendar: {e}")
    if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("PELUBOT_FAKE_GCAL") == "1":
        return FakeCalendarService()
    raise RuntimeError("No hay credenciales. Exporta GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_OAUTH_JSON")

def freebusy(service: Any, calendar_id: str, time_min_iso: str, time_max_iso: str, tz: str = "Europe/Madrid") -> List[Dict[str, str]]:
    """Consulta intervalos ocupados para un calendario concreto."""
    body = {"timeMin": iso_datetime(time_min_iso, tz), "timeMax": iso_datetime(time_max_iso, tz), "timeZone": tz, "items": [{"id": calendar_id}]}
    try:
        fb = service.freebusy().query(body=body).execute()
        cals = fb.get("calendars", {})
        return cals.get(calendar_id, {}).get("busy", [])
    except Exception as e:
        raise RuntimeError(f"Error consultando freebusy: {e}")

def freebusy_multi(service: Any, calendar_ids: list[str], time_min_iso: str, time_max_iso: str, tz: str = "Europe/Madrid") -> Dict[str, List[Dict[str, str]]]:
    """Consulta freebusy para varios calendarios en una sola llamada. Devuelve map cal_id -> busy[]."""
    items = [{"id": cid} for cid in calendar_ids]
    body = {"timeMin": iso_datetime(time_min_iso, tz), "timeMax": iso_datetime(time_max_iso, tz), "timeZone": tz, "items": items}
    try:
        fb = service.freebusy().query(body=body).execute()
        cals = fb.get("calendars", {})
        out: Dict[str, List[Dict[str, str]]] = {}
        for cid in calendar_ids:
            out[cid] = cals.get(cid, {}).get("busy", [])
        return out
    except Exception as e:
        raise RuntimeError(f"Error consultando freebusy (multi): {e}")

def list_calendars(service: Any) -> List[Dict[str, Any]]:
    """Obtiene la lista de calendarios accesibles con las credenciales activas."""
    try:
        return service.calendarList().list().execute().get("items", [])
    except Exception as e:
        raise RuntimeError(f"Error listando calendarios: {e}")

def create_event(service: Any, calendar_id: str, start_dt, end_dt, summary: str, private_props: Dict[str, str] = None, description: Optional[str] = None, color_id: Optional[str] = None, tz: str = "Europe/Madrid") -> Dict[str, Any]:
    """Inserta un evento en Google Calendar incluyendo metadatos privados de PeluBot."""
    if private_props is None:
        private_props = {}
    body = {
        "summary": summary,
        "start": {"dateTime": iso_datetime(start_dt, tz), "timeZone": tz},
        "end": {"dateTime": iso_datetime(end_dt, tz), "timeZone": tz},
        "extendedProperties": {"private": private_props},
    }
    if description:
        body["description"] = description
    if color_id:
        body["colorId"] = color_id
    try:
        return _call_with_retry(lambda: service.events().insert(calendarId=calendar_id, body=body).execute(), "creando evento")
    except Exception as e:
        raise RuntimeError(f"Error creando evento: {e}")

def patch_event(service: Any, calendar_id: str, event_id: str, start_dt, end_dt, tz: str = "Europe/Madrid") -> Dict[str, Any]:
    """Actualiza las franjas de inicio y fin de un evento existente."""
    body = {
        "start": {"dateTime": iso_datetime(start_dt, tz), "timeZone": tz},
        "end": {"dateTime": iso_datetime(end_dt, tz), "timeZone": tz},
    }
    try:
        return _call_with_retry(lambda: service.events().patch(calendarId=calendar_id, eventId=event_id, body=body).execute(), "modificando evento")
    except Exception as e:
        raise RuntimeError(f"Error modificando evento: {e}")

def delete_event(service: Any, calendar_id: str, event_id: str) -> None:
    """Elimina un evento concreto, propagando el error si ocurre."""
    try:
        _call_with_retry(lambda: service.events().delete(calendarId=calendar_id, eventId=event_id).execute(), "eliminando evento")
    except Exception as e:
        raise RuntimeError(f"Error eliminando evento: {e}")

def list_events_range(service: Any, calendar_id: str, time_min_iso: str, time_max_iso: str, tz: str = "Europe/Madrid") -> List[Dict[str, Any]]:
    """Lista eventos de un calendario en el rango dado (una sola página)."""
    try:
        resp = service.events().list(calendarId=calendar_id, timeMin=iso_datetime(time_min_iso, tz), timeMax=iso_datetime(time_max_iso, tz), singleEvents=True, orderBy="startTime", timeZone=tz).execute()
        return resp.get("items", [])
    except Exception as e:
        raise RuntimeError(f"Error listando eventos: {e}")

def list_events_allpages(service: Any, calendar_id: str, time_min: Optional[str] = None, time_max: Optional[str] = None, tz: str = "Europe/Madrid") -> List[Dict[str, Any]]:
    """Obtiene todos los eventos paginando hasta consumir el rango indicado."""
    params = {"calendarId": calendar_id}
    if time_min or time_max:
        if time_min:
            params["timeMin"] = iso_datetime(time_min, tz)
        if time_max:
            params["timeMax"] = iso_datetime(time_max, tz)
        params.update({"singleEvents": True, "orderBy": "startTime", "timeZone": tz})
    else:
        params.update({"timeMin": "1970-01-01T00:00:00+00:00", "timeMax": "2100-01-01T00:00:00+00:00", "singleEvents": True, "orderBy": "startTime", "timeZone": tz})
    items: List[Dict[str, Any]] = []
    page_token: Optional[str] = None
    try:
        while True:
            if page_token:
                params["pageToken"] = page_token
            resp = service.events().list(**params).execute()
            items.extend(resp.get("items", []))
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
    except Exception as e:
        raise RuntimeError(f"Error listando eventos (paginado): {e}")
    return items

def clear_calendar(service: Any, calendar_id: str, time_min: Optional[str] = None, time_max: Optional[str] = None, only_pelubot: bool = False, dry_run: bool = False, tz: str = "Europe/Madrid") -> Dict[str, Any]:
    """Elimina eventos de un calendario con filtros opcionales y modo simulación."""
    items = list_events_allpages(service, calendar_id, time_min, time_max, tz)
    deleted = skipped = 0
    for it in items:
        ev_id = it.get("id")
        if not ev_id:
            continue
        if only_pelubot:
            priv = (it.get("extendedProperties") or {}).get("private") or {}
            if not priv.get("reservation_id"):
                skipped += 1
                continue
        if not dry_run:
            try:
                service.events().delete(calendarId=calendar_id, eventId=ev_id).execute()
            except Exception:
                skipped += 1
                continue
        deleted += 1
    return {"total_listed": len(items), "deleted": deleted, "skipped": skipped}
