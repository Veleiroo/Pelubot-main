# Frontend (shadcn-ui)

## Stack y estructura

- **Tecnologías:** React 19, Vite, TypeScript, Tailwind CSS y shadcn/ui.
- **Estado global:** Zustand (`src/store/booking.ts` y `src/store/pro.ts`) y React Query para fetch/caché.
- **Enrutamiento:** definido en `src/App.tsx`. El landing (`/`) convive con el flujo público `/book/*`, el portal profesional `/pros/*` y la ruta opcional `/debug`.
- **Componentes clave:**
  - `src/components/` alberga módulos compartidos (Navigation, BookingDialog, etc.).
  - `src/features/pro/*` agrupa vistas del portal profesional (overview, agenda, clientes y estadísticas).
  - `src/lib/api.ts` centraliza las llamadas HTTP y el manejo de errores/mocks.

## Desarrollo local y scripts

### Ejecutar sólo el frontend

```bash
cd Frontend/shadcn-ui
pnpm install
pnpm dev           # Vite en modo desarrollo
pnpm build         # Build producción
pnpm preview       # Sirve dist/ en modo estático
```

### Con Docker Compose

En la raíz:

- `make docker-dev` levanta backend + `frontend-dev` (Vite con hot reload en :8080).
- `make docker-prod` ejecuta un build limpio y expone nginx con los assets en :8080.
- Usa `docker compose logs -f frontend` o `frontend-dev` según el modo para depurar.

> El backend escucha en `http://localhost:8776`. En modo dev, Vite habla directamente con esa URL; en prod, nginx actúa como proxy usando `/api`.

### Mantenimiento rápido

- Scripts adicionales (desde `Makefile` o `package.json`): `pnpm run test:e2e:preview`, `pnpm run test:e2e:dev`.
- Ajusta `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_ENABLE_DEBUG`, `VITE_USE_GCAL` mediante `.env` en `Frontend/shadcn-ui/`.

## Flujo público de reservas

### Estado compartido

`useBooking` guarda `serviceId`, `professionalId`, `date`, `slotStart` y datos de contacto. Cada acción aguas arriba limpia selecciones dependientes para evitar inconsistencias (p. ej. cambiar de servicio reinicia profesional y fecha).

### Paso 1 – Servicio (`/book/service`)

- Obtiene servicios con React Query (`queryKey: ['services']`).
- Prefetch automático de profesionales y disponibilidad mensual al enfocar/hover sobre una tarjeta.
- Navega a `/book/date?service=<id>` preservando el `background` de navegación para mostrar el flujo como modal sobre la landing.

### Paso 2 – Fecha y profesional (`/book/date`)

- Rehidrata el estado desde la URL (`?service`, `?service_name`, `?pro`, `?pro_name`) y desde el store.
- Carga profesionales y auto selecciona el único disponible cuando procede.
- Consulta disponibilidad por mes (`['days-availability', serviceId, mes, profesional, use_gcal]`) y slots diarios. Limita la vista a seis meses vista.
- Implementa navegación accesible del calendario (teclado, foco, `aria` aplicada).

### Paso 3 – Confirmación (`/book/confirm`)

- Vuelve a cargar catálogos para enriquecer etiquetas si el usuario entra directo por URL.
- Valida nombre (≥2 caracteres), teléfono (≥6 dígitos) y email (opcional). Normaliza y persiste en store antes del envío.
- Envía a `api.createReservation` y traduce mensajes de `ApiError` según `status` o `detail`. Tras éxito, muestra resumen, permite crear otra reserva y resetea el estado.

### Modal sobre la landing

`BookingDialog` usa el estado `background` de React Router para presentar el flujo en un diálogo que puede cerrarse sin perder la navegación principal.

## Portal profesional (`/pros/*`)

- `useProSession` mantiene la sesión del estilista obtenida con `api.prosMe`. El shell (`ProsShell`) cancela queries `['pros', *]`, limpia sesión al expirar y redirige al login en caso 401.
- **Resumen:** `ProsOverviewView` muestra cita destacada, métricas diarias y listados con altura dinámica según viewport.
- **Agenda:** `ProsAgendaView` combina calendario (`AgendaCalendarPanel`) y lista. `useAgendaData` normaliza reservas por día y `useAgendaActions` aplica actualizaciones optimistas para crear, reprogramar o cancelar citas.
- **Clientes:** `ProsClientsView` agrupa resumen, segmentos, tabla y sugerencias de seguimiento. `useClientsData` formatea favoritos, etiquetas y métricas.
- **Estadísticas:** `ProsStatsView` arma tarjetas KPI, gráfico de tendencia, retención, tabla de servicios e insights mediante `useStatsData`.

## Variables de entorno relevantes

| Variable | Descripción |
| --- | --- |
| `VITE_API_BASE_URL` | URL absoluta del backend. Si falta, se usa el mismo origen del navegador (con `VITE_API_BASE_PATH` opcional). |
| `VITE_API_KEY` | Clave enviada en `X-API-Key` para endpoints protegidos. |
| `VITE_ENABLE_DEBUG` | Habilita la ruta `/debug` y logs adicionales. |
| `VITE_USE_GCAL` | Fuerza al frontend a pedir disponibilidad consultando Google Calendar. |
| `PLAYWRIGHT_MODE`, `PLAYWRIGHT_PORT` | Configuran cómo Playwright arranca el servidor (`preview`/`dev`). |

## Pruebas end-to-end

- Ejecutar todo en modo preview:

  ```bash
  pnpm run test:e2e:preview   # build + vite preview + tests
  ```

- Para depurar con Vite “en caliente”:

  ```bash
  pnpm run test:e2e:dev
  ```

- El runner genera capturas, vídeo y trazas en `Frontend/shadcn-ui/test-results/`.

## Seguimiento y mejoras abiertas

- Revisar futuras validaciones de formularios (formato de teléfono, emails).
- Evaluar localización (toda la UI está en español).
- Verificar números de contacto reales para CTA de WhatsApp/Teléfono y textos pendientes del portal pro.
- Mantener limpeza de dependencias y assets al añadir nuevas secciones.
