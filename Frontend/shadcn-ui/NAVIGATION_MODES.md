# Comparación Visual - Navegación Profesional

## 🚀 Modo Producción (Defecto)
**Variable:** `VITE_ENABLE_FUTURE_FEATURES` no definida o `false`

```
┌─────────────────────────────────────────────────────┐
│ 🪒 PELUBOT PRO • NOMBRE_ESTILISTA                   │
│                                                     │
│     [Resumen]  [Agenda]                    [Nueva  │
│                                             cita]   │
│                                            [Salir]  │
└─────────────────────────────────────────────────────┘
```

**Visible:**
- ✅ Resumen
- ✅ Agenda

---

## 🎭 Modo Demo/Desarrollo
**Variable:** `VITE_ENABLE_FUTURE_FEATURES=true`

```
┌─────────────────────────────────────────────────────────────────┐
│ 🪒 PELUBOT PRO • NOMBRE_ESTILISTA                               │
│                                                                 │
│  [Resumen] [Agenda] [Clientes     ] [Estadísticas  ]   [Nueva  │
│                     (Próximamente)  (Próximamente)       cita]  │
│                                                         [Salir] │
└─────────────────────────────────────────────────────────────────┘
```

**Visible:**
- ✅ Resumen
- ✅ Agenda
- 🔮 Clientes (con badge "Próximamente", opacidad 60%)
- 🔮 Estadísticas (con badge "Próximamente", opacidad 60%)

---

## 📊 Comparación Rápida

| Característica        | Producción | Demo/Dev |
|-----------------------|------------|----------|
| Resumen               | ✅         | ✅       |
| Agenda                | ✅         | ✅       |
| Clientes              | ❌         | 🔮       |
| Estadísticas          | ❌         | 🔮       |
| Badge "Próximamente"  | -          | ✅       |
| Opacidad reducida     | -          | ✅       |

---

## 🎯 Casos de Uso

### Producción
```bash
# .env
VITE_API_BASE_URL=http://api.produccion.com
# No incluir VITE_ENABLE_FUTURE_FEATURES
```

Solo funcionalidades completamente implementadas y probadas.

### Demo para Cliente
```bash
# .env
VITE_API_BASE_URL=http://api.staging.com
VITE_ENABLE_FUTURE_FEATURES=true
```

Mostrar roadmap visual con páginas futuras marcadas claramente.

### Desarrollo Local
```bash
# .env
VITE_API_BASE_URL=http://127.0.0.1:8776
VITE_ENABLE_FUTURE_FEATURES=true
VITE_ENABLE_DEBUG=true
```

Acceso completo a todas las páginas durante el desarrollo.

---

## 🔧 Cambio Rápido

Para cambiar entre modos, edita `.env` y reinicia el servidor de desarrollo:

```bash
# Activar modo demo
echo "VITE_ENABLE_FUTURE_FEATURES=true" >> .env
pnpm dev

# Desactivar modo demo
# Comentar o eliminar la línea en .env
pnpm dev
```

---

## 📝 Notas Técnicas

- Las rutas `/pros/clientes` y `/pros/estadisticas` **siempre están disponibles** via URL directa
- Solo se ocultan de la navegación visual
- El código permanece en el bundle (no hay code-splitting por esta feature)
- Para protección total, implementar guards en las rutas
