# Runbook de Operaciones

## Fallo en Google Calendar
1. Revisar logs del backend (`backend/server2.log`).
2. Verificar credenciales (`GOOGLE_SERVICE_ACCOUNT_JSON` o `GOOGLE_OAUTH_JSON`).
3. Probar `/ready` para ver detalle del error.
4. Reintentar sincronización con `POST /admin/sync` (import|push).

## Huecos incoherentes
1. Ejecutar `POST /admin/conflicts` para detectar discrepancias.
2. Ejecutar `POST /admin/sync` en modo `both` para reconciliar.
3. Si persisten, revisar eventos manualmente en GCal.

## Restaurar copia de seguridad (SQLite)
1. Detener el servicio.
2. Sustituir el archivo de BD por el backup (`backend/app/data/*.db`).
3. Reiniciar y verificar integridad.

## Webhooks de mensajería
- Validar que los tokens y secretos están activos.
- Revisar respuestas de la API externa ante fallos.
## Utilidades Makefile
- `make dev-start PORT=8776 FAKE=0` — arranca backend
- `make dev-clear` — borra eventos de GCal (requiere API_KEY)
- `make dev-demo` — flujo de demo end-to-end
- `make conflicts` — detecta conflictos en un rango

## Reset sincronización y validación integral
1. Limpiar estado previo (BD + Google Calendar):
  ```bash
  make wipe-reservations
  DRY_RUN=0 make gcal-clear-range
  ```
2. Ejecutar la validación completa (crea y cancela una reserva por servicio, comprobando `google_event_id`):
  ```bash
  API_KEY=<tu_api_key> python backend/scripts/validate_services.py
  ```
  - El script imprime un registro JSON por servicio con la hora utilizada, el `reservation_id` y el evento generado en Google.
  - Por defecto cancela cada reserva inmediatamente; añade `--keep` si quieres revisar los eventos en el calendario antes de borrarlos.
3. Lanzar una prueba de estrés ligera (20 ciclos create/cancel sobre el servicio base):
  ```bash
  API_KEY=<tu_api_key> python backend/scripts/validate_services.py --stress 20
  ```
  - Ajusta `--stress N` para más iteraciones y `--stress-service/--stress-pro` si quieres focos distintos.
4. Revisar la salida final:
  - `"conflictos"` sin discrepancias confirma que no quedan orfanatos en GCal.
  - `"stress"` indica número de iteraciones exitosas; cualquier fallo se lista con el motivo.

> Referencia: el script vive en `backend/scripts/validate_services.py` y utiliza el catálogo de `app/data.py` para iterar todos los servicios disponibles.

## Frontend (desarrollo)
- Variables en `Frontend/shadcn-ui/.env`:
  - `VITE_API_BASE_URL=http://127.0.0.1:8776` (o `/api` si usas nginx)
  - `VITE_API_KEY` debe coincidir con `API_KEY` del backend, salvo que `ALLOW_LOCAL_NO_AUTH=true` en `backend/.env`.
- Arranca: `make dev-start` y en otra terminal `make front-dev`.
