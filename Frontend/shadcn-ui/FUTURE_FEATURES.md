# Páginas Futuras - Modo Demo

## 📋 Descripción

Las páginas de **Clientes** y **Estadísticas** están implementadas pero se muestran solo en modo desarrollo para demostraciones a clientes potenciales.

## 🎯 Propósito

- Mostrar roadmap visual de funcionalidades futuras
- Permitir demos interactivas sin comprometer la experiencia de producción
- Mantener el código listo para activación rápida cuando las funcionalidades estén completas

## ⚙️ Configuración

### Activar Páginas Futuras (Desarrollo/Demo)

En el archivo `.env`:

```bash
VITE_ENABLE_FUTURE_FEATURES=true
```

### Desactivar Páginas Futuras (Producción)

En el archivo `.env`:

```bash
# VITE_ENABLE_FUTURE_FEATURES=true
```

O simplemente omitir la variable (el valor por defecto es `false`).

## 📱 Páginas Afectadas

Cuando `VITE_ENABLE_FUTURE_FEATURES=true`:

- ✅ **Resumen** - Siempre visible
- ✅ **Agenda** - Siempre visible  
- 🔮 **Clientes** - Visible solo en modo demo (marcada como "Próximamente")
- 🔮 **Estadísticas** - Visible solo en modo demo (marcada como "Próximamente")

## 🔧 Implementación Técnica

### Archivos Modificados

1. **`src/features/pro/layout/nav.ts`**
   - Define `CORE_NAV_ITEMS` (páginas principales)
   - Define `FUTURE_NAV_ITEMS` (páginas futuras)
   - Exporta `PROS_NAV_ITEMS` condicionalmente según la variable de entorno

2. **`src/features/pro/layout/ProHeader.tsx`**
   - Importa `PROS_NAV_ITEMS` dinámico
   - Muestra badge "(Próximamente)" en páginas futuras
   - Aplica opacidad reducida para indicar estado de preview

3. **`src/features/pro/layout/ProsHeader.tsx`**
   - Usa el mismo sistema de navegación dinámica

### Ejemplo de Código

```typescript
// nav.ts
export const PROS_NAV_ITEMS: ProsNavItem[] = 
  import.meta.env.VITE_ENABLE_FUTURE_FEATURES === 'true' 
    ? [...CORE_NAV_ITEMS, ...FUTURE_NAV_ITEMS]
    : CORE_NAV_ITEMS;
```

## 🚀 Despliegue

### Desarrollo Local
```bash
# .env
VITE_ENABLE_FUTURE_FEATURES=true
```

### Staging/Demo
```bash
# .env.staging
VITE_ENABLE_FUTURE_FEATURES=true
```

### Producción
```bash
# .env.production
# Variable no definida = false por defecto
```

## ✅ Checklist de Activación

Cuando las funcionalidades estén listas para producción:

1. [ ] Completar implementación de backend para Clientes
2. [ ] Completar implementación de backend para Estadísticas
3. [ ] Remover `soon: true` de `FUTURE_NAV_ITEMS`
4. [ ] Mover páginas de `FUTURE_NAV_ITEMS` a `CORE_NAV_ITEMS`
5. [ ] Actualizar tests E2E
6. [ ] Desplegar a producción

## 🎨 Indicadores Visuales

Las páginas futuras se muestran con:
- Opacidad reducida (60%)
- Badge "(Próximamente)" junto al nombre
- Funcionalidad completa (navegables)

## 📝 Notas

- Las rutas funcionan completamente, solo se ocultan del menú
- Los usuarios técnicos pueden acceder directamente via URL
- Considera agregar redirección 404 si se requiere restricción total
- El código de las páginas permanece en el bundle (code splitting futuro)

## 🔗 Referencias

- Variable de entorno: `VITE_ENABLE_FUTURE_FEATURES`
- Archivo de navegación: `src/features/pro/layout/nav.ts`
- Headers: `ProHeader.tsx` y `ProsHeader.tsx`
