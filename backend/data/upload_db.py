#!/usr/bin/env python3
import base64
import sys
from pathlib import Path

# Leer el archivo base64
b64_file = Path("pelubot.db.b64")
if not b64_file.exists():
    print("Error: pelubot.db.b64 no encontrado")
    sys.exit(1)

# Decodificar
with open(b64_file, "r") as f:
    db_data = base64.b64decode(f.read())

# Escribir en la ruta del contenedor
target = Path("/app/backend/data/pelubot.db")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(db_data)

print(f"✓ Base de datos subida: {target} ({len(db_data)} bytes)")
