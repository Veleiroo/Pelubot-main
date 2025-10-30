"""
Restaura un fichero SQLite a partir de su representación en Base64.

Pensado para ejecutarse dentro del contenedor (p.ej. vía `railway run`)
para poblar el volumen persistente del backend.
"""
from __future__ import annotations

import argparse
import base64
import sys
from pathlib import Path


DEFAULT_INPUT = Path(__file__).resolve().parents[1] / "data" / "pelubot.db.b64"
DEFAULT_OUTPUT = Path("/data/pelubot.db")


def decode_base64_file(source: Path, target: Path, overwrite: bool) -> None:
    if not source.exists():
        raise SystemExit(f"El archivo Base64 no existe: {source}")

    if target.exists() and not overwrite:
        raise SystemExit(
            f"El destino {target} ya existe. Usa --force si deseas sobreescribirlo."
        )

    target.parent.mkdir(parents=True, exist_ok=True)

    raw = source.read_text(encoding="utf-8")
    try:
        decoded = base64.b64decode(raw, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"No se pudo decodificar {source}: {exc}") from exc

    target.write_bytes(decoded)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Restaura una base de datos SQLite desde un archivo Base64."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Ruta del archivo Base64 (por defecto {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Ruta de salida del fichero SQLite (por defecto {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Sobrescribe el fichero de destino si ya existe.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[1:])
    decode_base64_file(args.input, args.output, args.force)
    print(f"Base restaurada en {args.output} ({args.output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
