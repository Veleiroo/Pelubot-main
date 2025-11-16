from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import asyncio
import logging
import sqlite3
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app.db import DEFAULT_DB_PATH, engine

logger = logging.getLogger("pelubot.backup")


def _current_database_url() -> str:
    """Obtiene la URL actual de la base de datos desde el entorno."""
    return os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH}"


def get_database_path() -> Path:
    """Resuelve la ruta del fichero SQLite en disco."""
    url_str = _current_database_url()
    try:
        url = make_url(url_str)
    except ArgumentError as exc:  # pragma: no cover - validación defensiva
        raise RuntimeError(f"DATABASE_URL inválida: {url_str}") from exc
    if url.drivername != "sqlite":
        raise RuntimeError("Los backups automáticos solo están soportados para SQLite en este entorno")
    db_path = url.database
    if not db_path:
        raise RuntimeError("DATABASE_URL no especifica una ruta de fichero SQLite válida")
    return Path(db_path).expanduser().resolve()


def get_backup_dir() -> Path:
    """Directorio donde se almacenan los ficheros .db de respaldo."""
    custom = os.getenv("PELUBOT_BACKUPS_DIR") or os.getenv("BACKUPS_DIR")
    if custom:
        target = Path(custom)
    else:
        target = get_database_path().parent / "backups"
    target.mkdir(parents=True, exist_ok=True)
    return target


@dataclass
class BackupInfo:
    id: str
    filename: str
    created_at: datetime
    size_bytes: int
    checksum: Optional[str] = None
    note: Optional[str] = None


def _build_info(path: Path) -> BackupInfo:
    stats = path.stat()
    created_at = datetime.fromtimestamp(stats.st_mtime, tz=timezone.utc)
    return BackupInfo(
        id=path.name,
        filename=path.name,
        created_at=created_at,
        size_bytes=stats.st_size,
        checksum=None,
        note=None,
    )


def create_backup(note: Optional[str] = None) -> BackupInfo:
    """Genera una copia consistente de la base de datos SQLite."""
    db_path = get_database_path()
    if not db_path.exists():
        raise FileNotFoundError(f"No existe la base de datos en {db_path}")
    backup_dir = get_backup_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"pelubot-{timestamp}.db"
    temp_path = backup_dir / f".tmp-{filename}"
    target_path = backup_dir / filename

    backup_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    dest = sqlite3.connect(str(temp_path))
    try:
        conn.backup(dest)  # asegura consistencia incluso con WAL
    finally:
        dest.close()
        conn.close()

    temp_path.replace(target_path)
    info = _build_info(target_path)
    info.note = note
    try:
        enforce_retention()
    except Exception:  # pragma: no cover - el backup ya se generó; registro y continúo
        logger.exception("No se pudo aplicar la retención de backups tras crear %s", info.filename)
    return info


def list_backups(limit: Optional[int] = None) -> List[BackupInfo]:
    """Devuelve los backups disponibles ordenados por fecha descendente."""
    directory = get_backup_dir()
    if not directory.exists():
        return []
    entries = []
    for item in directory.iterdir():
        if not item.is_file():
            continue
        entries.append(_build_info(item))
    entries.sort(key=lambda entry: entry.created_at, reverse=True)
    if limit is not None:
        return entries[:limit]
    return entries


def _sanitize_backup_id(backup_id: str) -> str:
    cleaned = backup_id.strip()
    if not cleaned or any(sep in cleaned for sep in ("/", "\\", "..")):
        raise FileNotFoundError("Identificador de backup inválido")
    return cleaned


def _resolve_backup_path(backup_id: str) -> Path:
    directory = get_backup_dir()
    candidate = directory / _sanitize_backup_id(backup_id)
    if candidate.exists():
        return candidate.resolve()
    raise FileNotFoundError(f"No existe el backup {backup_id!r}")


def delete_backup(backup_id: str) -> BackupInfo:
    """Elimina el archivo indicado y devuelve sus metadatos previos."""
    path = _resolve_backup_path(backup_id)
    info = _build_info(path)
    path.unlink()
    return info


def restore_backup(backup_id: str) -> BackupInfo:
    """Restaura el backup indicado sobre la base de datos activa."""
    src = _resolve_backup_path(backup_id)
    db_path = get_database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        engine.dispose()
    except Exception:  # pragma: no cover - defensivo
        pass

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    tmp_target = db_path.parent / f".restore-{timestamp}-{db_path.name}"
    shutil.copy2(src, tmp_target)
    tmp_target.replace(db_path)

    for suffix in ("-wal", "-shm"):
        sidecar = db_path.with_name(db_path.name + suffix)
        if sidecar.exists():
            try:
                sidecar.unlink()
            except Exception:  # pragma: no cover
                pass

    return _build_info(src)


def open_backup_file(backup_id: str) -> Path:
    """Obtiene la ruta del fichero para ser servida en descargas."""
    return _resolve_backup_path(backup_id)


def _retention_limit_from_env() -> Optional[int]:
    raw = os.getenv("PELUBOT_BACKUP_RETAIN") or os.getenv("PELUBOT_BACKUP_MAX_FILES")
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError:
        logger.warning("PELUBOT_BACKUP_RETAIN inválido: %r", raw)
        return None
    if value <= 0:
        return None
    return value


def prune_old_backups(max_files: int) -> List[BackupInfo]:
    """Elimina backups antiguos dejando solo max_files más recientes."""
    entries = list_backups()
    if max_files <= 0:
        targets = entries
    elif len(entries) > max_files:
        targets = entries[max_files:]
    else:
        return []

    removed: List[BackupInfo] = []
    for info in targets:
        try:
            path = _resolve_backup_path(info.id)
        except FileNotFoundError:
            continue
        try:
            path.unlink()
            removed.append(info)
        except Exception:  # pragma: no cover - registro pero sigo
            logger.exception("No se pudo eliminar el backup antiguo %s", path)
    if removed:
        logger.info("Eliminados %s backups antiguos (retención %s)", len(removed), max_files)
    return removed


def enforce_retention(max_files: Optional[int] = None) -> List[BackupInfo]:
    limit = max_files if max_files is not None else _retention_limit_from_env()
    if limit is None:
        return []
    return prune_old_backups(limit)


async def periodic_backup_loop(
    interval_seconds: int,
    initial_delay: int = 0,
    note: str = "auto",
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Ejecuta backups periódicos hasta que el loop sea cancelado."""
    delay = max(0, initial_delay)
    if delay:
        await asyncio.sleep(delay)
    while True:
        try:
            info = create_backup(note=note)
            logger.info("Backup automático generado: %s (%s bytes)", info.filename, info.size_bytes)
        except Exception:  # pragma: no cover - se registrará en logs
            logger.exception("No se pudo generar el backup automático")
        if stop_event and stop_event.is_set():
            break
        await asyncio.sleep(max(5, interval_seconds))
