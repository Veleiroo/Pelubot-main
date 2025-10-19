#!/usr/bin/env python3
"""
Script para resetear completamente el sistema de reservas.

ADVERTENCIA: Este script elimina TODAS las citas de:
- Base de datos
- Google Calendar

Úsalo solo para desarrollo/testing.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select
from app.db import engine
from app.models import ReservationDB
from app.integrations.google_calendar import build_calendar, list_events_allpages, delete_event
from app.data import PRO_CALENDAR


def clear_database():
    """Elimina todas las reservas de la base de datos."""
    print("\n" + "="*60)
    print("🗑️  LIMPIANDO BASE DE DATOS")
    print("="*60)
    
    try:
        with Session(engine) as session:
            # Contar reservas antes
            count_before = len(list(session.exec(select(ReservationDB)).all()))
            print(f"📊 Reservas en BD antes: {count_before}")
            
            if count_before == 0:
                print("✅ La base de datos ya está vacía")
                return
            
            # Eliminar todas
            stmt = select(ReservationDB)
            reservations = session.exec(stmt).all()
            for res in reservations:
                session.delete(res)
            session.commit()
            
            # Verificar
            count_after = len(list(session.exec(select(ReservationDB)).all()))
            print(f"✅ Eliminadas {count_before - count_after} reservas")
            print(f"📊 Reservas en BD después: {count_after}")
            
    except Exception as e:
        print(f"❌ Error al limpiar BD: {e}")
        import traceback
        traceback.print_exc()


def clear_google_calendar():
    """Elimina todos los eventos de los calendarios de profesionales."""
    print("\n" + "="*60)
    print("🗑️  LIMPIANDO GOOGLE CALENDAR")
    print("="*60)
    
    try:
        svc = build_calendar()
    except Exception as e:
        print(f"❌ No se pudo conectar a Google Calendar: {e}")
        return
    
    total_deleted = 0
    
    for pro_id, cal_id in PRO_CALENDAR.items():
        print(f"\n📅 Procesando calendario de {pro_id}...")
        print(f"   Calendar ID: {cal_id}")
        
        try:
            # Listar todos los eventos
            events = list_events_allpages(svc, cal_id)
            count = len(events)
            
            if count == 0:
                print(f"   ✅ Ya está vacío")
                continue
            
            print(f"   📊 Encontrados {count} eventos")
            
            # Eliminar cada evento
            deleted = 0
            for event in events:
                event_id = event.get('id')
                if event_id:
                    try:
                        delete_event(svc, cal_id, event_id)
                        deleted += 1
                        if deleted % 5 == 0:
                            print(f"   🗑️  Eliminados {deleted}/{count}...")
                    except Exception as e:
                        print(f"   ⚠️  Error eliminando {event_id}: {e}")
            
            print(f"   ✅ Eliminados {deleted} eventos")
            total_deleted += deleted
            
        except Exception as e:
            print(f"   ❌ Error procesando calendario: {e}")
    
    print(f"\n✅ Total eliminados de GCal: {total_deleted}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Resetea completamente el sistema de reservas",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EJEMPLOS:
    # Limpiar solo BD
    python scripts/reset_all.py --db-only
    
    # Limpiar solo GCal
    python scripts/reset_all.py --gcal-only
    
    # Limpiar todo (requiere confirmación)
    python scripts/reset_all.py --confirm

ADVERTENCIA:
    Este script ELIMINA TODOS LOS DATOS.
    Solo usar en desarrollo/testing.
        """
    )
    
    parser.add_argument("--db-only", action="store_true", help="Solo limpiar base de datos")
    parser.add_argument("--gcal-only", action="store_true", help="Solo limpiar Google Calendar")
    parser.add_argument("--confirm", action="store_true", help="Confirmar la eliminación")
    parser.add_argument("--yes", "-y", action="store_true", help="No pedir confirmación")
    
    args = parser.parse_args()
    
    # Validar que se pidió hacer algo
    if not args.db_only and not args.gcal_only and not args.confirm:
        print("\n⚠️  ADVERTENCIA: Este script eliminará TODAS las reservas")
        print("   Usa --confirm para limpiar BD + GCal")
        print("   Usa --db-only para limpiar solo BD")
        print("   Usa --gcal-only para limpiar solo GCal")
        print("\n   Ejecuta con --help para más información")
        return
    
    # Pedir confirmación si no se pasó --yes
    if not args.yes:
        print("\n" + "="*60)
        print("⚠️  ADVERTENCIA: ELIMINACIÓN DE DATOS")
        print("="*60)
        
        if args.confirm or (not args.db_only and not args.gcal_only):
            print("Se eliminarán:")
            print("  • TODAS las reservas de la base de datos")
            print("  • TODOS los eventos de Google Calendar")
        elif args.db_only:
            print("Se eliminarán:")
            print("  • TODAS las reservas de la base de datos")
        elif args.gcal_only:
            print("Se eliminarán:")
            print("  • TODOS los eventos de Google Calendar")
        
        print("\n¿Estás seguro? Esta acción NO se puede deshacer.")
        response = input("Escribe 'SI' en mayúsculas para confirmar: ")
        
        if response != "SI":
            print("\n❌ Operación cancelada")
            return
    
    print("\n" + "="*60)
    print("🚀 INICIANDO LIMPIEZA")
    print("="*60)
    
    # Ejecutar limpieza según opciones
    if args.db_only:
        clear_database()
    elif args.gcal_only:
        clear_google_calendar()
    else:
        clear_database()
        clear_google_calendar()
    
    print("\n" + "="*60)
    print("✅ LIMPIEZA COMPLETADA")
    print("="*60)
    print("\n💡 Sistema reseteado a cero citas")
    print("   Ahora puedes empezar a crear citas desde el frontend")
    print("   Las nuevas citas se guardarán en BD y se sincronizarán a GCal\n")


if __name__ == "__main__":
    main()
