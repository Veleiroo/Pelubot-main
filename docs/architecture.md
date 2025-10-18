# Arquitectura y Hoja de Ruta

## Arquitectura general

- **Backend (FastAPI + SQLModel + SQLite):** expone catálogos (`/services`, `/professionals`), gestión de reservas (`/slots`, `/reservations`, `/pros/*`) y endpoints administrativos (`/health`, `/ready`, `/admin/*`). Incluye middlewares para métricas, rate limiting y request ID, además de conectores opcionales con Google Calendar.
- **Frontend (React 19 + Vite + Tailwind + shadcn/ui):** aplica un flujo público en tres pasos (`/book/service → /book/date → /book/confirm`) respaldado por Zustand y React Query, y un portal profesional con módulos de resumen, agenda, clientes y estadísticas.
- **E2E (Playwright):** los tests en `Frontend/shadcn-ui/tests/e2e/booking.spec.ts` cubren el flujo completo de reservas ejecutándose sobre `vite preview` con mocks de backend.
- **Infraestructura (Docker Compose):** servicios `backend`, `frontend` (nginx) y `frontend-dev` (Vite) permiten ejecutar el stack completo en modo desarrollo o producción.

## Componentes destacados

- **Sincronización con Google Calendar:** el backend opcionalmente crea, actualiza y borra eventos GCal para cada reserva. El cliente se configura mediante `GOOGLE_SERVICE_ACCOUNT_JSON` o `GOOGLE_OAUTH_JSON`, con banderas como `USE_GCAL_BUSY` para consultar disponibilidades.
- **Catálogos centralizados:** `backend/app/data.py` define servicios y profesionales; tanto la API como el frontend derivan de esta fuente para evitar configuraciones divergentes.
- **Cache de datos en frontend:** React Query gestiona catálogos, slots y datos profesionales, con actualizaciones en caliente (prefetch, reintentos y actualizaciones optimistas).
- **Navegación con `background` state:** el landing guarda la URL de origen y muestra el flujo de reservas dentro de un modal sin perder contexto de navegación.

## Hoja de ruta

### Backend (prioridad alta)
- Finalizar Dockerización con imagen propia y variables de entorno bien documentadas.
- Añadir endpoint `/metrics`, ampliar observabilidad y ratificar límites de peticiones en endpoints críticos.
- Incorporar Alembic para evolucionar el esquema y preparar tareas programadas de reconciliación con Google Calendar.
- Endurecer validaciones de entorno (`pydantic-settings`), gestionar secretos fuera del repositorio y mejorar alertas frente a sincronizaciones fallidas.

### Backend (experiencia de desarrollo)
- Proveer modo `prod` en Makefile/uvicorn con logs rotativos.
- Publicar scripts CLI comunes (clear, sync, conflicts) y ampliar test coverage en flujos de reconciliación.

### Integración Google Calendar
- Permitir `dry-run` en `/admin/sync`, colorear eventos por servicio y enriquecer descripciones.
- Evaluar automatización para descripciones/notas importadas desde Calendar.

### Frontend
- Consolidar configuración de entorno y manejo unificado de errores de API.
- Fortalecer validaciones de formularios, estados de carga y accesibilidad.
- Ampliar cobertura de pruebas end-to-end y optimizar assets/estructura.
