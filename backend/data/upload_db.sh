#!/bin/bash
# Script para restaurar pelubot.db en el contenedor de Railway

# Crear directorio data si no existe
mkdir -p /app/backend/data

# Decodificar y escribir la base de datos
base64 -d << 'EOF' > /app/backend/data/pelubot.db
$(cat pelubot.db.b64)
EOF

echo "Base de datos subida correctamente a /app/backend/data/pelubot.db"
ls -lh /app/backend/data/pelubot.db
