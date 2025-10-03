"""CLI para crear y administrar cuentas de estilistas."""
from __future__ import annotations

import argparse
import getpass
import sys
from typing import List

from sqlmodel import Session, select

from app.db import create_db_and_tables, engine
from app.models import StylistDB
from app.utils.security import hash_password, needs_rehash


def _prompt_password(prompt: str = "Contraseña") -> str:
    pwd = getpass.getpass(f"{prompt}: ")
    confirm = getpass.getpass("Confirma la contraseña: ")
    if pwd != confirm:
        raise ValueError("Las contraseñas no coinciden")
    return pwd


def _parse_services(raw: str | List[str]) -> List[str]:
    if isinstance(raw, list):
        parts = raw
    else:
        parts = raw.split(",")
    services = [item.strip() for item in parts if item.strip()]
    if not services:
        raise ValueError("Debes indicar al menos un servicio para el estilista")
    return services


def cmd_list(args: argparse.Namespace) -> int:
    with Session(engine) as session:
        rows = session.exec(select(StylistDB)).all()
    if not rows:
        print("No hay estilistas registrados.")
        return 0
    for row in rows:
        estado = "activo" if row.is_active else "inactivo"
        servicios = ", ".join(row.services or []) or "(ninguno)"
        print(f"- {row.id}: {row.display_name or row.name} [{estado}] → servicios: {servicios}")
    return 0


def cmd_create(args: argparse.Namespace) -> int:
    create_db_and_tables()
    services = _parse_services(args.services)
    password = args.password or _prompt_password()
    pwd_hash = hash_password(password)

    with Session(engine) as session:
        existing = session.get(StylistDB, args.id)
        if existing:
            existing.name = args.name
            existing.display_name = args.display_name or args.name
            existing.email = args.email
            existing.phone = args.phone
            existing.services = services
            existing.calendar_id = args.calendar_id
            existing.use_gcal_busy = args.use_gcal_busy
            existing.is_active = not args.inactive
            existing.password_hash = pwd_hash
            session.add(existing)
            session.commit()
            session.refresh(existing)
            print(f"Estilista '{existing.id}' actualizado.")
        else:
            stylist = StylistDB(
                id=args.id,
                name=args.name,
                display_name=args.display_name or args.name,
                email=args.email,
                phone=args.phone,
                services=services,
                calendar_id=args.calendar_id,
                use_gcal_busy=args.use_gcal_busy,
                is_active=not args.inactive,
                password_hash=pwd_hash,
            )
            session.add(stylist)
            session.commit()
            print(f"Estilista '{stylist.id}' creado.")
    return 0


def cmd_set_password(args: argparse.Namespace) -> int:
    create_db_and_tables()
    with Session(engine) as session:
        stylist = session.get(StylistDB, args.id)
        if not stylist:
            print(f"No existe estilista con id '{args.id}'.", file=sys.stderr)
            return 1
        password = args.password or _prompt_password()
        stylist.password_hash = hash_password(password)
        session.add(stylist)
        session.commit()
        print(f"Contraseña actualizada para '{stylist.id}'.")
    return 0


def cmd_rehash(args: argparse.Namespace) -> int:
    create_db_and_tables()
    updated = 0
    with Session(engine) as session:
        rows = session.exec(select(StylistDB)).all()
        for row in rows:
            if needs_rehash(row.password_hash):
                print(f"Hash antiguo detectado para '{row.id}', solicitando nueva contraseña...")
                password = _prompt_password(f"Nueva contraseña para {row.id}")
                row.password_hash = hash_password(password)
                session.add(row)
                updated += 1
        if updated:
            session.commit()
    print(f"Hashes actualizados: {updated}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Gestión de estilistas")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_cmd = subparsers.add_parser("create", help="Crea o actualiza un estilista")
    create_cmd.add_argument("id", help="Identificador slug (ej. deinis)")
    create_cmd.add_argument("name", help="Nombre interno")
    create_cmd.add_argument("services", help="Lista de servicios separados por coma")
    create_cmd.add_argument("--display-name", help="Nombre público", default=None)
    create_cmd.add_argument("--email", help="Email de contacto/login", default=None)
    create_cmd.add_argument("--phone", help="Teléfono", default=None)
    create_cmd.add_argument("--calendar-id", help="ID de calendario asociado", default=None)
    create_cmd.add_argument("--use-gcal-busy", action="store_true", help="Activar consulta de busy en Google Calendar")
    create_cmd.add_argument("--inactive", action="store_true", help="Crear/actualizar como inactivo")
    create_cmd.add_argument("--password", help="Contraseña en texto plano (usar sólo en CI)", default=None)
    create_cmd.set_defaults(func=cmd_create)

    passwd_cmd = subparsers.add_parser("set-password", help="Actualiza la contraseña de un estilista existente")
    passwd_cmd.add_argument("id", help="Identificador del estilista")
    passwd_cmd.add_argument("--password", help="Contraseña en texto plano (usar sólo en CI)", default=None)
    passwd_cmd.set_defaults(func=cmd_set_password)

    list_cmd = subparsers.add_parser("list", help="Lista estilistas registrados")
    list_cmd.set_defaults(func=cmd_list)

    rehash_cmd = subparsers.add_parser("rehash", help="Fuerza la actualización de hashes antiguos")
    rehash_cmd.set_defaults(func=cmd_rehash)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
