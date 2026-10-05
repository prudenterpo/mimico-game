# Four-client video smoke

This folder keeps the 2026-10-04 lobby-to-match proof in the repository: four isolated Chromium contexts, fake camera/microphone, PostgreSQL + Redis via `api-mimico` develop.

## What it proves

1. Four browsers authenticate on the same table.
2. Three guests receive `TABLE_INVITE_RECEIVED` and accept.
3. The host assigns 2+2 teams and starts.
4. All four open the same `/game/{tableId}` URL.
5. Each page shows four media tiles, marks the mime tile or the current `MATCH_SETUP` sorteio, and attaches a fake-camera stream.

It does not cover palpite, roubo, timeout, rematch, disconnect, TURN, or PeerJS.

## Backend (not in this repo)

HTTP (`NEXT_PUBLIC_API_URL`, default `http://localhost:8080/api`):

- `POST /auth/register`
- `POST /auth/login`
- `POST /tables`
- `GET /tables/{tableId}`

STOMP (`NEXT_PUBLIC_WS_URL`, default `http://localhost:8080/ws`). Invites still use `/user/queue/invite` with type `TABLE_INVITE_RECEIVED`, matching `src/lib/api.ts` and `src/stores/store.ts`.

If localhost refuses `/api/tables`, `TABLE_*` statuses, or the invite STOMP path, stop. That contract belongs to `api-mimico` `origin/develop` (`474a2f0`). Do not patch the API from this frontend repo.

## Local run

1. Start PostgreSQL 16 and Redis 7:

   ```bash
   docker compose -f e2e/docker-compose.yml up -d
   ```

2. Start `api-mimico` from `origin/develop` against those services (default JDBC `localhost:5432/mimico_db`, Redis `localhost:6379`).

3. From this repo:

   ```bash
   npm install
   npx playwright install chromium
   npm run test:e2e
   ```

   Or `./e2e/run-smoke.sh`, which probes `POST /tables` first.

The Playwright web server builds and runs `next start` so the Next.js dev overlay cannot block the flow. `npm test` stays Vitest and is unchanged.

## CI

`.github/workflows/e2e-four-client.yml` is a dedicated job. It does not replace or gate the unit suite.
