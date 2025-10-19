#!/usr/bin/env python3
"""
Script para sincronizar eventos de Google Calendar a la base de datos.

PROBLEMA:
- Si tienes citas creadas manualmente en Google Calendar
- La base de datos está vacía
- El frontend del portal de profesionales consulta la BD, no GCal directamente

SOLUCIÓN:
- Este script importa todos los eventos de GCal a la BD
- Mantiene sincronización bidireccional

USO:
    python scripts/sync_gcal_to_db.py [--days DÍAS] [--mode MODE]

EJEMPLOS:
    # Importar últimos 30 días
    python scripts/sync_gcal_to_db.py --days 30

    # Importar y exportar (sincronización completa)
    python scripts/sync_gcal_to_db.py --mode both --days 60

    # Solo del mes actual
    python scripts/sync_gcal_to_db.py --mode import --current-month

MODOS:
    import - Solo importa de GCal a BD (defecto, seguro)
    push   - Solo exporta de BD a GCal
    both   - Sincronización bidireccional completa
"""
import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

# Ajusta el path para importar módulos del backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

API_BASE = os.getenv("VITE_API_BASE_URL", "http://127.0.0.1:8000")
API_KEY = os.getenv("VITE_API_KEY", os.getenv("API_KEY", "changeme"))


def sync_calendar(
    mode: str = "import",
    start_date: date | None = None,
    end_date: date | None = None,
    days: int | None = None,
    by_professional: bool = True,
    calendar_id: str | None = None,
    professional_id: str | None = None,
    default_service: str = "corte_cabello",
) -> dict:
    """
    Sincroniza Google Calendar con la base de datos.
    
    Args:
        mode: 'import' (GCal->BD), 'push' (BD->GCal), o 'both'
        start_date: Fecha de inicio (defecto: hoy)
        end_date: Fecha de fin (defecto: start + days)
        days: Número de días desde start (defecto: 7)
        by_professional: Usar calendarios por profesional (defecto: True)
        calendar_id: ID específico de calendario (opcional)
        professional_id: ID específico de profesional (opcional)
        default_service: Servicio por defecto para eventos sin metadata
    
    Returns:
        Respuesta del servidor con estadísticas de sincronización
    """
    url = f"{API_BASE.rstrip('/')}/admin/sync"
    
    payload = {
        "mode": mode,
        "by_professional": by_professional,
        "default_service": default_service,
    }
    
    if start_date:
        payload["start"] = start_date.isoformat()
    if end_date:
        payload["end"] = end_date.isoformat()
    elif days:
        payload["days"] = days
    
    if calendar_id:
        payload["calendar_id"] = calendar_id
    if professional_id:
        payload["professional_id"] = professional_id
    
    headers = {"X-API-Key": API_KEY} if API_KEY else {}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"ok": False, "error": str(e)}


def print_results(result: dict):
    """Muestra los resultados de la sincronización de forma legible."""
    print("\n" + "="*60)
    print("RESULTADOS DE SINCRONIZACIÓN")
    print("="*60)
    
    if not result.get("ok", False):
        print(f"❌ ERROR: {result.get('error', 'Desconocido')}")
        if "errors" in result:
            print("\nErrores detallados:")
            for name, error in result["errors"].items():
                print(f"  - {name}: {error}")
        return
    
    print(f"✅ Sincronización completada exitosamente")
    print(f"📅 Modo: {result.get('mode', 'N/A').upper()}")
    
    if "range" in result:
        start, end = result["range"]
        print(f"📆 Rango: {start} → {end}")
    
    results = result.get("results", {})
    
    if "import" in results:
        imp = results["import"]
        print(f"\n📥 IMPORTACIÓN (GCal → BD):")
        print(f"   • Insertadas: {imp.get('inserted', 0)} citas nuevas")
        print(f"   • Actualizadas: {imp.get('updated', 0)} citas existentes")
        print(f"   • Calendarios procesados: {imp.get('calendars', 0)}")
        if not imp.get("ok", True):
            print(f"   ⚠️  Error: {imp.get('error', 'Desconocido')}")
    
    if "push" in results:
        push = results["push"]
        print(f"\n📤 EXPORTACIÓN (BD → GCal):")
        print(f"   • Creados: {push.get('created', 0)} eventos en GCal")
        print(f"   • Actualizados: {push.get('patched', 0)} eventos en GCal")
        print(f"   • Calendarios procesados: {push.get('calendars', 0)}")
        if not push.get("ok", True):
            print(f"   ⚠️  Error: {push.get('error', 'Desconocido')}")
    
    print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Sincroniza eventos entre Google Calendar y la base de datos",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    
    parser.add_argument(
        "--mode",
        choices=["import", "push", "both"],
        default="import",
        help="Modo de sincronización (defecto: import - solo importar de GCal a BD)",
    )
    
    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help="Número de días a sincronizar desde hoy (defecto: 7)",
    )
    
    parser.add_argument(
        "--start",
        type=str,
        default=None,
        help="Fecha de inicio en formato YYYY-MM-DD (defecto: hoy)",
    )
    
    parser.add_argument(
        "--end",
        type=str,
        default=None,
        help="Fecha de fin en formato YYYY-MM-DD",
    )
    
    parser.add_argument(
        "--current-month",
        action="store_true",
        help="Sincronizar solo el mes actual",
    )
    
    parser.add_argument(
        "--last-month",
        action="store_true",
        help="Sincronizar solo el mes pasado",
    )
    
    parser.add_argument(
        "--calendar-id",
        type=str,
        default=None,
        help="ID específico de calendario de Google (opcional)",
    )
    
    parser.add_argument(
        "--professional-id",
        type=str,
        default=None,
        help="ID específico de profesional (opcional)",
    )
    
    parser.add_argument(
        "--service",
        type=str,
        default="corte_cabello",
        help="Servicio por defecto para eventos sin metadata (defecto: corte_cabello)",
    )
    
    args = parser.parse_args()
    
    # Determinar rango de fechas
    start_date = None
    end_date = None
    days = args.days
    
    if args.current_month:
        today = date.today()
        start_date = today.replace(day=1)
        # Último día del mes
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        days = None
    elif args.last_month:
        today = date.today()
        # Primer día del mes pasado
        if today.month == 1:
            start_date = today.replace(year=today.year - 1, month=12, day=1)
        else:
            start_date = today.replace(month=today.month - 1, day=1)
        # Último día del mes pasado
        end_date = today.replace(day=1) - timedelta(days=1)
        days = None
    else:
        if args.start:
            start_date = date.fromisoformat(args.start)
        if args.end:
            end_date = date.fromisoformat(args.end)
    
    print(f"\n🔄 Iniciando sincronización...")
    print(f"🌐 API Base: {API_BASE}")
    print(f"🔑 API Key: {'✓ Configurada' if API_KEY else '✗ No configurada'}")
    
    result = sync_calendar(
        mode=args.mode,
        start_date=start_date,
        end_date=end_date,
        days=days,
        calendar_id=args.calendar_id,
        professional_id=args.professional_id,
        default_service=args.service,
    )
    
    print_results(result)
    
    # Exit code basado en el resultado
    sys.exit(0 if result.get("ok", False) else 1)


if __name__ == "__main__":
    main()
