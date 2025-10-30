# Problema de Sincronización: Google Calendar vs Base de Datos

## 🔴 PROBLEMA IDENTIFICADO

### Síntoma
- **Google Calendar tiene citas** ✅
- **Base de datos está vacía** ❌
- **Portal de profesionales no muestra citas** ❌

### Causa Raíz

El sistema tiene **DOS fuentes de verdad**:

1. **Google Calendar** - Donde se crean las citas manualmente
2. **Base de Datos** - Donde el backend almacena y consulta las reservas

**El problema:** El portal de profesionales consulta la **BASE DE DATOS**, no Google Calendar directamente.

### Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE CREACIÓN                        │
└─────────────────────────────────────────────────────────────┘

OPCIÓN A: Creación Manual en Google Calendar
┌──────────────┐
│ Google Cal   │ ─── Cita creada aquí
│ (manualmente)│
└──────────────┘
       │
       │ ❌ NO SE SINCRONIZA AUTOMÁTICAMENTE
       ↓
┌──────────────┐
│ Base de Datos│ ─── Permanece VACÍA
└──────────────┘


OPCIÓN B: Creación desde Frontend/API
┌──────────────┐
│ Frontend     │ ─── POST /reservations
│ (pros/agenda)│
└──────────────┘
       │
       ↓
┌──────────────┐
│ Backend API  │ ─── Crea en BD + Sincroniza a GCal
│ routes.py    │
└──────────────┘
       │
       ├─────────────────┐
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ Base de Datos│  │ Google Cal   │
│   ✅ OK      │  │   ✅ OK      │
└──────────────┘  └──────────────┘
```

### ¿Por qué ocurre?

1. **Citas manuales en GCal:** Si creas citas directamente en Google Calendar (ej: desde la app móvil), estas NO se escriben automáticamente en la BD.

2. **Portal consulta BD:** El endpoint `/pros/overview` y `/pros/reservations` consultan la tabla `ReservationDB`, NO Google Calendar.

3. **Falta sincronización inicial:** No se ejecutó el proceso de importación de GCal → BD.

## ✅ SOLUCIONES

### Solución 1: Sincronización Manual (Inmediata)

Ejecuta el script de sincronización para importar citas de Google Calendar a la BD:

```bash
# Desde backend/
cd /home/veleiro/Documentos/QuickAI/Pelubot-main/backend

# Importar últimos 30 días
python scripts/sync_gcal_to_db.py --days 30

# O importar mes actual
python scripts/sync_gcal_to_db.py --current-month

# O importar y exportar (sincronización bidireccional)
python scripts/sync_gcal_to_db.py --mode both --days 60
```

**Resultado:** Las citas de Google Calendar se importarán a la BD y aparecerán en el portal.

### Solución 2: Endpoint de Sincronización Manual

Llama al endpoint admin desde curl/Postman:

```bash
curl -X POST http://127.0.0.1:8000/admin/sync \
  -H "X-API-Key: changeme" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "import",
    "days": 30,
    "by_professional": true,
    "default_service": "corte_cabello"
  }'
```

### Solución 3: Sincronización Automática Programada (Recomendada)

Configura un cron job o tarea programada para sincronizar regularmente:

```bash
# Crontab para sincronizar cada hora
0 * * * * cd /path/to/backend && python scripts/sync_gcal_to_db.py --days 7 --mode both

# O cada 30 minutos
*/30 * * * * cd /path/to/backend && python scripts/sync_gcal_to_db.py --days 3 --mode import
```

### Solución 4: Webhook de Google Calendar (Avanzada)

Implementar push notifications de Google Calendar:

```python
# TODO: Implementar webhook endpoint
@router.post("/webhooks/gcal")
def gcal_webhook(request: Request):
    # Procesar notificación de cambios
    # Sincronizar solo el evento modificado
    pass
```

## 🔧 RECOMENDACIÓN PARA PRODUCCIÓN

### Opción A: **Base de Datos como Fuente Principal** (Recomendado)

- ✅ Más rápido (no requiere llamadas a API externa)
- ✅ Funciona sin conexión a Google
- ✅ Control total de los datos
- ⚠️ Requiere sincronización bidireccional periódica

**Implementación:**
1. Crear todas las citas desde el frontend (POST /reservations)
2. El backend escribe en BD y sincroniza a GCal
3. Ejecutar sincronización cada hora para importar citas creadas manualmente en GCal

### Opción B: **Google Calendar como Fuente Principal**

- ✅ No requiere BD para reservas
- ❌ Más lento (llamadas API en cada consulta)
- ❌ Depende de disponibilidad de Google
- ❌ Límites de cuota de API

**Implementación:**
1. Modificar `/pros/overview` y `/pros/reservations` para consultar GCal en tiempo real
2. Cachear resultados para reducir llamadas API
3. Eliminar `ReservationDB` o usarla solo para caché

## 📋 PLAN DE MIGRACIÓN ACTUAL

### Estado Actual

```
✅ Backend: Escribe en BD + sincroniza a GCal cuando se crea desde API
❌ Portal: Solo lee de BD (no ve citas manuales de GCal)
✅ Sincronización: Existe endpoint /admin/sync pero no se ejecuta automáticamente
```

### Cambios Necesarios

1. **Inmediato:** Ejecutar sincronización inicial
   ```bash
   python scripts/sync_gcal_to_db.py --days 60 --mode import
   ```

2. **Corto plazo:** Configurar sincronización automática (cron cada hora)

3. **Mediano plazo:** Implementar sincronización en tiempo real con webhooks

4. **Largo plazo:** Decidir entre:
   - Mantener BD como fuente principal (con sync periódica)
   - Migrar a GCal como fuente principal (modificar consultas)

## 🧪 TESTING

### Verificar que la sincronización funciona:

```bash
# 1. Crear cita manualmente en Google Calendar

# 2. Ejecutar sincronización
python scripts/sync_gcal_to_db.py --mode import --days 1

# 3. Verificar en BD (psql/sqlite)
sqlite3 backend/data/pelubot.db "SELECT * FROM reservationdb;"

# 4. Verificar en portal
# Abrir http://localhost:5173/pros y verificar que aparece la cita
```

## 📊 ESTADÍSTICAS DE SINCRONIZACIÓN

El script muestra:
- ✅ **Insertadas:** Nuevas citas importadas de GCal
- 🔄 **Actualizadas:** Citas existentes modificadas
- 📤 **Creadas (push):** Eventos exportados a GCal
- 🔧 **Actualizadas (push):** Eventos actualizados en GCal
- 📅 **Calendarios procesados:** Número de calendarios sincronizados

## 🚨 NOTAS IMPORTANTES

1. **Modo `import`** es seguro - solo lee de GCal, no modifica nada
2. **Modo `push`** puede sobrescribir eventos en GCal - usar con cuidado
3. **Modo `both`** sincroniza en ambas direcciones - puede resolver conflictos
4. **API Key requerida:** Asegúrate de configurar `API_KEY` en `.env`

## 🔗 ARCHIVOS RELACIONADOS

- **Script de sincronización:** `backend/scripts/sync_gcal_to_db.py`
- **Endpoint admin:** `backend/app/api/routes.py` - `/admin/sync`
- **Lógica de sincronización:** `backend/app/services/logic.py` - `sync_from_gcal_range()`
- **Modelo de reserva:** `backend/app/models.py` - `ReservationDB`
- **Integración GCal:** `backend/app/integrations/google_calendar.py`
