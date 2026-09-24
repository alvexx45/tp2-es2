#!/bin/sh
# Ordem de subida (Seção 4.3): migrations → seed (idempotente) → servidor.
set -e

echo "Aplicando migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "Executando seed (idempotente)..."
  node dist/seed/executar.js
fi

exec node dist/server.js
