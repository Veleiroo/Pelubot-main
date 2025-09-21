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
    """Registra latencia y contador de peticiones para cada solicitud."""
    async def dispatch(self, request: Request, call_next: Callable):
        path = _path_template(request)
        method = request.method
        start = time.perf_counter()
        status_code = 500
        try:
            response: Response = await call_next(request)
            status_code = getattr(response, "status_code", 200)
            return response
        except Exception:
            # Si FastAPI fija status_code en request.state (ej.: HTTPException), lo usamos.
            try:
                maybe_state = getattr(request, "state", None)
                status_code = getattr(maybe_state, "status_code", 500)
            except Exception:
                status_code = 500
            raise
        finally:
            dur = time.perf_counter() - start
            try:
                HTTP_LATENCY.labels(method=method, path=path).observe(dur)
            except Exception:
                pass
            try:
                HTTP_REQUESTS.labels(method=method, path=path, status=str(status_code)).inc()
            except Exception:
                pass


def install_metrics(app: FastAPI) -> None:
    """Registra el middleware de métricas y expone `/metrics`."""
    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics")
    def metrics_endpoint():
        data = generate_latest(REGISTRY)
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)
