# Operaciones y Despliegue

## Requisitos

- Python 3.11
- Node.js 18 y `pnpm`
- Docker + Docker Compose (plugin v2 recomendado)

## Variables de entorno básicas

Archivo `.env` en la raíz (ejemplo):

```
API_KEY=changeme
TZ=Europe/Madrid
DATABASE_URL=sqlite:////app/backend/data/pelubot.db
BACKEND_PORT=8776
FRONTEND_PORT=8080
GOOGLE_OAUTH_JSON=/app/backend/oauth_tokens.json
# Para desarrollo sin Google Calendar
# PELUBOT_FAKE_GCAL=1
```

Opcionales:

- `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_IMPERSONATE_EMAIL` para cuentas de servicio.
- `FRONT_API_KEY`, `FRONT_ENABLE_DEBUG` para builds específicos del frontend.

## Despliegues con Docker Compose

```bash
# plugin v2
docker compose up --build -d
# o vía Makefile
make docker-up
```

Servicios expuestos:

- Backend: http://localhost:8776
- Frontend: http://localhost:8080

Modo debug de la SPA (`/debug`) se activa con `VITE_ENABLE_DEBUG=1`.

### Logs y mantenimiento

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend   # o frontend-dev
docker compose down -v            # limpieza
```

Vistas útiles dentro del contenedor frontend:

```bash
docker compose exec frontend sh -lc 'ls -lah /usr/share/nginx/html'
docker compose exec frontend-dev sh -lc 'ls -lah dist || true'
```

## Despliegue manual del backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8776
# o
make dev-start PORT=8776 FAKE=0
```

## Cola de Google Calendar

- Arranca **un único worker** por entorno. El hilo embebido solo debe ejecutarse cuando `uvicorn` corre con un único proceso (`--workers 1`); en despliegues multi-worker deshabilita el worker embebido (`PELUBOT_DISABLE_GCAL_WORKER=1`) y ejecuta el sincronizador como servicio independiente.
- Las métricas de cola se exponen en `/metrics` (`pelubot_calendar_jobs_*`). Úsalas para alertar sobre trabajos atascados, pendientes o fallidos.
- Los administradores pueden consultar y reencolar trabajos vía los endpoints protegidos `/admin/calendar-jobs` (GET) y `/admin/calendar-jobs/{id}/retry` (POST, admite `delay_seconds`).
- El portal profesional dispone de `GET /pros/reservations/{id}/sync` para mostrar el último estado al estilista; la API interna ofrece `GET /reservations/{id}/sync` (requiere API key) para soporte y automatizaciones.
- El catálogo de servicios y profesionales se consulta en caliente y se cachea durante `CATALOG_CACHE_SECONDS` (30 s por defecto); tras cambios masivos, ejecuta `app.data.invalidate_catalog_cache()` o, si solo ajustaste servicios, `app.data.invalidate_services_cache()`.

## Checklist previa a producción

### Base de datos
- [ ] `DATABASE_URL` configurada por entorno.
- [ ] Migraciones/Alembic listos.
- [ ] Backups automáticos validados.

### API
- [ ] Autenticación (API key u OAuth) verificada.
- [ ] Validaciones y tests en verde.
- [ ] Endpoints `/health` y `/ready` monitorizados.

### Seguridad
- [ ] Variables de entorno tratadas como secretos.
- [ ] CORS restringido a dominios permitidos.
- [ ] Dependencias actualizadas.

### Observabilidad
- [ ] Logs estructurados con `request_id`.
- [ ] Métricas y alertas activas.

### CI/CD
- [ ] Tests automáticos en cada PR.
- [ ] Build de frontend y backend.
- [ ] Escaneos de seguridad.

### Backups
- [ ] Política de retención documentada.
- [ ] Restauraciones probadas.

### Infraestructura
- [ ] Recursos de contenedores definidos.
- [ ] Monitorización y reinicios automáticos configurados.
