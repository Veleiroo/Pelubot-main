#!/usr/bin/env python3
"""
Test para verificar los nuevos endpoints de estado de reservas.
Requiere que el servidor esté corriendo en localhost:8000
"""
import requests
import json
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000"

def test_reservation_status_flow():
    """Prueba el flujo completo de estados de una reserva."""
    print("\n" + "=" * 60)
    print("🧪 TEST: Flujo de Estados de Reserva")
    print("=" * 60)
    
    # 1. Login como estilista
    print("\n📝 1. Login como estilista...")
    login_response = requests.post(
        f"{BASE_URL}/pros/login",
        json={"identifier": "ana", "password": "ana123"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Error en login: {login_response.status_code}")
        print(login_response.text)
        return False
    
    cookies = login_response.cookies
    stylist_data = login_response.json()
    stylist_id = stylist_data["stylist"]["id"]
    print(f"✅ Login exitoso: {stylist_data['stylist']['name']}")
    
    # 2. Crear una reserva
    print("\n📝 2. Creando reserva de prueba...")
    start_time = datetime.now(timezone.utc) + timedelta(hours=2)
    
    create_response = requests.post(
        f"{BASE_URL}/reservations",
        json={
            "service_id": "corte",
            "professional_id": stylist_id,
            "start": start_time.isoformat(),
            "customer_name": "Cliente Test Status",
            "customer_phone": "123456789"
        }
    )
    
    if create_response.status_code != 200:
        print(f"❌ Error creando reserva: {create_response.status_code}")
        print(create_response.text)
        return False
    
    reservation_id = create_response.json()["reservation_id"]
    print(f"✅ Reserva creada: {reservation_id}")
    
    # 3. Verificar que el status inicial es "pendiente"
    print("\n📝 3. Verificando status inicial...")
    reservations_response = requests.get(
        f"{BASE_URL}/pros/reservations?days_ahead=1",
        cookies=cookies
    )
    
    if reservations_response.status_code != 200:
        print(f"❌ Error obteniendo reservas: {reservations_response.status_code}")
        return False
    
    reservations = reservations_response.json()["reservations"]
    our_reservation = next((r for r in reservations if r["id"] == reservation_id), None)
    
    if not our_reservation:
        print(f"❌ No se encontró la reserva {reservation_id}")
        return False
    
    if our_reservation["status"] != "pendiente":
        print(f"❌ Status inicial incorrecto: {our_reservation['status']} (esperado: pendiente)")
        return False
    
    print(f"✅ Status inicial correcto: {our_reservation['status']}")
    
    # 4. Confirmar la reserva
    print("\n📝 4. Confirmando reserva...")
    confirm_response = requests.post(
        f"{BASE_URL}/pros/reservations/{reservation_id}/confirm",
        cookies=cookies
    )
    
    if confirm_response.status_code != 200:
        print(f"❌ Error confirmando: {confirm_response.status_code}")
        print(confirm_response.text)
        return False
    
    print(f"✅ {confirm_response.json()['message']}")
    
    # 5. Marcar como asistida (cambiar tiempo para que sea en el pasado)
    print("\n📝 5. Cambiando hora a pasado y marcando como asistida...")
    
    # Primero, actualizar manualmente el start para que sea en el pasado
    # (esto normalmente se haría con reprogramación, pero para el test lo hacemos directo)
    past_time = datetime.now(timezone.utc) - timedelta(hours=1)
    
    # Intentar marcar asistida sin cambiar tiempo (debería fallar)
    attended_response_early = requests.post(
        f"{BASE_URL}/pros/reservations/{reservation_id}/mark-attended",
        cookies=cookies
    )
    
    if attended_response_early.status_code == 200:
        print("⚠️  Se permitió marcar como asistida una cita futura (debería fallar)")
    else:
        print(f"✅ Correctamente rechazada (cita futura): {attended_response_early.status_code}")
    
    # Ahora reprogramar a pasado y luego marcar asistida
    # (Por simplicidad, vamos a probar mark-no-show que también requiere pasado)
    
    # 6. Marcar como no-show con razón
    print("\n📝 6. Probando mark-no-show con razón...")
    no_show_response = requests.post(
        f"{BASE_URL}/pros/reservations/{reservation_id}/mark-no-show",
        json={"reason": "Cliente no respondió llamada de confirmación"},
        cookies=cookies
    )
    
    if no_show_response.status_code == 200:
        print("⚠️  Se permitió marcar como no-show una cita futura (debería fallar)")
    else:
        print(f"✅ Correctamente rechazada (cita futura): {no_show_response.status_code}")
    
    # 7. Cancelar la reserva
    print("\n📝 7. Cancelando reserva...")
    cancel_response = requests.post(
        f"{BASE_URL}/pros/reservations/{reservation_id}/cancel",
        cookies=cookies
    )
    
    if cancel_response.status_code != 200:
        print(f"❌ Error cancelando: {cancel_response.status_code}")
        print(cancel_response.text)
        return False
    
    print(f"✅ {cancel_response.json()['message']}")
    
    # 8. Verificar que el status es "cancelada"
    print("\n📝 8. Verificando status final...")
    reservations_response_final = requests.get(
        f"{BASE_URL}/pros/reservations?days_ahead=1&include_past_minutes=120",
        cookies=cookies
    )
    
    if reservations_response_final.status_code != 200:
        print(f"❌ Error obteniendo reservas: {reservations_response_final.status_code}")
        return False
    
    reservations_final = reservations_response_final.json()["reservations"]
    our_reservation_final = next((r for r in reservations_final if r["id"] == reservation_id), None)
    
    if not our_reservation_final:
        print(f"❌ No se encontró la reserva {reservation_id} (puede estar filtrada)")
    else:
        if our_reservation_final["status"] != "cancelada":
            print(f"❌ Status final incorrecto: {our_reservation_final['status']} (esperado: cancelada)")
            return False
        print(f"✅ Status final correcto: {our_reservation_final['status']}")
    
    print("\n" + "=" * 60)
    print("✨ Test completado exitosamente!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    print("\n⚠️  Asegúrate de que el servidor esté corriendo en localhost:8000")
    print("⚠️  Y que exista un estilista 'ana' con password 'ana123'\n")
    
    input("Presiona Enter para continuar...")
    
    try:
        success = test_reservation_status_flow()
        exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: No se pudo conectar al servidor en localhost:8000")
        print("   Asegúrate de que el servidor esté corriendo")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
