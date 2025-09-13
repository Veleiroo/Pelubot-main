# Guía de uso de la plantilla shadcn-ui

## Stack tecnológico

Este proyecto está construido con:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

Todos los componentes de shadcn/ui están predescargados en `@/components/ui`.

## Estructura de archivos

- `index.html` — entrada HTML
- `vite.config.ts` — configuración de Vite
- `tailwind.config.js` — configuración de Tailwind CSS
- `package.json` — dependencias y scripts
- `src/App.tsx` — componente raíz del proyecto
- `src/main.tsx` — punto de entrada
- `src/index.css` — estilos globales
- `src/pages/Index.tsx` — página de inicio

## Componentes

- Los componentes shadcn/ui están disponibles en `@/components/ui`.

## Estilos

- Añade estilos globales en `src/index.css` o crea nuevos ficheros CSS si lo prefieres
- Usa clases de Tailwind para estilizar componentes

## Desarrollo

- Importa componentes desde `@/components/ui` en tus componentes React
- Personaliza la UI modificando la configuración de Tailwind
- Configura la base URL del backend creando un `.env` en `Frontend/shadcn-ui/` con:

```
VITE_API_BASE_URL=http://127.0.0.1:8776
```

El archivo `src/lib/api.ts` usa `VITE_API_BASE_URL` (fallback a `http://127.0.0.1:8776`).
Si tu backend no permite llamadas sin API Key, añade también:

```
VITE_API_KEY=changeme
```

En desarrollo, alternativa: exporta `ALLOW_LOCAL_NO_AUTH=true` en el backend para no requerir API Key desde `localhost`.

Opcional: para mostrar el calendario visual en la página de fecha (además del selector nativo), añade:

```
VITE_ENABLE_CALENDAR=true
```

Si el calendario falla en tu entorno, seguirá estando el selector nativo como respaldo.

## Notas

- El alias de ruta `@/` apunta a `src/`
- En TypeScript, evita reexportar tipos que ya estás importando

## Comandos

Instalar dependencias

```shell
pnpm i
```

Añadir dependencias

```shell
pnpm add nombre_paquete
```

Arrancar modo desarrollo

```shell
pnpm run dev
```

Compilar (build)

```shell
pnpm run build
```
