"""
Configuración y acceso a la base de datos.
"""
from __future__ import annotations
import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

# Nueva: conexión directa sqlite3 con PRAGMAs reforzados para utilidades/diagnóstico
# Nota: La app sigue usando SQLAlchemy/SQLModel; esta función es auxiliar e idempotente.
import sqlite3

def connect(db_path: str) -> sqlite3.Connection:
    """Crea una conexión sqlite3 con PRAGMAs seguros por defecto.
    - WAL para concurrencia
    - synchronous=NORMAL (usar FULL si se prioriza durabilidad máxima)
    - foreign_keys=ON para respetar FK (si existieran)
    - busy_timeout=10000 ms para evitar database is locked en picos
    - temp_store=MEMORY y mmap_size (si host lo permite) para rendimiento
    """
    con = sqlite3.connect(db_path, timeout=10, isolation_level=None, check_same_thread=False)
    # PRAGMAs clave
    con.execute("PRAGMA journal_mode = WAL;")
    con.execute("PRAGMA synchronous = NORMAL;")  # usar FULL si se prioriza durabilidad máxima
    con.execute("PRAGMA foreign_keys = ON;")
    con.execute("PRAGMA busy_timeout = 10000;")  # 10s
    con.execute("PRAGMA temp_store = MEMORY;")
    try:
        con.execute("PRAGMA mmap_size = 134217728;")  # 128MB
    except Exception:
        pass
    return con

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
                cursor.execute("PRAGMA synchronous=NORMAL;")  # usar FULL si se prioriza durabilidad máxima
                cursor.execute("PRAGMA foreign_keys=ON;")
                cursor.execute("PRAGMA busy_timeout=10000;")  # 10s
                cursor.execute("PRAGMA temp_store=MEMORY;")
                try:
                    cursor.execute("PRAGMA mmap_size=134217728;")  # 128MB si el host lo permite
                except Exception:
                    pass
                cursor.close()
            except Exception:
                # No interrumpir el arranque si falla el PRAGMA (p.ej., otros motores)
                pass
except Exception:
    # NOTA: los eventos son de mejor esfuerzo; si fallan, no bloqueamos el arranque.
    pass

def create_db_and_tables() -> None:
    """Crea la estructura de la base de datos y garantiza índices/trigger clave."""
    SQLModel.metadata.create_all(engine)
    # Crear índices/trigger en SQLite si faltan (para BDs ya existentes). Idempotente.
    if str(engine.url).startswith("sqlite"):
        try:
            with engine.connect() as conn:
                # Asegurar foreign_keys on en la sesión de migración
                conn.exec_driver_sql("PRAGMA foreign_keys = ON;")
                # Asegurar columnas nuevas antes de crear índices que dependan de ellas
                try:
                    cols = conn.exec_driver_sql("PRAGMA table_info('reservationdb');").fetchall()
                    existing_cols = {row[1] for row in cols}
                    for col, ddl in {
                        "customer_name": "TEXT",
                        "customer_email": "TEXT",
                        "customer_phone": "TEXT",
                        "notes": "TEXT",
                        "sync_status": "TEXT",
                        "sync_job_id": "INTEGER",
                        "sync_last_error": "TEXT",
                        "sync_updated_at": "TIMESTAMP",
                    }.items():
                        if col not in existing_cols:
                            conn.exec_driver_sql(f"ALTER TABLE reservationdb ADD COLUMN {col} {ddl};")
                except Exception:
                    pass
                # Índices para consultas por profesional/servicio y rango temporal
                for statement in (
                    "CREATE INDEX IF NOT EXISTS ix_res_prof_start_end ON reservationdb (professional_id, start, end);",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_res_prof_start ON reservationdb (professional_id, start);",
                    "CREATE INDEX IF NOT EXISTS ix_res_service_start ON reservationdb (service_id, start);",
                    "CREATE INDEX IF NOT EXISTS ix_res_sync_status ON reservationdb (sync_status);",
                    "CREATE INDEX IF NOT EXISTS ix_res_sync_job ON reservationdb (sync_job_id);",
                    "CREATE INDEX IF NOT EXISTS ix_stylist_active ON stylistdb (is_active);",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_stylist_email ON stylistdb (email);",
                    "CREATE INDEX IF NOT EXISTS ix_calendar_jobs_status_available ON calendar_sync_jobs (status, available_at);",
                    "CREATE INDEX IF NOT EXISTS ix_calendar_jobs_reservation ON calendar_sync_jobs (reservation_id);",
                ):
                    try:
                        conn.exec_driver_sql(statement)
                    except Exception:
                        pass
                # Trigger updated_at: actualiza solo si no lo ha actualizado ya la capa ORM
                # Evita bucle usando condición sobre OLD/NEW
                conn.exec_driver_sql(
                    """
                    CREATE TRIGGER IF NOT EXISTS trg_reservationdb_updated
                    AFTER UPDATE ON reservationdb
                    FOR EACH ROW
                    WHEN NEW.updated_at <= OLD.updated_at
                    BEGIN
                      UPDATE reservationdb SET updated_at = CURRENT_TIMESTAMP
                      WHERE id = NEW.id AND NEW.updated_at <= OLD.updated_at;
                    END;
                    """
                )
                try:
                    cols = conn.exec_driver_sql("PRAGMA table_info('calendar_sync_jobs');").fetchall()
                    existing_cols = {row[1] for row in cols}
                    for col, ddl in {
                        "locked_by": "TEXT",
                        "locked_at": "TIMESTAMP",
                        "heartbeat_at": "TIMESTAMP",
                    }.items():
                        if col not in existing_cols:
                            conn.exec_driver_sql(f"ALTER TABLE calendar_sync_jobs ADD COLUMN {col} {ddl};")
                except Exception:
                    pass
        except Exception:
            # No bloquear si falla (por compatibilidad)
            pass


def get_session():
    """Context manager de sesión SQLModel para usar con FastAPI."""
    with Session(engine) as session:
        yield session
