#!/usr/bin/env python3
"""
Script de diagnóstico para verificar el estado de sincronización entre BD y Google Calendar.

USO:
    python scripts/check_sync_status.py
"""
import sys
from pathlib import Path
from datetime import date, timedelta

# Ajusta el path para importar módulos del backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select
from app.db import engine
from app.models import ReservationDB, StylistDB
from app.integrations.google_calendar import build_calendar, list_events_range
from app.data import get_professional_calendars
from datetime import datetime

def count_db_reservations(session: Session, days_back: int = 30) -> dict:
    """Cuenta las reservas en la base de datos."""
    start = date.today() - timedelta(days=days_back)
    
    query = select(ReservationDB).where(
        ReservationDB.start >= datetime.combine(start, datetime.min.time())
    )
    
    reservations = list(session.exec(query))
    
    by_status = {}
    for res in reservations:
        status = getattr(res, 'status', 'confirmada')
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total": len(reservations),
        "by_status": by_status,
        "with_gcal_id": sum(1 for r in reservations if r.google_event_id),
        "without_gcal_id": sum(1 for r in reservations if not r.google_event_id),
    }


def count_gcal_events(days_back: int = 30) -> dict:
    """Cuenta los eventos en Google Calendar."""
    try:
        svc = build_calendar()
    except Exception as e:
        return {"error": f"No se pudo conectar a Google Calendar: {e}"}
    
    start = date.today() - timedelta(days=days_back)
    end = date.today() + timedelta(days=7)
    
    total_events = 0
    by_calendar = {}
    
    for pro_id, cal_id in get_professional_calendars().items():
        try:
            events = list_events_range(
                svc,
                cal_id,
                f"{start.isoformat()}T00:00:00",
                f"{end.isoformat()}T23:59:59",
            )
            count = len(events)
            by_calendar[pro_id] = {"calendar_id": cal_id, "events": count}
            total_events += count
        except Exception as e:
            by_calendar[pro_id] = {"calendar_id": cal_id, "error": str(e)}
    
    return {
        "total": total_events,
        "by_calendar": by_calendar,
    }


def main():
    print("\n" + "="*70)
    print(" 🔍 DIAGNÓSTICO DE SINCRONIZACIÓN - Pelubot")
    print("="*70)
    
    days = 30
    print(f"\n📅 Analizando últimos {days} días...\n")
    
    # Check BD
    print("="*70)
    print("📊 BASE DE DATOS (SQLite)")
    print("="*70)
    
    try:
        with Session(engine) as session:
            db_stats = count_db_reservations(session, days)
            
            if db_stats["total"] == 0:
                print("❌ La base de datos está VACÍA - No hay reservas")
                print("   ⚠️  Esto explica por qué el portal no muestra citas")
            else:
                print(f"✅ Total de reservas: {db_stats['total']}")
                print(f"\n📈 Por estado:")
                for status, count in db_stats["by_status"].items():
                    print(f"   • {status}: {count}")
                
                print(f"\n🔗 Sincronización con GCal:")
                print(f"   • Con google_event_id: {db_stats['with_gcal_id']}")
                print(f"   • Sin google_event_id: {db_stats['without_gcal_id']}")
                
                if db_stats["without_gcal_id"] > 0:
                    print(f"   ⚠️  {db_stats['without_gcal_id']} reservas NO están sincronizadas con GCal")
    
    except Exception as e:
        print(f"❌ Error al consultar la base de datos: {e}")
    
    # Check Google Calendar
    print("\n" + "="*70)
    print("🗓️  GOOGLE CALENDAR")
    print("="*70)
    
    gcal_stats = count_gcal_events(days)
    
    if "error" in gcal_stats:
        print(f"❌ {gcal_stats['error']}")
        print("   💡 Verifica que las credenciales de Google estén configuradas")
    else:
        if gcal_stats["total"] == 0:
            print("❌ No hay eventos en Google Calendar")
        else:
            print(f"✅ Total de eventos: {gcal_stats['total']}")
            print(f"\n📋 Por profesional:")
            for pro_id, info in gcal_stats["by_calendar"].items():
                if "error" in info:
                    print(f"   • {pro_id} ({info['calendar_id']}): ❌ {info['error']}")
                else:
                    print(f"   • {pro_id} ({info['calendar_id']}): {info['events']} eventos")
    
    # Diagnóstico y recomendaciones
    print("\n" + "="*70)
    print("💡 DIAGNÓSTICO")
    print("="*70)
    
    try:
        db_total = db_stats["total"]
        gcal_total = gcal_stats.get("total", 0)
        
        if db_total == 0 and gcal_total > 0:
            print("\n🔴 PROBLEMA IDENTIFICADO:")
            print(f"   • Google Calendar tiene {gcal_total} eventos")
            print(f"   • Base de datos tiene {db_total} reservas")
            print("\n✅ SOLUCIÓN:")
            print("   Ejecuta la sincronización para importar eventos de GCal a BD:")
            print("\n   python scripts/sync_gcal_to_db.py --days 30 --mode import")
            print("\n   O desde la raíz del proyecto:")
            print("   cd backend && python scripts/sync_gcal_to_db.py --current-month")
            
        elif db_total > 0 and gcal_total == 0:
            print("\n⚠️  ADVERTENCIA:")
            print(f"   • Base de datos tiene {db_total} reservas")
            print(f"   • Google Calendar tiene {gcal_total} eventos")
            print("\n💡 RECOMENDACIÓN:")
            print("   Sincroniza BD → GCal para exportar las reservas:")
            print("\n   python scripts/sync_gcal_to_db.py --days 30 --mode push")
            
        elif db_total == gcal_total and db_total > 0:
            print("\n✅ SINCRONIZACIÓN PARECE CORRECTA")
            print(f"   Ambos sistemas tienen {db_total} registros")
            if db_stats.get("without_gcal_id", 0) > 0:
                print(f"\n⚠️  Pero hay {db_stats['without_gcal_id']} reservas sin google_event_id")
                print("   Ejecuta sincronización bidireccional:")
                print("\n   python scripts/sync_gcal_to_db.py --days 30 --mode both")
            
        elif abs(db_total - gcal_total) > 0:
            print("\n⚠️  DESINCRONIZACIÓN DETECTADA:")
            print(f"   • Base de datos: {db_total} reservas")
            print(f"   • Google Calendar: {gcal_total} eventos")
            print(f"   • Diferencia: {abs(db_total - gcal_total)}")
            print("\n✅ SOLUCIÓN:")
            print("   Ejecuta sincronización bidireccional:")
            print("\n   python scripts/sync_gcal_to_db.py --days 30 --mode both")
            
        else:
            print("\n⚠️  Ambos sistemas están vacíos")
            print("   No hay datos para sincronizar")
    
    except Exception as e:
        print(f"\n❌ Error en diagnóstico: {e}")
    
    print("\n" + "="*70)
    print("📚 Más información: SYNC_PROBLEM.md")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
