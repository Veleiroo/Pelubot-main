# Benchmark PeluBot – Railway Plan 8 vCPU / 8 GB

## Entorno
- Reinicio completo entre escenarios: `docker compose down`, `docker volume rm pelubot_db`, limpieza de Google Calendar vía `/admin/clear_calendars`.
- Backend en Docker con `PELUBOT_FAKE_GCAL=0`, límites `CPUS=8`, `MEMORY=8g`.
- Base limpia con único estilista `deinis` (`password=1234`), sin semillas adicionales.
- Script de carga: `backend/tests/perf/pro_portal.k6.js` (k6 v0.49, imagen `grafana/k6:latest`).  
  Comandos de referencia:
  ```bash
  docker run --rm --network host \
    -v "$PWD/backend/tests/perf":/scripts grafana/k6 run \
    -e MODE=<baseline|read|write> \
    /scripts/pro_portal.k6.js \
    --summary-export /scripts/out/pro_<mode>_8cpu.json
  ```

## Resultados

| Escenario | Configuración | Iteraciones | p95 http (ms) | Error rate | Notas |
|-----------|---------------|-------------|---------------|------------|-------|
| `baseline` | 1 VU, 1 iter | 1 | 329 | 0 % | Primera lectura tras login; sin efectos GCal |
| `read` | Rampa 1→5 VU (1m45s) | 318 | 50 | 0 % | Overview + reservas; estable |
| `write` | Rampa 1→3 VU (2m) | 45 | 2 365 | 2.33 % | Creación, reprogramación, marcado, cancelación, borrado |

### Desglose escenario `write`
- `reservation_create_latency` p95 ≈ 5.15 s, máximo 10.8 s. Aunque ya aislamos el cliente GCal por hilo y añadimos timeouts cortos, la API externa sigue penalizando los tiempos cuando rechaza conexiones (`[SSL] record layer failure`).
- `reservation_reschedule_latency` p95 ≈ 2.48 s; `reservation_delete_latency` p95 ≈ 1.22 s. La mayoría de “errores” en k6 provienen de solapes que acaban en 400 legítimos (“Ya tienes una cita en esa hora”).
- No aparecen más `InvalidRequestError` en `stylist_reschedule`: el handler ahora devuelve 404 si la reserva desaparece después del commit.

### Observaciones del backend
- Bajo lectura pura los tiempos son <60 ms p95; CPU ~0.7 % y memoria ~180 MiB.
- Con escrituras concurrentes, UVicorn sigue por debajo del 10 % de CPU y ~180 MiB de RAM. Las llamadas a GCal ya no bloquean tanto (máximo 10.8 s frente a los ~60 s anteriores), pero siguen dominando la latencia de p95.
- Persisten los warnings `record layer failure`; Google corta la conexión cuando abrimos varios inserts en paralelo desde Docker. Al fallar, devolvemos 200 con mensaje de aviso, pero el coste en tiempo sigue ahí.
- Los errores HTTP que ve k6 (≈2 %) son 400 de negocio (solapes) y no caídas del backend.

## Conclusiones
1. **Lectura**: el portal profesional responde rápido (p95 ≈ 54 ms); el stack FastAPI + SQLite aguanta 5 VU continuos sin errores.
2. **Escritura**: la integración directa con Google Calendar domina la latencia (p95 ≈ 2.4 s, errores ≈ 2.3 %) y provoca fallos intermitentes; aún estamos a merced del API externo.
3. **Escritura**: aunque el cliente aislado evita cuelgues de 60 s, Google sigue siendo el cuello. Hace falta aislar la sincronización (cola) para que el usuario no espere a GCal.
4. **Mixed 15 VU**: a falta de una cola asíncrona, sigue sin ser viable—la API externa corta conexiones y k6 acaba abortando tras varios `EOF`.

## Recomendaciones
1. **Asincronizar / colas para GCal**: mover la sincronización a una cola (Celery, RQ) y responder al usuario tras persistir en DB. El p95 caería a <100 ms y los timeouts externos no impactarían al profesional.
2. **Retries controlados**: ya tenemos un retry corto; queda exponer mejor el fallo (mensaje al usuario, estado “pendiente de sync”).
3. **Fortalecer tests**: para estrés continuo, activar `PELUBOT_FAKE_GCAL=1` o un stub HTTP; reservar el modo real solo para smoke tests y validar el pipeline con menor concurrencia.
4. **Hardening backend**:
   - Mantener el guard clausula en `stylist_reschedule` (ya activo) y extenderlo a otros flujos sensibles.
   - Añadir circuit-breaker/cancelación si Google responde lento y registrar métricas para escalar a un job en background.

Los JSON completos con métricas crudas están en `backend/tests/perf/out/`. Ajusta los thresholds de k6 si quieres que las ejecuciones “aprueben” pese a los límites de la API externa; por ahora se dejan fallar para evidenciar el impacto real de Google Calendar.
