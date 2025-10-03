"""Utilidades de autenticación para el portal de estilistas."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.db import get_session
from app.models import StylistDB

SESSION_COOKIE_NAME = os.getenv("STYLIST_SESSION_COOKIE", "pro_session")
_SESSION_SECRET = os.getenv("PRO_PORTAL_SECRET") or os.getenv("STYLIST_SESSION_SECRET") or os.getenv("API_KEY", "changeme")
_SESSION_TTL_MINUTES = int(os.getenv("STYLIST_SESSION_MINUTES", "720"))  # 12 horas por defecto
_SESSION_COOKIE_SECURE = os.getenv("STYLIST_SESSION_COOKIE_SECURE", "auto").lower()
_SESSION_COOKIE_SAMESITE = os.getenv("STYLIST_SESSION_SAMESITE", "lax").lower()
_SESSION_COOKIE_DOMAIN = os.getenv("STYLIST_SESSION_COOKIE_DOMAIN")
_SESSION_SECRET_RUNTIME: str | None = None

if _SESSION_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    _SESSION_COOKIE_SAMESITE = "lax"


class AuthError(HTTPException):
    def __init__(self, detail: str = "No autorizado") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _session_secret() -> str:
    global _SESSION_SECRET_RUNTIME
    candidate = _SESSION_SECRET_RUNTIME or _SESSION_SECRET
    if candidate and candidate != "changeme":
        if _SESSION_SECRET_RUNTIME is None:
            _SESSION_SECRET_RUNTIME = candidate
        return candidate
    if not candidate or candidate == "changeme":
        env = os.getenv("ENV", "dev").lower()
        if env in {"prod", "production"}:
            raise RuntimeError("PRO_PORTAL_SECRET no configurado; define un secreto fuerte en el entorno")
        # Generamos un secreto efímero para desarrollo/test.
        if _SESSION_SECRET_RUNTIME is None:
            _SESSION_SECRET_RUNTIME = secrets.token_urlsafe(48)
        return _SESSION_SECRET_RUNTIME
    return candidate


def _cookie_secure_flag() -> bool:
    if _SESSION_COOKIE_SECURE == "auto":
        return os.getenv("ENV", "dev").lower() in {"prod", "production"}
    return _SESSION_COOKIE_SECURE in {"1", "true", "yes", "y", "on"}


def create_stylist_session_token(stylist_id: str, ttl_minutes: int | None = None) -> Tuple[str, datetime]:
    ttl = ttl_minutes or _SESSION_TTL_MINUTES
    issued_at = _now()
    expires_at = issued_at + timedelta(minutes=ttl)
    payload: Dict[str, Any] = {
        "sub": stylist_id,
        "type": "stylist_session",
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, _session_secret(), algorithm="HS256")
    return token, expires_at


def set_stylist_session_cookie(response: Response, token: str, expires_at: datetime) -> None:
    max_age = max(1, int((expires_at - _now()).total_seconds()))
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        expires=expires_at,
        max_age=max_age,
        httponly=True,
        secure=_cookie_secure_flag(),
        samesite="none" if _SESSION_COOKIE_SAMESITE == "none" else _SESSION_COOKIE_SAMESITE,
        domain=_SESSION_COOKIE_DOMAIN,
        path="/",
    )


def clear_stylist_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, domain=_SESSION_COOKIE_DOMAIN, path="/")


def decode_stylist_session_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, _session_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:  # pragma: no cover - FastAPI lo captura
        raise AuthError("Sesión expirada") from exc
    except jwt.InvalidTokenError as exc:  # pragma: no cover - formato inválido
        raise AuthError("Token inválido") from exc


async def get_current_stylist(
    request: Request,
    session: Session = Depends(get_session),
) -> StylistDB:
    token = request.cookies.get(SESSION_COOKIE_NAME) or request.headers.get("X-Pro-Session")
    if not token:
        raise AuthError()
    data = decode_stylist_session_token(token)
    if data.get("type") != "stylist_session":
        raise AuthError()
    stylist_id = data.get("sub")
    if not stylist_id:
        raise AuthError()
    stylist = session.get(StylistDB, stylist_id)
    if not stylist or not stylist.is_active:
        raise AuthError()
    return stylist
