# Auditoría backend PeluBot (cola GCal)

## Resumen ejecutivo
- La cola de Google Calendar ahora cuenta con métricas, recuperación de trabajos atascados y panel de administración, pero aún queda por robustecer los despliegues multi-worker.
- Los endpoints más críticos ya exponen el estado de sincronización persistente y ofrecen consultas dedicadas; restan tareas de limpieza y gobernanza de datos.
- Persisten tareas estructurales: migraciones versionadas, catálogos dinámicos, reglas de seguridad y eliminación de código sin uso.

## Hallazgos y acciones recomendadas

### 1. Robustez y visibilidad de la cola de Google Calendar
**Observaciones.** El worker debía manejar trabajos encolados, métricas y reintentos coordinados.【F:backend/app/services/calendar_queue.py†L30-L350】

**Acciones.** Persistir `locked_by`/`heartbeat`, exponer métricas Prometheus y publicar endpoints administrativos.

**Estado.** ✅ Implementado (`calendar_queue.py`, `/admin/calendar-jobs`, documentación operativa actualizada).

### 2. Estado de sincronización expuesto solo en responses ad-hoc
**Observaciones.** El estado de sincronización no se guardaba en la base ni podía consultarse luego.【F:backend/app/models.py†L351-L460】

**Acciones.** Añadir columnas `sync_status`, `sync_job_id`, `sync_last_error`, actualizar el worker y exponer endpoints (`/pros/reservations/{id}/sync`, `/reservations/{id}/sync`).

**Estado.** ✅ Implementado en modelos, worker y APIs correspondientes.

### 3. Endpoints críticos sin controles de rendimiento ni timeout externos
**Observaciones.** `/ready` dependía del API de Google y `/reservations` devolvía la tabla completa.【F:backend/app/api/routes.py†L60-L380】

**Acciones.** Healthcheck ligero (DB + worker) y paginación/filtros (`limit`, `offset`, `start_from`, `start_to`, `professional_id`, `status`).

**Estado.** ✅ `/ready` es local y `/reservations` dispone de filtros y límites.

### 4. Catálogos cargados en import y falta de invalidación
**Observaciones.** `app.data` ahora consulta servicios y profesionales desde la base con caché TTL y siembra entradas por defecto cuando el catálogo está vacío.【backend/app/data.py:1】【backend/app/data.py:85】

**Acciones.** Reemplazar por un servicio dinámico con caché o invalidación.

**Estado.** ✅ Catálogo dinámico con invalidación unificada (`invalidate_services_cache`, `invalidate_catalog_cache`); servicios rehidratados desde `service_catalog`.

### 5. Esquema de base de datos gestionado con `create_all` + `ALTER TABLE`
**Observaciones.** No existen migraciones versionadas; se aplican `ALTER TABLE` ad-hoc.【F:backend/app/db.py†L70-L160】

**Acciones.** Introducir Alembic (o similar) y documentar el flujo de migraciones.

**Estado.** ⏳ Pendiente.

### 6. Seguridad y configuración por defecto permisiva
**Observaciones.** API key por defecto, `ALLOW_LOCAL_NO_AUTH` amplio y secretos compartidos.【F:backend/app/api/routes.py†L36-L70】【F:backend/app/core/auth.py†L1-L120】

**Acciones.** Validar claves únicas por entorno, restringir excepciones locales y gestionar secretos externamente.

**Estado.** ✅ Endurecido (`API_KEY` obligatoria y ≠`changeme`, `ALLOW_LOCAL_NO_AUTH` acotado a localhost en dev, `PRO_PORTAL_SECRET` dedicado y requerido en prod).

### 7. Código sin uso o duplicado
**Observaciones.** Helpers y módulos no referenciados (`integrations/mailer.py`, `services/notifications.py`, etc.).【F:backend/app/services/notifications.py†L1-L78】

**Acciones.** Eliminar o trasladar a un espacio experimental con cobertura de tests.

**Estado.** ✅ Limpieza inicial (módulos `services/notifications.py` y `integrations/mailer.py` eliminados; revisar resto en ronda posterior).

### 8. Métricas y límites locales poco escalables
**Observaciones.** Rate limiting en memoria y métrica limitada a contadores.【F:backend/app/core/rate_limit.py†L1-L80】

**Acciones.** Externalizar el rate limit (Redis/gateway) y añadir histograms/gauges adicionales.

**Estado.** ⏳ Pendiente.

## Siguientes pasos sugeridos
1. Introducir migraciones versionadas (Alembic) y documentar su operación.
2. Rediseñar los catálogos (`app.data`) para obtener datos dinámicos con invalidación controlada.
3. Endurecer configuración de seguridad (API keys obligatorias, secretos dedicados).
4. Programar limpieza de helpers sin uso y ampliar métricas (rate limit distribuido, latencias específicas).

_Documento actualizado tras las mejoras de cola y sincronización; revisarlo nuevamente conforme se avancen los puntos pendientes._
