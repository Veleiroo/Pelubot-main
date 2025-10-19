#!/usr/bin/env python3
"""
Script para crear citas de demostración realistas para probar el frontend de pros.

Este script crea múltiples reservas con diferentes:
- Servicios (corte_cabello, corte_barba, arreglo_barba)
- Clientes (Alice, Bob, Clara, Diego, Eva)
- Fechas (mes anterior y mes actual)

Uso:
  python backend/scripts/create_demo_appointments.py

Variables de entorno opcionales:
  BASE_URL            por defecto http://localhost:8000
  API_KEY             por defecto dev-key
  STYLIST_ID          por defecto deinis
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Añadir el directorio backend al path para importar módulos
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, create_engine
from app.models import ReservationDB, StylistDB
from app.utils.date import TZ

# Configuración
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("API_KEY", "dev-key")
STYLIST_ID = os.getenv("STYLIST_ID", "deinis")
DB_PATH = backend_dir / "data" / "pelubot.db"


def create_demo_reservations():
    """Crea reservas de demostración en la base de datos."""
    
    # Usar la misma configuración que la app
    database_url = f"sqlite:///{DB_PATH}"
    engine = create_engine(database_url, echo=True)
    
    with Session(engine) as session:
        # Verificar que existe el estilista
        stylist = session.get(StylistDB, STYLIST_ID)
        if not stylist:
            print(f"❌ Error: El estilista '{STYLIST_ID}' no existe en la base de datos")
            print("   Ejecuta primero: python backend/scripts/manage_stylists.py")
            return
        
        print(f"✅ Encontrado estilista: {stylist.name}")
        
        # Fecha actual (simulamos que estamos en octubre 2025)
        now = datetime.now(TZ)
        current_year = now.year
        current_month = now.month
        
        # Crear reservas del mes anterior
        prev_month = current_month - 1 if current_month > 1 else 12
        prev_year = current_year if current_month > 1 else current_year - 1
        
        reservations_data = [
            # ===== MES ANTERIOR =====
            {
                "id": f"demo-prev-alice",
                "service_id": "corte_cabello",
                "customer_name": "Alice García",
                "start": datetime(prev_year, prev_month, 2, 10, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-prev-diego",
                "service_id": "corte_barba",
                "customer_name": "Diego Martínez",
                "start": datetime(prev_year, prev_month, 10, 11, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-prev-eva",
                "service_id": "corte_barba",
                "customer_name": "Eva López",
                "start": datetime(prev_year, prev_month, 18, 12, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            
            # ===== MES ACTUAL =====
            {
                "id": f"demo-curr-alice-1",
                "service_id": "corte_cabello",
                "customer_name": "Alice García",
                "start": datetime(current_year, current_month, 2, 10, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-curr-bob",
                "service_id": "corte_barba",
                "customer_name": "Bob Silva",
                "start": datetime(current_year, current_month, 5, 9, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-curr-alice-2",
                "service_id": "corte_barba",
                "customer_name": "Alice García",
                "start": datetime(current_year, current_month, 12, 14, 0, tzinfo=TZ),
                "duration_minutes": 30,
            },
            
            # ===== CITAS DE HOY (con horas pasadas para probar los botones) =====
            {
                "id": f"demo-today-1",
                "service_id": "corte_cabello",
                "customer_name": "Juan Martín",
                "start": now.replace(hour=9, minute=0, second=0, microsecond=0),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-today-2",
                "service_id": "corte_barba",
                "customer_name": "María López",
                "start": now.replace(hour=10, minute=30, second=0, microsecond=0),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-today-3",
                "service_id": "arreglo_barba",
                "customer_name": "Carlos Ruiz",
                "start": now.replace(hour=12, minute=0, second=0, microsecond=0),
                "duration_minutes": 15,
            },
            {
                "id": f"demo-curr-clara",
                "service_id": "corte_cabello",
                "customer_name": "Clara Rodríguez",
                "start": now.replace(hour=13, minute=0, second=0, microsecond=0),
                "duration_minutes": 30,
            },
            
            # ===== PRÓXIMOS DÍAS (para agenda) =====
            {
                "id": f"demo-future-1",
                "service_id": "corte_cabello",
                "customer_name": "Fernando Sánchez",
                "start": (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-future-2",
                "service_id": "corte_barba",
                "customer_name": "Gloria Pérez",
                "start": (now + timedelta(days=1)).replace(hour=11, minute=30, second=0, microsecond=0),
                "duration_minutes": 30,
            },
            {
                "id": f"demo-future-3",
                "service_id": "arreglo_barba",
                "customer_name": "Hugo Torres",
                "start": (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0),
                "duration_minutes": 15,
            },
            {
                "id": f"demo-future-4",
                "service_id": "corte_cabello",
                "customer_name": "Isabel Moreno",
                "start": (now + timedelta(days=2)).replace(hour=15, minute=0, second=0, microsecond=0),
                "duration_minutes": 30,
            },
        ]
        
        created_count = 0
        skipped_count = 0
        
        for res_data in reservations_data:
            # Verificar si ya existe
            existing = session.get(ReservationDB, res_data["id"])
            if existing:
                print(f"⏭️  Omitiendo '{res_data['id']}' (ya existe)")
                skipped_count += 1
                continue
            
            # Crear reserva
            end_time = res_data["start"] + timedelta(minutes=res_data["duration_minutes"])
            reservation = ReservationDB(
                id=res_data["id"],
                service_id=res_data["service_id"],
                professional_id=STYLIST_ID,
                start=res_data["start"],
                end=end_time,
                customer_name=res_data["customer_name"],
                customer_phone="+34666777888",
                customer_email=f"{res_data['customer_name'].split()[0].lower()}@example.com",
            )
            session.add(reservation)
            created_count += 1
            print(f"✅ Creada: {res_data['customer_name']} - {res_data['service_id']} - {res_data['start'].strftime('%Y-%m-%d %H:%M')}")
        
        session.commit()
        
        print("\n" + "="*60)
        print(f"✨ Resumen:")
        print(f"   • Citas creadas: {created_count}")
        print(f"   • Citas omitidas (ya existían): {skipped_count}")
        print(f"   • Total en lote: {len(reservations_data)}")
        print("="*60)
        
        if created_count > 0:
            print("\n💡 Ahora puedes:")
            print(f"   1. Ver las citas en el frontend de pros: {BASE_URL.replace('8000', '5173')}/pro")
            print(f"   2. Ver la agenda: {BASE_URL.replace('8000', '5173')}/pro/agenda")
            print(f"   3. Ver el resumen: {BASE_URL.replace('8000', '5173')}/pro/overview")


def main():
    """Punto de entrada del script."""
    print("\n" + "="*60)
    print("📅 Creador de Citas de Demostración")
    print("="*60 + "\n")
    
    print(f"Configuración:")
    print(f"  • Base de datos: {DB_PATH}")
    print(f"  • Estilista: {STYLIST_ID}")
    print(f"  • API Key: {API_KEY}")
    print()
    
    try:
        create_demo_reservations()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
