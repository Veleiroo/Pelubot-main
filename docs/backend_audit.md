# Auditoría backend PeluBot (cola GCal)

## Resumen ejecutivo
- El backend opera con una única cola en SQLite para Google Calendar, pero faltan salvaguardas de observabilidad y tolerancia a fallos (reintentos, limpieza de trabajos encolados) para sostener carga en producción.
- Varias rutas siguen siendo prototipos: carecen de paginación, validaciones y limitaciones de seguridad, y algunas consultas golpean Google Calendar o SQLite en cada petición sin controles de timeout.
- La capa de datos mantiene catálogos en memoria construidos al importar el módulo, por lo que cambios en la BD no se reflejan hasta reiniciar el proceso.
- Hay módulos sin uso directo (`integrations/mailer.py`, `services/notifications`, utilidades sueltas) que conviene eliminar o mover a pruebas para evitar mantenimiento innecesario.
- La inicialización de la BD depende de `create_all` y `ALTER TABLE` ad-hoc; falta un flujo de migraciones versionadas para evolucionar el esquema de forma segura.

## Hallazgos y acciones recomendadas

### 1. Robustez y visibilidad de la cola de Google Calendar
**Observaciones.** El worker levanta un hilo por proceso y procesa el primer trabajo `pending` ordenado por `available_at` sin métricas ni watchdogs. No hay limpieza de trabajos `processing` si el proceso muere tras tomar la fila; el worker hace `session.commit()` directo y reintenta con un backoff lineal basado en una única variable de entorno. Tampoco se publican métricas ni endpoints para inspeccionar la cola.【F:backend/app/services/calendar_queue.py†L65-L315】

**Acciones.**
- Persistir un `heartbeat`/`locked_by` en `calendar_sync_jobs` y resetear trabajos `processing` más antiguos que `max(poll_interval*2, 60s)` al arrancar el worker.
- Exponer métricas (Prometheus) del tamaño de la cola, trabajos fallidos y latencias de ejecución.
- Añadir un endpoint interno `/admin/calendar-jobs` para listar el estado de cada reserva y forzar reintentos.
- Documentar en `readme` que en despliegues multi-proceso solo debe arrancar un worker (p.ej., moverlo a un proceso sidecar o usar `uvicorn --workers 1` hasta migrar a Celery/Redis).

### 2. Estado de sincronización expuesto solo en responses ad-hoc
**Observaciones.** La API devuelve `sync_status` y `sync_job_id` en las respuestas de creación/reprogramación/cancelación, pero no persiste ese estado ni ofrece forma de consultarlo después; el campo vive únicamente en el payload de respuesta.【F:backend/app/models.py†L279-L302】【F:backend/app/api/pro_portal.py†L637-L901】【F:backend/app/api/routes.py†L265-L376】

**Acciones.**
- Añadir columnas `sync_status`, `sync_job_id` y `last_sync_error` en `ReservationDB` para rastrear la última sincronización.
- Actualizar el worker para marcar la reserva como `synced`/`failed` al cerrar cada trabajo.
- Exponer endpoints para consultar el estado (`GET /reservations/{id}/sync`) y permitir reintentos manuales.

### 3. Endpoints críticos sin controles de rendimiento ni timeout externos
**Observaciones.** `/ready` ejecuta `build_calendar()` en cada llamada, lo que puede bloquear hasta que Google responda; no se configura timeout ni circuit breaker. La lista de reservas devuelve toda la tabla sin paginación ni filtro por profesional o rango temporal.【F:backend/app/api/routes.py†L79-L162】

**Acciones.**
- Limitar `/ready` a un chequeo ligero (p. ej., verificar que el worker esté vivo y que existan credenciales) y mover la llamada real a Google a un cron o healthcheck asíncrono con timeout.
- Incorporar query params `limit/offset` y filtros (`professional_id`, `start>=`, `end<=`) en `/reservations`, respaldados por índices.
- Cachear las respuestas estáticas (`/services`, `/professionals`) durante unos minutos vía middleware si siguen dependiendo de lecturas en frío.

### 4. Catálogos cargados en import y falta de invalidación
**Observaciones.** `app.data` carga los estilistas desde SQLite al importarse, congela `PROS`, `SERVICE_BY_ID` y mapas auxiliares, y ya no se actualiza aunque la tabla `stylistdb` cambie.【F:backend/app/data.py†L1-L73】

**Acciones.**
- Reemplazar el módulo por un servicio que consulte la BD on-demand con caché expirable (TTL corto) o invalidación cuando se edite un estilista.
- Ajustar la lógica de slots y disponibilidad para que lea directamente desde la base en lugar de depender de listas globales.

### 5. Esquema de base de datos gestionado con `create_all` + `ALTER TABLE`
**Observaciones.** `create_db_and_tables()` ejecuta `SQLModel.metadata.create_all()` y luego aplica `ALTER TABLE` condicionados para columnas nuevas, índices y triggers. No hay historial de migraciones ni control de versionado.【F:backend/app/db.py†L72-L135】

**Acciones.**
- Introducir Alembic (o equivalente) y versionar la creación de `calendar_sync_jobs`, índices y triggers.
- Registrar en docs cómo ejecutar migraciones y validar su aplicación antes de subir nuevas versiones.

### 6. Seguridad y configuración por defecto permisiva
**Observaciones.** La API permite deshabilitar la API key para tráfico local vía `ALLOW_LOCAL_NO_AUTH`, incluso si corre en un puerto expuesto; la clave por defecto sigue siendo `changeme`. Las cookies del portal profesional se firman con el mismo secreto si no se provee uno específico.【F:backend/app/api/routes.py†L40-L61】【F:backend/app/core/auth.py†L1-L84】

**Acciones.**
- Forzar un `API_KEY` distinto de `changeme` en entornos `prod`/`stage` (error de arranque si falta).
- Limitar `ALLOW_LOCAL_NO_AUTH` a entornos explícitamente marcados como `dev` y advertir si la app escucha en `0.0.0.0`.
- Rotar y almacenar los secretos del portal en un gestor central (Vault/SSM) y documentar el procedimiento.

### 7. Código sin uso o duplicado
**Observaciones.** `integrations/mailer.py` está vacío, `services/notifications.py` no es referenciado por ninguna ruta, `collect_gcal_busy_for_range()` no se usa en el flujo actual y la función `db.connect()` no se invoca fuera de utilidades.【F:backend/app/integrations/mailer.py†L1-L1】【F:backend/app/services/notifications.py†L1-L78】【F:backend/app/services/logic.py†L144-L217】【F:backend/app/db.py†L13-L32】

**Acciones.**
- Eliminar o mover estos helpers a un módulo de experimentos/tests para reducir superficie de mantenimiento.
- Si el envío de correos via MailerSend sigue en la hoja de ruta, integrarlo desde las rutas de confirmación y cubrirlo con tests que simulen la API externa.

### 8. Métricas y límites locales poco escalables
**Observaciones.** El rate limit corre en memoria por proceso, sin coordinación entre instancias, y las métricas Prometheus solo cubren contadores de reservas; la cola y los errores de Google Calendar no generan series propias.【F:backend/app/core/rate_limit.py†L1-L64】【F:backend/app/core/metrics.py†L1-L120】【F:backend/app/services/calendar_queue.py†L94-L315】

**Acciones.**
- Migrar el rate limit a Redis o a un gateway si se despliega con múltiples réplicas.
- Añadir histograms/gauges para tiempos de cola, intentos por trabajo y errores de integración.

## Siguientes pasos sugeridos
1. Priorizar la estabilización de la cola (acciones de los puntos 1 y 2) antes de volver a correr benchmarks de mezcla 15 VU.
2. Configurar Alembic y cortar una primera migración que cubra el estado actual de SQLite.
3. Programar limpieza de código muerto y mover catálogos a un servicio dinámico.
4. Endurecer la configuración de seguridad y documentar el checklist de despliegue.

_Este documento cubre el backend en `backend/app` a fecha de la revisión; actualízalo conforme se vayan cerrando los hallazgos._
