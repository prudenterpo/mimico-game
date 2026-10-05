#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_BASE="${NEXT_PUBLIC_API_URL:-http://localhost:8080/api}"

echo "Probing backend contract at ${API_BASE}/tables ..."
status="$(curl -s -o /tmp/mimico-tables-probe.txt -w "%{http_code}" \
  -X POST "${API_BASE}/tables" \
  -H "Content-Type: application/json" \
  -d '{"name":"probe-contract"}' || true)"

if [[ -z "${status}" || "${status}" == "000" ]]; then
  cat <<EOF
BACKEND_CONTRACT_MISSING
O backend em localhost nao respondeu a POST ${API_BASE}/tables.
Corra api-mimico origin/develop (474a2f0) contra PostgreSQL 16 e Redis 7.
Este repositorio nao aplica patches a API.
EOF
  exit 1
fi

if [[ "${status}" == "404" ]]; then
  cat <<EOF
BACKEND_CONTRACT_MISSING
POST ${API_BASE}/tables devolveu 404.
Isso ja deveria estar em api-mimico origin/develop (474a2f0).
Este repositorio nao aplica patches a API.
EOF
  exit 1
fi

echo "POST /tables probe status=${status} (esperado 401/403 sem JWT)."
npx playwright test
