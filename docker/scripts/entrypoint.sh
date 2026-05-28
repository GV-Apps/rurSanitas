#!/bin/sh
set -e

# RUN_MIGRATIONS controla si este proceso corre las migraciones Alembic.
#   - Docker Compose / EC2: no se define → toma el default "true" → migra igual que antes.
#   - Kubernetes: el Deployment define RUN_MIGRATIONS=false y delega las migraciones
#     a un Job dedicado, evitando race conditions con múltiples réplicas.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "==> Ejecutando migraciones Alembic..."
  alembic upgrade head
fi

echo "==> Iniciando servidor Gunicorn + Uvicorn workers..."
exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${GUNICORN_WORKERS:-2}" \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
