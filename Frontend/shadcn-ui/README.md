# Frontend (shadcn-ui)

SPA construida con Vite + React + TypeScript + Tailwind + shadcn/ui.

## Estructura
- `src/App.tsx`: define rutas (`/`, `/book/*`, `/debug` bajo flag).
- `src/components/`: componentes propios (landing, booking, layouts).
- `src/components/ui/`: componentes base generados por shadcn/ui.
- `src/pages/`: páginas principales (landing, flujo de reserva, utilidades).
- `src/store/booking.ts`: Zustand store que guarda el estado de la reserva.
- `src/lib/api.ts`: cliente HTTP hacia el backend.

## Configuración `.env`
Situado en `Frontend/shadcn-ui/` (ejemplo):
```
VITE_API_BASE_URL=http://127.0.0.1:8776
VITE_API_KEY=tu_api_key_segura
# Opcional: habilita el calendario visual en /book/date
VITE_ENABLE_CALENDAR=true
# Opcional: expone la ruta /debug (solo en dev)
VITE_ENABLE_DEBUG=true
# Opcional: fuerza peticiones a Google Calendar desde el frontend
# VITE_USE_GCAL=true
# Opcional: muestra páginas futuras (Clientes/Estadísticas) para demos
VITE_ENABLE_FUTURE_FEATURES=true
```
El backend rechaza peticiones sin API key (`API_KEY` ≠ `changeme`), por lo que `VITE_API_KEY` debe definirse en todos los entornos. La clave se inyecta en tiempo de build y no se expone en el bundle público.

### Páginas Futuras (Demo Mode)
Para mostrar las páginas de **Clientes** y **Estadísticas** en modo demostración (ideal para presentaciones a clientes):
- Activar: `VITE_ENABLE_FUTURE_FEATURES=true`
- Desactivar: Comentar o eliminar la variable (recomendado en producción)
- Ver documentación completa en [`FUTURE_FEATURES.md`](./FUTURE_FEATURES.md)

## Scripts
```
npm install
npm run dev       # modo desarrollo
npm run build     # build producción
npm run preview   # sirve el build
```

## Notas
- shadcn-ui se instaló localmente, por lo que puedes regenerar componentes con `npx shadcn@latest` si necesitas nuevas piezas.
- Para mantener el bundle ligero, elimina componentes no usados y verifica los imports desde `lucide-react` (importar iconos individuales).
- Antes de publicar, asegúrate de que el backend esté configurado con HTTPS y `PUBLIC_RESERVATIONS_ENABLED` según tu estrategia (p.ej. true para self-service, false si solo el frontend autorizado debe reservar).
