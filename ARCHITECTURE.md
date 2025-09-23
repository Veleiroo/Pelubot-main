# Arquitectura General de PeluBot

## Visión general

- **Backend**: FastAPI + SQLModel con SQLite, expone `/services`, `/professionals`, `/slots`, `/reservations`, y endpoints de administración y monitorización (`/health`, `/ready`, `/admin/*`). Incluye capas de logging, métricas y rate limiting.
- **Frontend**: React 19 + Vite + Tailwind + shadcn. El flujo principal (`/book/service → /book/date → /book/confirm`) usa Zustand para el estado y React Query para fetches.
- **E2E**: Playwright (`Frontend/shadcn-ui/tests/e2e/booking.spec.ts`) ejecuta el flujo completo mockeando el backend.
- **Infra**: Docker Compose con servicios `backend`, `frontend`, `frontend-dev`.

## Saludos

```
A mi me gusta Github
```
