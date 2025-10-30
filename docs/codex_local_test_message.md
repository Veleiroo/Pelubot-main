# Mensaje para Codex local: validar cola de Google Calendar

Hola Codex local,

Necesito que verifiques la rama `work` con la cola asíncrona de Google Calendar. Los pasos que quiero que sigas son:

1. **Actualizar el entorno**
   - `git checkout work && git pull`
   - `pip install -r backend/requirements-dev.txt`
   - `pip install httpx` (lo necesita `fastapi.testclient`)

2. **Ejecutar los tests clave con el fake de GCal**
   - `export PELUBOT_FAKE_GCAL=1`
   - `pytest backend/tests/test_stylist_reservations.py`

3. **Smoke test manual con la app levantada**
   - `make dev-start`
   - Espera a ver en logs: `Worker de sincronización Google Calendar iniciado.`
   - Exporta la clave usada por el backend (`export API_KEY=<la-misma-clave-segura>`).
   - Con la app arriba, crea una reserva futura (ejemplo 24 h hacia delante) encolando la sincronización:
     ```bash
     curl -X POST http://localhost:8000/reservations \
       -H 'Content-Type: application/json' \
       -H "X-API-Key: ${API_KEY}" \
       -d '{
         "service_id": "corte_cabello",
         "professional_id": "deinis",
         "start": "'"$(date -u -d '+1 day' '+%Y-%m-%dT%H:00:00Z')"'",
         "customer_name": "Cliente Test",
         "customer_phone": "+34123456789"
       }'
     ```
   - Comprueba que la respuesta contiene `"sync_status": "queued"` y un `sync_job_id` distinto de `null`.

4. **Confirmar que el worker procesa el job**
   - `sqlite3 backend/app/data/pelubot.db "SELECT id, status, attempts, last_error FROM calendar_sync_jobs ORDER BY id DESC LIMIT 5;"`
   - Debes ver el job en `completed` una vez lo procese el worker con el fake.

5. **Cancelar la reserva y validar que se vuelve a encolar**
   - `curl -X POST http://localhost:8000/reservations/<id-obtenido>/cancel -H "X-API-Key: ${API_KEY}"`
   - Verifica que se añade un nuevo registro `DELETE` en `calendar_sync_jobs` y que también pasa a `completed`.

Cualquier fallo (tests, worker sin arrancar o jobs quedándose en `failed`) repórtalo con logs y payload usado.

¡Gracias!
