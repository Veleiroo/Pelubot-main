# ARQUITECTURA CORRECTA: Base de Datos como Fuente Única de Verdad

## ✅ ARQUITECTURA ACTUAL (CORRECTA)

```
┌────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS = FUENTE DE VERDAD            │
└────────────────────────────────────────────────────────────────┘

1. CREAR CITA (desde Frontend o API)
   
   Frontend/Cliente
        │
        ↓ POST /reservations
   Backend API
        │
        ├─→ 1. Guardar en BD (PRIMERO) ✅
        │
        └─→ 2. Sincronizar a GCal (OPCIONAL) 📅
            └─→ Si falla GCal, la cita EXISTE en BD


2. CONSULTAR CITAS (Portal de Profesionales)
   
   Frontend Pros
        │
        ↓ GET /pros/overview
   Backend API
        │
        └─→ Lee SOLO de BD ✅
            (NO consulta GCal)


3. MODIFICAR CITA (Reprogramar/Cancelar)
   
   Frontend Pros
        │
        ↓ POST /pros/reservations/{id}/reschedule
   Backend API
        │
        ├─→ 1. Actualizar en BD ✅
        │
        └─→ 2. Sincronizar cambio a GCal 📅
            └─→ Si falla GCal, cambio persiste en BD
```

## 🔴 PROBLEMA ACTUAL

**Síntoma:** Portal no muestra citas que existen en Google Calendar

**Causa:** Las citas fueron creadas **directamente en Google Calendar** (manualmente desde la app móvil o web), NO a través del backend.

**Resultado:**
- ✅ Google Calendar tiene las citas
- ❌ Base de datos NO las tiene
- ❌ Portal de profesionales lee la BD → No muestra nada

## ✅ SOLUCIÓN DEFINITIVA

### 1. Flujo Normal (RECOMENDADO)

**SOLO crear citas desde el sistema:**

```bash
# Desde el Portal de Profesionales
Frontend → POST /reservations → Backend → BD + GCal

# Resultado:
✅ Cita en BD (fuente de verdad)
✅ Cita en GCal (visualización externa)
```

**Ventajas:**
- Control total
- No requiere sincronización
- Datos consistentes
- Más rápido

### 2. Si ya tienes citas manuales en GCal

**Opción A: Importación única (migración)**

```bash
# Ejecutar UNA VEZ para importar citas históricas
cd backend
python scripts/sync_direct.py --current-month

# Después: SOLO crear citas desde el frontend
```

**Opción B: Sincronización periódica (NO recomendado)**

```bash
# Cron job para importar citas creadas manualmente
0 * * * * cd /path/to/backend && python scripts/sync_direct.py --days 3
```

⚠️ **No recomendado porque:**
- Duplica complejidad
- Posibles conflictos
- Latencia en ver citas nuevas
- Dependencia de Google

## 📋 REGLAS DE ARQUITECTURA

### ✅ HACER

1. **Crear citas SOLO desde:**
   - Portal de profesionales (frontend)
   - API POST /reservations
   - Scripts con lógica de negocio

2. **El backend SIEMPRE:**
   - Guarda en BD primero
   - Sincroniza a GCal después (best effort)
   - Continúa aunque GCal falle

3. **Consultas SIEMPRE:**
   - Leen de la BD
   - Nunca de GCal directamente

### ❌ NO HACER

1. **NO crear citas manualmente en Google Calendar**
   - Si lo haces, NO aparecerán en el portal
   - Requiere sincronización manual

2. **NO leer de GCal para mostrar citas**
   - Más lento
   - Dependencia externa
   - Límites de cuota API

3. **NO sincronizar bidireccionalmente de forma automática**
   - Conflictos de datos
   - Complejidad innecesaria
   - Bugs difíciles de depurar

## 🔧 CONFIGURACIÓN RECOMENDADA

### Backend (`backend/.env`)

```bash
# Google Calendar es OPCIONAL para visualización externa
GCAL_CALENDAR_ID=tu-calendario@group.calendar.google.com

# Desactivar lectura de GCal busy (no necesario si BD es fuente de verdad)
USE_GCAL_BUSY=false

# BD es la fuente de verdad
DATABASE_URL=sqlite:///./data/pelubot.db
```

### Frontend (`Frontend/shadcn-ui/.env`)

```bash
# API del backend (fuente de verdad)
VITE_API_BASE_URL=http://127.0.0.1:8000

# NO forzar uso de GCal
# VITE_USE_GCAL=false
```

## 🎯 CASOS DE USO

### Caso 1: Cliente reserva online
```
Cliente web → POST /reservations → BD ✅ → GCal 📅
                                    ↓
                            Portal muestra cita ✅
```

### Caso 2: Profesional crea cita en portal
```
Portal Pros → POST /reservations → BD ✅ → GCal 📅
                                    ↓
                            Cliente ve en GCal 📅
                            Portal muestra cita ✅
```

### Caso 3: Profesional reprograma
```
Portal Pros → POST /pros/.../reschedule → BD ✅ → GCal actualizado 📅
                                           ↓
                                   Portal actualizado ✅
```

### Caso 4: ERROR - Crear en GCal manualmente ❌
```
App móvil GCal → Evento en GCal 📅
                        ↓
                    BD vacía ❌
                        ↓
                Portal NO muestra ❌

SOLUCIÓN:
python scripts/sync_direct.py --current-month
```

## 🚀 MIGRACIÓN DE CITAS EXISTENTES

Si ya tienes citas en Google Calendar:

```bash
# 1. Backup de la BD actual
cp backend/data/pelubot.db backend/data/pelubot.db.backup

# 2. Verificar estado
cd backend
python scripts/check_sync_status.py

# 3. Si GCal tiene citas y BD está vacía, importar
python scripts/sync_direct.py --current-month

# 4. Verificar que se importaron
python scripts/check_sync_status.py

# 5. Desde ahora: SOLO crear desde el frontend
```

## 📊 VENTAJAS DE BD COMO FUENTE ÚNICA

✅ **Rendimiento:** Consultas locales, sin latencia de API
✅ **Disponibilidad:** Funciona sin Internet o Google
✅ **Control:** Datos en tu infraestructura
✅ **Escalabilidad:** No límites de cuota de Google
✅ **Simplicidad:** Un solo flujo, menos bugs
✅ **Privacidad:** Datos sensibles no salen del servidor
✅ **Testing:** Fácil de testear sin mocks de Google

## 📅 Google Calendar como EXTRA

Google Calendar solo sirve para:
- 📱 Ver citas en app móvil de Google Calendar
- 📧 Recibir notificaciones por email
- 🔔 Alertas en dispositivos Android/iOS
- 📆 Compartir calendario con clientes

**Pero NO para:**
- ❌ Fuente de verdad de datos
- ❌ Consultar disponibilidad
- ❌ Crear citas (hacerlo desde el sistema)

## 🔐 SEGURIDAD

Ventaja de BD como fuente única:
- Datos de clientes (teléfono, email) en tu servidor
- No expuestos en Google Calendar
- Cumplimiento GDPR más fácil
- Control de acceso granular

## 📝 RESUMEN

**REGLA DE ORO:**
```
SI QUIERES QUE UNA CITA APAREZCA EN EL PORTAL:
    CRÉALA DESDE EL FRONTEND O LA API
    
NO LA CREES MANUALMENTE EN GOOGLE CALENDAR
```

**Google Calendar es solo un espejo (opcional) de lo que hay en la BD.**

---

## 🛠️ COMANDOS ÚTILES

```bash
# Ver estado actual
python scripts/check_sync_status.py

# Importar citas existentes de GCal (una vez)
python scripts/sync_direct.py --current-month

# Ver citas en BD
sqlite3 backend/data/pelubot.db "SELECT * FROM reservationdb;"

# Ver estructura de BD
sqlite3 backend/data/pelubot.db ".schema reservationdb"
```
