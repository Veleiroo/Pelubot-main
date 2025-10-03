"""Utilidades criptográficas para gestionar credenciales de estilistas."""
from __future__ import annotations

from typing import Final

from argon2 import PasswordHasher, exceptions as argon2_exceptions

_PASSWORD_HASHER: Final[PasswordHasher] = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
)


def hash_password(plain_password: str) -> str:
    """Devuelve un hash Argon2id del texto plano recibido."""
    if not plain_password:
        raise ValueError("La contraseña no puede estar vacía")
    return _PASSWORD_HASHER.hash(plain_password)


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Valida que el texto plano coincida con el hash almacenado."""
    if not plain_password or not stored_hash:
        return False
    try:
        _PASSWORD_HASHER.verify(stored_hash, plain_password)
        return True
    except argon2_exceptions.VerifyMismatchError:
        return False
    except argon2_exceptions.VerificationError:
        return False


def needs_rehash(stored_hash: str) -> bool:
    """Indica si el hash debe regenerarse porque los parámetros cambiaron."""
    if not stored_hash:
        return True
    try:
        return _PASSWORD_HASHER.check_needs_rehash(stored_hash)
    except argon2_exceptions.VerificationError:
        return True