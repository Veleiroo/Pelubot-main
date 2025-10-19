#!/usr/bin/env python3
"""
Script de migración: Añadir campo 'status' a la tabla reservationdb.

Este script:
1. Añade la columna 'status' con valor por defecto 'confirmada'
2. Crea un índice en el campo status
3. Es idempotente (puede ejecutarse múltiples veces sin problemas)

Uso:
    python scripts/migrate_add_status.py
"""
import sys
from pathlib import Path

# Añadir el directorio raíz al path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import sqlite3
from app.db import DEFAULT_DB_PATH

def migrate():
    """Ejecuta la migración para añadir el campo status."""
    print(f"🔄 Conectando a la base de datos: {DEFAULT_DB_PATH}")
    
    conn = sqlite3.connect(str(DEFAULT_DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(reservationdb)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'status' in columns:
            print("✅ La columna 'status' ya existe. No se requiere migración.")
            return True
        
        print("📝 Añadiendo columna 'status' a reservationdb...")
        
        # Añadir la columna status con valor por defecto
        cursor.execute("""
            ALTER TABLE reservationdb 
            ADD COLUMN status VARCHAR NOT NULL DEFAULT 'confirmada'
        """)
        
        print("✅ Columna 'status' añadida correctamente")
        
        # Crear índice en status
        print("📝 Creando índice ix_res_status...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_res_status 
            ON reservationdb (status)
        """)
        
        print("✅ Índice ix_res_status creado correctamente")
        
        # Commit de los cambios
        conn.commit()
        
        print("\n✨ Migración completada exitosamente!")
        print(f"   - Columna 'status' añadida con valor por defecto 'confirmada'")
        print(f"   - Índice 'ix_res_status' creado")
        
        # Verificar el esquema actualizado
        cursor.execute("PRAGMA table_info(reservationdb)")
        columns_after = cursor.fetchall()
        status_column = [col for col in columns_after if col[1] == 'status']
        
        if status_column:
            print(f"\n📊 Información de la columna 'status':")
            col = status_column[0]
            print(f"   - Nombre: {col[1]}")
            print(f"   - Tipo: {col[2]}")
            print(f"   - Not Null: {bool(col[3])}")
            print(f"   - Default: {col[4]}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Error durante la migración: {e}")
        conn.rollback()
        return False
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Conexión cerrada")

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 MIGRACIÓN: Añadir campo 'status' a reservationdb")
    print("=" * 60)
    print()
    
    success = migrate()
    
    if success:
        sys.exit(0)
    else:
        print("\n⚠️  La migración falló. Revisa los errores anteriores.")
        sys.exit(1)
