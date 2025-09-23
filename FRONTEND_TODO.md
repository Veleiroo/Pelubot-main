## Frontend Remediation Backlog

- [x] Configurar `VITE_API_BASE_URL` / `VITE_API_BASE_PATH` adecuadamente en despliegue y documentar la decisión (evitar fallback a `127.0.0.1`).
- [x] Refactorizar el store de reservas para limpiar `slotStart`, `date` y profesional cuando se repite selección de servicio.
- [x] Bloquear/limpiar selección de hora al cambiar de profesional o fecha; añadir feedback "sin profesionales".
- [x] Centralizar las llamadas de catálogos y slots con React Query (`useQuery`/`useMutation`) para cache, reintentos y loaders coherentes.
- [x] Ampliar y localizar mensajes de error en `Confirm`: mapear estados 401/422/500 y respuestas inesperadas de backend.
- [x] Mejorar confirmación: evitar navegación automática, mostrar CTA explícito y permitir que el usuario decida volver.
- [x] Reforzar accesibilidad UX:
  - Trap de foco + cierre con `Esc` en la navegación móvil.
  - `role="status"`/`aria-live` en loaders, soporte `prefers-reduced-motion` en scroll.
  - Fallbacks en secciones lazy para conexiones lentas.
- [x] Limpiar dependencias no utilizadas (supabase, dropzone, framer-motion, etc.) y revalidar tamaño de bundle tras la poda.
- [x] Ajustar botones de contacto (WhatsApp/llamada) para que cumplan su acción real o actualizar el copy.
- [x] Prefetch/precarga de `/book/service` y revisar chunking de la landing para minimizar flashes.
- [x] Documentar variables de entorno front (`VITE_API_BASE_URL`, `VITE_API_BASE_PATH`, `VITE_ENABLE_DEBUG`, `VITE_USE_GCAL`, flags Playwright) y nuevos scripts (`test:e2e:preview`, `test:e2e:dev`).
- [x] Añadir script npm que ejecute build + e2e en modo preview automáticamente.
- [x] Revisar ErrorBoundary: ocultar link Debug cuando no proceda y añadir botón de reintento (listo, verificar tras QA).
- [x] Estudiar migración de la navegación Debug/landing a componentes async con prefetch para mejorar UX.
