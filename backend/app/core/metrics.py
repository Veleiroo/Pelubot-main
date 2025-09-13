from __future__ import annotations
import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from prometheus_client import Counter, Histogram, REGISTRY, generate_latest, CONTENT_TYPE_LATEST


# Métricas HTTP
HTTP_REQUESTS = Counter(
    "pelubot_http_requests_total",
    "Total de peticiones HTTP",
    labelnames=("method", "path", "status"),
)

HTTP_LATENCY = Histogram(
    "pelubot_http_request_duration_seconds",
    "Duración de petición HTTP en segundos",
    labelnames=("method", "path"),
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)

# Métricas de dominio
RESERVATIONS_CREATED = Counter("pelubot_reservations_created_total", "Reservas creadas")
RESERVATIONS_RESCHEDULED = Counter("pelubot_reservations_rescheduled_total", "Reservas reprogramadas")
RESERVATIONS_CANCELLED = Counter("pelubot_reservations_cancelled_total", "Reservas canceladas")


def _path_template(request: Request) -> str:
    try:
        route = request.scope.get("route")
        p = getattr(route, "path", None)
        if isinstance(p, str) and p:
            return p
    except Exception:
        pass
    try:
        return str(request.url.path)
    except Exception:
        return "unknown"


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        path = _path_template(request)
        method = request.method
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
            return response
        finally:
            dur = time.perf_counter() - start
            try:
                HTTP_LATENCY.labels(method=method, path=path).observe(dur)
            except Exception:
                pass
            try:
                status = getattr(request, "state", None)
                code = None
                if status is not None:
                    code = getattr(status, "status_code", None)
                if code is None:
                    code = 200
            except Exception:
                code = 200
            try:
                # No tenemos el response aquí tras finally si hubo excepción; aproximamos a 200
                HTTP_REQUESTS.labels(method=method, path=path, status=str(200)).inc()
            except Exception:
                pass


def install_metrics(app: FastAPI) -> None:
    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics")
    def metrics_endpoint():
        data = generate_latest(REGISTRY)
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)

