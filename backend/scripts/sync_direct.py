#!/usr/bin/env python3
"""
Script directo de sincronización (sin requerir servidor web activo).

Importa eventos de Google Calendar directamente a la base de datos.
"""
import sys
from pathlib import Path
from datetime import date, timedelta

# Ajusta el path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session
from app.db import engine
from app.services.logic import sync_from_gcal_range


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Sincronización directa GCal → BD")
    parser.add_argument("--days", type=int, default=30, help="Días a sincronizar (defecto: 30)")
    parser.add_argument("--current-month", action="store_true", help="Solo mes actual")
    parser.add_argument("--service", type=str, default="corte_cabello", help="Servicio por defecto")
    
    args = parser.parse_args()
    
    # Determinar fechas
    if args.current_month:
        today = date.today()
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    else:
        start = date.today() - timedelta(days=args.days)
        end = date.today() + timedelta(days=7)
    
    print("\n" + "="*60)
    print("🔄 SINCRONIZACIÓN DIRECTA: Google Calendar → Base de Datos")
    print("="*60)
    print(f"📅 Rango: {start} → {end}")
    print(f"🔧 Servicio por defecto: {args.service}")
    print("="*60 + "\n")
    
    try:
        with Session(engine) as session:
            result = sync_from_gcal_range(
                session=session,
                start_date=start,
                end_date=end,
                default_service=args.service,
                by_professional=True,
            )
            
            print("✅ Sincronización completada!\n")
            print(f"📥 Resultado:")
            print(f"   • Insertadas: {result.get('inserted', 0)} citas nuevas")
            print(f"   • Actualizadas: {result.get('updated', 0)} citas existentes")
            print(f"   • Calendarios procesados: {result.get('calendars', 0)}")
            print(f"   • Estado: {'✅ OK' if result.get('ok') else '❌ Error'}")
            
            if not result.get('ok'):
                print(f"\n❌ Error: {result.get('error', 'Desconocido')}")
                sys.exit(1)
            
            print("\n" + "="*60)
            print("🎉 Ahora el portal de profesionales mostrará las citas!")
            print("="*60 + "\n")
            
    except Exception as e:
        print(f"\n❌ Error durante la sincronización: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
