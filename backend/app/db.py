"""
Configuración y acceso a la base de datos.
"""
from __future__ import annotations
import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "pelubot.db"
DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# Aumentar timeout para evitar database is locked en SQLite
if DATABASE_URL.startswith("sqlite"):
    connect_args = {**connect_args, "timeout": 30}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

# PRAGMAs para SQLite: mejoran consistencia y concurrencia
try:
    from sqlalchemy import event

    if DATABASE_URL.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[override]
            try:
                cursor = dbapi_connection.cursor()
                # WAL = mejor concurrencia; synchronous=NORMAL para buen balance seguridad/rendimiento
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA synchronous=NORMAL;")
                cursor.execute("PRAGMA foreign_keys=ON;")
                cursor.close()
            except Exception:
                # No interrumpir el arranque si falla el PRAGMA (p.ej., otros motores)
                pass
except Exception:
    # Los eventos son best-effort; si fallan, no bloqueamos
    pass

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    # Crear índices en SQLite si faltan (para BDs ya existentes)
    if str(engine.url).startswith("sqlite"):
        try:
            with engine.connect() as conn:
                # Índice compuesto para consultas por profesional y rango temporal
                conn.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS ix_res_prof_start_end ON reservationdb (professional_id, start, end);"
                )
                # Nota: la restricción única ya se define en el modelo (UniqueConstraint),
                # por lo que SQLite crea el índice único automáticamente. Evitamos duplicarlo aquí.
        except Exception:
            # No bloquear si falla (por compatibilidad)
            pass


def get_session():
    with Session(engine) as session:
        yield session
