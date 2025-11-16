# Backend

## Estructura principal

- `backend/app/main.py`: arranque FastAPI, middlewares, dependencias y ciclo de vida (creación de BD y sincronización opcional con Google Calendar).
- `backend/app/api/routes.py`: rutas públicas, endpoints de reservas y operaciones administrativas protegidas por API key.
- `backend/app/services/logic.py`: reglas de negocio para slots, reservas y sincronización con calendarios externos.
- `backend/app/models.py`: modelos Pydantic/SQLModel usados en la API y la base de datos.
- `backend/app/data.py`: catálogo estático de servicios, profesionales y horarios.
- `backend/app/db.py`: inicialización SQLite, creación de índices y helpers de transacción.
- `backend/app/integrations/google_calendar.py`: cliente Google Calendar (service account u OAuth) y cliente “fake” para desarrollo.

### Middlewares destacados

- `RequestIDMiddleware`: anota `X-Request-ID` y latencia.
- `RateLimitMiddleware`: limita peticiones por ruta/clave.
- `MetricsMiddleware`: expone `/metrics` con Prometheus.

## Flujos de API

### Disponibilidad (`/slots`)
1. Valida servicio, fecha y profesional recibidos.
2. Genera slots basados en `WEEKLY_SCHEDULE`.
3. Filtra contra reservas en BD y, si procede, eventos externos (`freebusy` de Google Calendar).
4. Devuelve horas libres en formato ISO.

### Creación de reservas (`POST /reservations`)
1. Requiere API key (`require_api_key`).
2. Valida payload (`ReservationIn`), normaliza zona horaria y verifica reglas de negocio.
3. Calcula `end` según la duración del servicio.
4. Comprueba que el slot sigue libre recalculando disponibilidad del día.
5. Abre transacción `BEGIN IMMEDIATE`, detecta solapes en BD y guarda la reserva.
6. Crea evento en Google Calendar cuando aplica, sin fallar la reserva si hay errores externos.
7. Responde con `ActionResult` y el `reservation_id`.

### Cancelación (`POST /reservations/{id}/cancel`)
- Valida API key, localiza la reserva, elimina el evento de Calendar si existe, borra la fila y actualiza métricas.

### Reprogramación (`POST /reservations/{id}/reschedule`)
1. Acepta `new_start` ISO o combinación `new_date` + `new_time`.
2. Verifica disponibilidad y horario laboral.
3. Si la reserva estaba sincronizada, actualiza o recrea el evento de Calendar según cambie de profesional.
4. Actualiza la fila y devuelve nuevo `start`/`end`.

## Sincronización con Google Calendar

- La base de datos es la fuente de verdad; cada reserva guarda `google_event_id` y `google_calendar_id`.
- Los endpoints administrativos (`POST /admin/sync`, `POST /admin/conflicts`) permiten importar, empujar y reconciliar datos.
- Idempotencia por `reservation.id`; reintentos con backoff ante 5xx o rate limits.
- Banderas de entorno útiles:
  - `PELUBOT_FAKE_GCAL=1`: fuerza cliente simulado en desarrollo.
  - `USE_GCAL_BUSY`: consulta disponibilidad real antes de confirmar slots.

## Runbook operativo

### Fallos de Google Calendar
1. Revisar `backend/server2.log`.
2. Verificar credenciales (`GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_OAUTH_JSON`).
3. Comprobar `/ready` para detalles.
4. Reintentar con `POST /admin/sync` (`mode: import|push`).

### Huecos incoherentes
1. Ejecutar `POST /admin/conflicts`.
2. Lanzar `POST /admin/sync` en modo `both`.
3. Revisar eventos manualmente si persisten.

### Restaurar backup SQLite
1. Detener servicios.
2. Sustituir `backend/app/data/*.db` por la copia.
3. Arrancar y validar integridad.

### Webhooks y mensajería
- Verificar tokens/secrets externos.
- Revisar respuestas y reintentos si fallan.

### Utilidades Makefile
- `make dev-start PORT=8776 FAKE=0` — arranca backend.
- `make dev-clear` — limpia eventos de GCal (requiere API key).
- `make dev-demo` — demo end-to-end.
- `make conflicts` — detecta conflictos en rango.

### Backups automáticos
- El backend genera copias de `pelubot.db` en `BACKUPS_DIR` (por defecto `backend/data/backups`) usando un scheduler interno. Se habilita si `PELUBOT_AUTO_BACKUPS=true` y el intervalo (minutos) se controla con `PELUBOT_BACKUP_INTERVAL_MINUTES` (default 1440). Puedes forzar otro path con `PELUBOT_BACKUPS_DIR=/ruta/externa` y limitar la retención con `PELUBOT_BACKUP_RETAIN` (número máximo de archivos; por defecto infinito).
- El portal profesional expone `/pros/backups` (listar), `POST /pros/backups` (crear al instante), `DELETE /pros/backups/{id}`, `POST /pros/backups/{id}/restore` y `GET /pros/backups/{id}/download`. Todos requieren sesión de estilista.
- Para restaurar manualmente fuera del portal puedes copiar el `.db` desde `backend/data/backups/` al volumen de datos y reiniciar el backend; en Railway conviene descargar la última copia desde la sección de Backups de PeluBot Pro y subirla al volumen persistente.

## Variables y comandos clave

- `.env`:
  - `API_KEY`, `DATABASE_URL`, `USE_GCAL_BUSY`, `GOOGLE_SERVICE_ACCOUNT_JSON` o `GOOGLE_OAUTH_JSON`, `TZ`.
- Tests: `pytest backend/tests`.
- Scripts: `python -m backend.scripts.sync_cli`, `python backend/scripts/validate_services.py`.
