"""
Punto de entrada del backend de PeluBot (FastAPI).
Incluye configuración de CORS, logging, middleware y ciclo de vida.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
if _ROOT_ENV.exists():
    load_dotenv(dotenv_path=_ROOT_ENV, override=False)
else:
    load_dotenv(override=False)

from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware

# Usa el router de la API del paquete estructurado (reexporta rutas heredadas)
from app.api.routes import router, API_KEY
from app.api.pro_portal import router as pros_router

from app.db import create_db_and_tables
from sqlmodel import Session
from datetime import date, timedelta
from app.db import engine
from app.services.logic import sync_from_gcal_range
from app.services.calendar_queue import start_worker, stop_worker

from app.core.logging_config import setup_logging
from app.core.middleware import RequestIDMiddleware
from app.core.errors import install_exception_handlers
from app.core.metrics import install_metrics
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configura logging/BD al iniciar la app y ejecuta sincronización opcional."""
    setup_logging()
    create_db_and_tables()

    worker_started = False
    try:
        if os.getenv("AUTO_SYNC_FROM_GCAL", "false").lower() in ("1","true","yes","si","sí","y"):
            days = int(os.getenv("AUTO_SYNC_FROM_GCAL_DAYS", "7"))
            default_service = os.getenv("DEFAULT_SERVICE_FOR_SYNC", "corte_cabello")
            start = date.today()
            end = start + timedelta(days=max(0, days-1))
            with Session(engine) as s:
                sync_from_gcal_range(s, start, end, default_service=default_service, by_professional=True)
    except Exception:
        pass

    try:
        disable_worker = os.getenv("PELUBOT_DISABLE_GCAL_WORKER", "").lower() in {"1", "true", "yes", "si", "sí"}
        if not disable_worker and not os.getenv("PYTEST_CURRENT_TEST"):
            start_worker()
            worker_started = True
    except Exception:
        pass

    if not API_KEY or API_KEY == "changeme":
        logging.getLogger("pelubot.main").warning("API_KEY no configurada o usando valor por defecto; define una clave segura en .env")

    yield

    if worker_started:
        try:
            stop_worker()
        except Exception:
            pass


def create_app() -> FastAPI:
    """Construye la instancia principal de FastAPI con middlewares y rutas."""
    app = FastAPI(
        title="PeluBot MVP",
        version="0.6.0",
        description="MVP de peluquería con intents y reservas (persistencia en SQLite) usando FastAPI.",
        lifespan=lifespan,
    )

    origins_env = os.getenv("ORIGINS")
    if origins_env:
        allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
    else:
        allow_origins = ["*"]

    # Aviso si CORS está abierto en lo que parece un entorno de producción
    try:
        if allow_origins == ["*"] and os.getenv("ENV", "dev").lower() in ("prod", "production"):
            logging.getLogger("pelubot.main").warning("CORS abierto (*) en ENV=prod. Define ORIGINS en .env")
    except Exception:
        pass

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(RequestIDMiddleware)
    # Rate limiting básico (memoria local por proceso)
    try:
        limit_admin = int(os.getenv("RATE_LIMIT_ADMIN_PER_MIN", "30"))
        limit_ops = int(os.getenv("RATE_LIMIT_OPS_PER_MIN", "60"))
    except Exception:
        limit_admin, limit_ops = 30, 60
    app.add_middleware(RateLimitMiddleware, window=60, limit_admin=limit_admin, limit_ops=limit_ops)
    install_exception_handlers(app)
    install_metrics(app)
    app.include_router(router)
    app.include_router(pros_router)
    return app


app = create_app()
