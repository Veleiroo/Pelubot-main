# Backend Notes

## Visión general
- `backend/app/main.py`: arranque FastAPI, middlewares, ciclo de vida (crea BD, sync opcional GCal).
- `backend/app/api/routes.py`: rutas HTTP (públicas, operaciones de reservas, administración).
- `backend/app/services/logic.py`: reglas de negocio para slots, reservas, sincronización GCal.
- `backend/app/models.py`: modelos Pydantic/SQLModel usados por la API y la BD.
- `backend/app/data.py`: catálogo estático (servicios, profesionales, horario, calendarios).
- `backend/app/db.py`: motor SQLite y creación de tablas/índices/triggers.
- `backend/app/integrations/google_calendar.py`: cliente Google Calendar (credenciales, helpers, cliente fake).

## Middlewares clave
- `RequestIDMiddleware`: genera X-Request-ID y añade info de latencia.
- `RateLimitMiddleware`: limita peticiones por clave/ruta (protección básica).
- `MetricsMiddleware`: expone métricas Prometheus (`/metrics`).

## Flujo /slots
1. Ruta `/slots` valida fecha/servicio/profesional.
2. Llama a `find_available_slots` (logic.py).
3. Se generan slots dentro del horario (`WEEKLY_SCHEDULE`).
4. Se filtra contra reservas en BD y, si aplica, `freebusy` de Google Calendar.
5. Se devuelven las horas libres en formato ISO.

(Continuará con reservas...)

## Flujo /reservations (crear)
1. Ruta POST `/reservations` exige API key (`require_api_key`).
2. Valida payload con `ReservationIn` (servicio, profesional, start datetime).
3. Normaliza zona horaria (`TZ`), verifica reglas (`validate_target_dt`).
4. Calcula `end` usando la duración del servicio (`SERVICE_BY_ID`).
5. Obtiene slots del día y comprueba que el inicio solicitado está libre.
6. Abre transacción SQLite (`BEGIN IMMEDIATE`), verifica solapes directos en BD.
7. Inserta fila `ReservationDB` y confirma (`session.commit()`).
8. Intenta crear evento en Google Calendar (`create_gcal_reservation`); si funciona, actualiza `google_event_id` en la reserva. Si falla, continúa con warning.
9. Responde con `ActionResult` indicando ID de la reserva (y opcionalmente el evento GCal).

## Flujo cancelación
- POST `/cancel_reservation` y DELETE `/reservations/{id}` comparten lógica:
  1. Validan API key.
  2. Buscan la reserva (`find_reservation`).
  3. Si tiene `google_event_id`, eliminan el evento (`delete_gcal_reservation`).
  4. Borran la fila en BD (`cancel_reservation`).
  5. Incrementan métrica `RESERVATIONS_CANCELLED` y devuelven `ActionResult`.

## Flujo /reschedule (resumen)
1. Ruta POST `/reschedule` valida API key y payload (`RescheduleIn`).
2. Determina nuevo inicio (acepta `new_start` ISO o combinación fecha/hora).
3. Verifica horario laboral y solapes con `apply_reschedule`.
4. Si la reserva está sincronizada con Google Calendar:
   - Si cambia de profesional ➝ borra evento antiguo, crea uno en calendario nuevo.
   - Si se mantiene ➝ `patch_gcal_reservation`.
5. Actualiza `ReservationDB` con nuevos valores y devuelve `RescheduleOut`.

### Detalle validaciones creación de reserva
- `Payload`: cuerpo JSON del POST a `/reservations` con los campos mínimos (`service_id`, `professional_id`, `start`).
- `ReservationIn` (`backend/app/models.py:74`) valida tipos, fuerza tz si viene naive y aplica `validate_target_dt`.
- La ruta (`routes.py`) añade cheques manuales:
  - servicio/profesional existen en catálogos (`SERVICE_BY_ID`, `PRO_BY_ID`).
  - el profesional realmente ofrece ese servicio.
  - la hora solicitada sigue disponible tras recalcular slots del día.
- Antes de insertar se abre transacción `BEGIN IMMEDIATE` para bloquear la tabla en SQLite y evitar solapes concurrentes.
- Llamadas a Google Calendar se hacen después del `commit` principal para no romper la reserva si GCal falla.

### Modelos implicados
- `ReservationIn`: entrada para crear (service_id, professional_id, start).
- `ReservationDB`: modelo SQLModel usado para persistir (incluye `google_event_id`, timestamps, etc.).
- `ActionResult`: respuesta genérica `{ ok: bool, message: str }`.

## Ideas futuras / pendientes
- Revisar si `ReservationIn.end` debería seguir permitiéndose como opcional o eliminarlo/sincronizarlo con duración calculada, una vez consolidado el frontend.
- Integraciones GCal: `USE_GCAL_BUSY` queda desactivado por defecto; sólo los flujos admin deberían solicitar disponibilidad contra Google.
- Google OAuth: `_load_user_creds` refresca el token y lo guarda de nuevo en el JSON indicado por `GOOGLE_OAUTH_JSON`. Mantén ese fichero fuera del repo (añádelo a `.gitignore`).
- `PUBLIC_RESERVATIONS_ENABLED`: permite crear reservas sin API key para el flujo público (dejar en `false` si no se controla desde frontend propio).

## Despliegue rápido
- Variables clave (.env):
  - `API_KEY`: clave para endpoints protegidos.
  - `VITE_API_BASE_URL` / `VITE_API_KEY`: usadas por el frontend para apuntar al backend.
  - `USE_GCAL_BUSY`: deja en `false` para producción enfocada en PeluBot; actívalo si quieres forzar consultas a Google Calendar.
  - `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_OAUTH_JSON`: necesarios sólo si se usará sincronización real con GCal.
- Comandos útiles:
  - `pytest backend/tests` para validar backend.
  - `python -m backend.scripts.sync_cli` para sincronizaciones puntuales con GCal.
