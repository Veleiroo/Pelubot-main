# Pruebas de rendimiento `k6`

Este directorio contiene los scripts de carga que usamos para validar el portal profesional.

## Scripts

- `pro_portal.k6.js`: cubre los flujos autenticados del estilista.
  - `MODE=baseline`: una solicitud de overview + agenda para establecer latencia base.
  - `MODE=read`: lectura sostenida de overview y reservas.
  - `MODE=write`: creación, reprogramación, marcado y cancelación de citas.
  - `MODE=mixed`: mezcla lecturas y escrituras con rampa de usuarios.

## Ejecución rápida

```bash
# Asegúrate de tener el backend en marcha (p.ej. make docker-prod)
# Baseline
docker run --rm --network host -v "$PWD/backend/tests/perf":/scripts grafana/k6 run -e MODE=baseline /scripts/pro_portal.k6.js

# Lecturas concurrentes
docker run --rm --network host -v "$PWD/backend/tests/perf":/scripts grafana/k6 run -e MODE=read /scripts/pro_portal.k6.js --summary-export /scripts/out/pro_read.json

# Escrituras concurrentes
docker run --rm --network host -v "$PWD/backend/tests/perf":/scripts grafana/k6 run -e MODE=write /scripts/pro_portal.k6.js --summary-export /scripts/out/pro_write.json
```

Crea el directorio `backend/tests/perf/out/` si quieres guardar los resúmenes JSON.

Puedes sobreescribir credenciales con:

```bash
-e PRO_IDENTIFIER=deinis -e PRO_PASSWORD=1234 -e BASE_URL=http://localhost:8776
```

Mientras se ejecutan las pruebas captura `docker stats pelubot-backend` y exporta `/metrics` para correlacionar con los resultados.
