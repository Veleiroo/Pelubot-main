"""Pruebas de salud y flujo básico de reservas."""

from datetime import date, timedelta
import pytest
import os

API_KEY = "test-api-key"
os.environ["API_KEY"] = API_KEY

def test_health(app_client):
    r = app_client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

def test_slots_validation_errors(app_client):
    # formato de fecha incorrecto
    r = app_client.post("/slots", json={"service_id": "corte_cabello", "date_str": "06-09-2025"})
    assert r.status_code == 400
    assert "YYYY-MM-DD" in r.json()["detail"]
    # pasado
    r = app_client.post("/slots", json={"service_id": "corte_cabello", "date_str": "2024-01-01"})
    assert r.status_code == 400
    assert "pasado" in r.json()["detail"].lower()

@pytest.mark.parametrize(
    "service_id",
    [
        "corte_cabello",
        "corte_barba",
        "arreglo_barba",
        "corte_jubilado",
    ],
)
def test_create_list_cancel_reservation_flow(app_client, service_id: str):
    # Fecha futura cercana (evitar domingo)
    target = date.today() + timedelta(days=30)
    while target.weekday() == 6:
        target += timedelta(days=1)

    # 1) obtener slots
    r = app_client.post(
        "/slots",
        json={"service_id": service_id, "date_str": target.isoformat(), "professional_id": "deinis"},
    )
    assert r.status_code == 200
    slots = r.json()["slots"]
    assert isinstance(slots, list) and len(slots) > 0
    start = slots[0]

    # 2) crear reserva (requiere API Key)
    payload = {
        "service_id": service_id,
        "professional_id": "deinis",
        "start": start
    }
    r = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    res_id = data.get("reservation_id")
    assert res_id

    # 3) conflictiva: volver a reservar el mismo slot debe fallar
    r2 = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
    assert r2.status_code == 400
    assert "no está disponible" in r2.json()["detail"].lower()

    # 4) cancelar (DELETE)
    r3 = app_client.delete(f"/reservations/{res_id}", headers={"X-API-Key": API_KEY})
    assert r3.status_code == 200
    assert r3.json()["ok"] is True


def test_bulk_reservations_fill_schedule(app_client):
    """Crea varias reservas consecutivas y verifica que el calendario se llena sin solapes."""
    target = date.today() + timedelta(days=21)
    while target.weekday() == 6:
        target += timedelta(days=1)

    # Obtener todos los huecos iniciales para Ana
    resp = app_client.post(
        "/slots",
        json={"service_id": "corte_cabello", "date_str": target.isoformat(), "professional_id": "deinis"},
    )
    assert resp.status_code == 200
    slots = resp.json()["slots"]
    assert len(slots) >= 6  # corte de cabello son 30 min, jornada típica dará varios huecos

    created_ids = []
    for start in slots:
        payload = {"service_id": "corte_cabello", "professional_id": "deinis", "start": start}
        r = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
        if r.status_code == 400:
            # En caso de carreras, el hueco ya no está disponible (esperado cuando el turno se llena)
            assert "no está disponible" in r.json()["detail"].lower()
            break
        assert r.status_code == 200, r.text
        res_id = r.json().get("reservation_id")
        assert res_id
        created_ids.append(res_id)

    # Intentar crear una reserva adicional debe fallar porque no quedan huecos
    if created_ids:
        last_slot = slots[min(len(created_ids), len(slots)) - 1]
        payload = {"service_id": "corte_cabello", "professional_id": "deinis", "start": last_slot}
        r = app_client.post("/reservations", headers={"X-API-Key": API_KEY}, json=payload)
        assert r.status_code == 400
        assert "no está disponible" in r.json()["detail"].lower()

    # Limpieza: cancelar las reservas creadas
    for res_id in created_ids:
        app_client.delete(f"/reservations/{res_id}", headers={"X-API-Key": API_KEY})
