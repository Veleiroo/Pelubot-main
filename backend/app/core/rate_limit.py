"""Middleware sencillo de rate limiting in-memory."""

from __future__ import annotations
from collections import deque
from dataclasses import dataclass
from time import monotonic
from typing import Deque, Dict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


@dataclass
class _Bucket:
    ts: Deque[float]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Limitador simple (memoria local) por clave (API key o IP) y ruta.
    - Ventana: 60s
    - Límites por defecto:
      - /admin/*: 30 req/min
      - /reservations*, /reschedule, /cancel*: 60 req/min
    """
    def __init__(self, app, window: int = 60, limit_admin: int = 30, limit_ops: int = 60):
        super().__init__(app)
        self.window = window
        self.limit_admin = int(limit_admin)
        self.limit_ops = int(limit_ops)
        self.store: Dict[str, _Bucket] = {}

    def _key(self, request: Request) -> str:
        """Compone la clave de bucket combinando API key (o IP) y ruta."""
        key = request.headers.get("X-API-Key") or ""
        if not key:
            try:
                key = getattr(request.client, "host", "") or "unknown"
            except Exception:
                key = "unknown"
        try:
            path = request.scope.get("route").path  # type: ignore
        except Exception:
            path = request.url.path
        return f"{key}|{path}"

    def _limit_for(self, request: Request) -> int | None:
        """Determina el límite aplicable según ruta y método."""
        path = request.url.path
        method = request.method.upper()
        if path.startswith("/admin") and method != "GET":
            return self.limit_admin
        # Operaciones que modifican reservas
        if path.startswith("/reservations") and method in ("POST", "DELETE"):
            return self.limit_ops
        if path == "/reschedule" and method == "POST":
            return self.limit_ops
        if path == "/cancel_reservation" and method == "POST":
            return self.limit_ops
        return None

    async def dispatch(self, request: Request, call_next):
        """Aplica el rate limit antes de delegar la petición."""
        limit = self._limit_for(request)
        if not limit:
            return await call_next(request)
        now = monotonic()
        key = self._key(request)
        bucket = self.store.get(key)
        if bucket is None:
            bucket = _Bucket(ts=deque())
            self.store[key] = bucket
        # Purga ventana
        wstart = now - self.window
        while bucket.ts and bucket.ts[0] < wstart:
            bucket.ts.popleft()
        if len(bucket.ts) >= limit:
            return JSONResponse(status_code=429, content={"detail": "Demasiadas peticiones. Inténtalo de nuevo en un momento."})
        bucket.ts.append(now)
        return await call_next(request)
