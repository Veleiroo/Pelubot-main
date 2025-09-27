# Desarrollo y despliegue del Frontend

Este repo soporta dos modos con Docker Compose:

1) Modo dev (Vite) – hot reload en :8080
2) Modo prod (nginx) – build estático en :8080

## Mantenimiento BD

- Semanal: `make db-maintenance` (backup → checkpoint WAL → integrity_check → optimize)
- Backup manual antes de tareas grandes: `make db-backup`
- Forzar checkpoint WAL si crece mucho: `make db-checkpoint`
- Verificar integridad: `make db-integrity`

DB_PATH y BACKUPS_DIR se pueden ajustar en el Makefile o por entorno.

## Diagnóstico rápido

- `docker compose ps`
- `docker compose logs -f frontend` (prod) o `docker compose logs -f frontend-dev` (dev)
- `docker compose exec frontend sh -lc 'ls -lah /usr/share/nginx/html && head -n5 /usr/share/nginx/html/index.html'`
- `docker compose exec frontend-dev sh -lc 'ls -lah dist || true'` (en dev no hay dist, sirve Vite)

## Modo Dev (Vite en Docker)

Arranca backend + frontend-dev (Vite) mapeado en :8080:

```
make docker-dev
```

Detalles:
- Servicio `frontend-dev` monta `Frontend/shadcn-ui` dentro del contenedor y corre `pnpm dev --host 0.0.0.0`.
- Variables inyectadas: `VITE_API_BASE_URL=http://localhost:8776`, `VITE_API_KEY`.
- Hot reload real. Tras editar `.tsx`, refresca y verás el cambio.

## Modo Prod (nginx con dist)

Fuerza build limpio del frontend y arranca backend + frontend (nginx):

```
make docker-prod
```

Equivalente a:
- `docker compose build --no-cache frontend`
- `docker compose up -d backend frontend`

Comprueba el contenido servido:

```
docker compose exec frontend sh -lc 'ls -lah /usr/share/nginx/html && head -n5 /usr/share/nginx/html/index.html'
```

## Notas

- Usa solo uno a la vez: `frontend` (prod) o `frontend-dev` (dev). Los targets detienen el otro si está en marcha.
- Si cambias variables `VITE_…`, reconstruye prod (`make docker-prod`). En dev basta reiniciar `frontend-dev`.
- El backend corre en `http://localhost:8776`. El dev front habla directo con esa URL.

## Flujo de reserva: estado y stepper

- Estado persistido en `src/store/booking.ts` (zustand):
  - `serviceId`, `professionalId`, `date` (YYYY-MM-DD), `slotStart` (ISO)
  - Acciones: `setService`, `setProfessional`, `setDate`, `setSlot`, `reset`
- Stepper interactivo en `src/components/BookingSteps.tsx`:
  - Basado en ruta actual: `/book/service` → service, `/book/date` → date, `/book/confirm` → confirm
  - Reglas navegación: service siempre; date exige `serviceId`; confirm exige `serviceId` y `slotStart` o `date`.
  - Accesible: `aria-current="step"`, foco visible, navegación con teclado del navegador.
- Restauración de estado:
  - En Service → al seleccionar, se guarda en store y se propaga `?service=<id>` en la URL.
- En Date/Confirm se lee del store y, si falta, se redirige a Service.

## UI (dark + shadcn) — criterios de estilo

- Contenedores centrados con anchos contenidos (`max-w-3xl` para calendario; `max-w-6xl` para grillas de servicio), paddings fluidos (`px-6 sm:px-8`).
- Jerarquía: títulos `text-2xl sm:text-3xl font-bold`, subtítulos `text-sm text-muted-foreground`.
- Secciones en `Card` para agrupar contenido (servicios, calendario, resumen) con borde sutil `border-border/50`, fondo `bg-card/60` y sombra suave.
- Microinteracciones consistentes: botones `variant="ghost"` para acciones neutrales (navegación mes), CTA primario con `bg-emerald-500` y focus visible `focus-visible:ring-emerald-500`.
- Calendario: 7 columnas fijas, celdas `aspect-square` con `tabular-nums`, estados accesibles (disponible/seleccionado/hoy/inactivo) y transición de mes (fade 120ms).
- Stepper: más aire y contraste (estado completado ✓ en verde, actual con anillo, pendiente atenuado), accesible con `aria-current="step"`.

Al añadir pasos/pantallas:
- Reutiliza los mismos contenedores y espaciados (`space-y-6` entre bloques), y la misma paleta.
- Asegura foco visible y feedback deshabilitado en CTAs (`disabled:opacity-50 disabled:pointer-events-none`).
- Mantén grids responsivos (1/2/3 columnas) y tipografía uniforme.

## Assets

- `Frontend/shadcn-ui/public/assets` aloja imágenes optimizadas (máximo 1200px de ancho, ~200 kB cada una). Si añades nuevos recursos, conserva ese tope y adjunta créditos/licencias en un `README.md` dentro de la carpeta.

## Tests E2E (Playwright)

- Antes de lanzar los tests asegúrate de reconstruir el frontend (`pnpm run build`), ya que el runner usa `vite preview` sobre la carpeta `dist`.
- Para ejecutar el flujo end-to-end desde `Frontend/shadcn-ui`:
  ```bash
  pnpm run test:e2e:preview                               # build + preview + test
  ```
  Si necesitas ajustar el puerto, exporta `PLAYWRIGHT_PORT` antes de lanzar el script (por defecto 4173).
  Ajusta `PLAYWRIGHT_PORT` si necesitas otro puerto libre.
- Puedes reutilizar un servidor dev (`pnpm run test:e2e:dev`) cuando quieras depurar con hot reload; paciencia con el arranque porque Vite recompila todo antes de abrir 4173.
- Para ejecutar manualmente: `pnpm run build && PLAYWRIGHT_MODE=preview PLAYWRIGHT_PORT=4174 pnpm exec playwright test`.

## Variables de entorno clave

- `VITE_API_BASE_URL`: URL absoluta del backend (incluye protocolo y host). Si se omite, el front usa el mismo origen del navegador.
- `VITE_API_BASE_PATH`: Ruta relativa añadida al origen cuando no se define `VITE_API_BASE_URL` (ej. `/api`).
- `VITE_ENABLE_DEBUG`: activa la ruta `/debug` (`1`/`true`).
- `VITE_USE_GCAL`: fuerza la sincronización con Google Calendar para los slots (`1`/`true`).
- `PLAYWRIGHT_MODE`, `PLAYWRIGHT_PORT`: controlan el servidor que arranca Playwright (`preview`/`dev`).

## Integración Google Calendar (Service Account)

Recordatorio para configurar una cuenta de servicio que no requiera renovar tokens manualmente:

1. **Proyecto & API** – En Google Cloud Console crea/elige proyecto y activa la API de Google Calendar.
2. **Cuenta de servicio** – En IAM & Admin genera una nueva service account y descarga la clave JSON.
3. **Permisos calendario** – Desde calendar.google.com comparte el calendario de la barbería con el `client_email` de la service account otorgando “Hacer cambios en los eventos”.
4. **Variables/Nodo** – Guarda el JSON fuera del repo. Exporta las variables esperadas (`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` o `GOOGLE_SERVICE_ACCOUNT_JSON_PATH`, `GCAL_CALENDAR_ID`, etc.) para que `build_calendar()` cree credenciales con `service_account.Credentials.from_service_account_info`. Puedes generar la cadena base64 con:

   ```bash
   python backend/scripts/service_account_env.py path/a/key.json
   ```

   Esto imprime el `export GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=…` y el bloque para `.env`.
5. **Revisar integración** – Una vez configurado, `ENABLE_GCAL_SYNC=1` activa la sincronización y los endpoints pueden crear/patch eventos usando la cuenta delegada.

> Si prefieres seguir con OAuth + refresh token, guarda el token en un almacén seguro y renueva el access token antes de cada sync, pero la service account es más estable para producción.
