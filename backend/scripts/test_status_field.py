#!/usr/bin/env python3
"""
Test básico para verificar que el campo status funciona correctamente.
"""
import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timezone, timedelta
from app.db import get_session, engine
from app.models import ReservationDB, StylistDB
from sqlmodel import select

pytestmark = pytest.mark.skip(reason="Script manual; requiere base de datos en ejecución")

def test_status_field():
    """Prueba que el campo status funciona correctamente."""
    print("\n🧪 Test: Campo 'status' en ReservationDB")
    print("=" * 60)
    
    # Verificar que exista un estilista
    with next(get_session()) as session:
        stylist = session.exec(select(StylistDB)).first()
        if not stylist:
            print("⚠️  No hay estilistas en la BD. Creando uno de prueba...")
            stylist = StylistDB(
                id="test-stylist",
                name="Test Stylist",
                password_hash="$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
                services=["corte"],
            )
            session.add(stylist)
            session.commit()
            session.refresh(stylist)
            print(f"✅ Estilista creado: {stylist.id}")
    
    # Crear una reserva de prueba
    print("\n📝 Creando reserva de prueba...")
    test_id = "test-reservation-status"
    now = datetime.now(timezone.utc)
    start = now + timedelta(days=1)
    end = start + timedelta(minutes=45)
    
    with next(get_session()) as session:
        # Eliminar si existe
        existing = session.get(ReservationDB, test_id)
        if existing:
            session.delete(existing)
            session.commit()
        
        # Crear nueva reserva (sin especificar status, debe usar default)
        reservation = ReservationDB(
            id=test_id,
            service_id="corte",
            professional_id=stylist.id,
            start=start,
            end=end,
            customer_name="Test Customer",
            customer_phone="123456789",
        )
        session.add(reservation)
        session.commit()
        session.refresh(reservation)
        
        print(f"✅ Reserva creada: {reservation.id}")
        print(f"   Status: {reservation.status}")
        
        # Verificar que el status por defecto es 'confirmada'
        assert reservation.status == "confirmada", f"Expected 'confirmada', got '{reservation.status}'"
        print("✅ Status por defecto correcto: 'confirmada'")
        
        # Probar cambiar el status
        print("\n📝 Probando cambios de status...")
        
        reservation.status = "asistida"
        session.add(reservation)
        session.commit()
        session.refresh(reservation)
        
        assert reservation.status == "asistida", f"Expected 'asistida', got '{reservation.status}'"
        print(f"✅ Status actualizado a: {reservation.status}")
        
        reservation.status = "no_asistida"
        session.add(reservation)
        session.commit()
        session.refresh(reservation)
        
        assert reservation.status == "no_asistida", f"Expected 'no_asistida', got '{reservation.status}'"
        print(f"✅ Status actualizado a: {reservation.status}")
        
        reservation.status = "cancelada"
        session.add(reservation)
        session.commit()
        session.refresh(reservation)
        
        assert reservation.status == "cancelada", f"Expected 'cancelada', got '{reservation.status}'"
        print(f"✅ Status actualizado a: {reservation.status}")
        
        # Limpiar
        print("\n🧹 Limpiando datos de prueba...")
        session.delete(reservation)
        session.commit()
        print("✅ Reserva de prueba eliminada")
    
    print("\n" + "=" * 60)
    print("✨ Todos los tests pasaron exitosamente!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_status_field()
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ Test falló: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
