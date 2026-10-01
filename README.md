# history-service-api

Query side of the spreads. Owns the user's spread-history read model and never produces domain
events.

**Vibe coding:** Claude remote control **and** Cursor (~$190 usage credits left after the hackathon).
History GET is unauthenticated. See `docs/completeness-audit.md`.

## Responsibilities

- Consumes `spread.created` from BullMQ, re-queries tarot-service-api for the spread's content and
  upserts one denormalized row per spread.
- Records every consumed `eventId` in an inbox table in the same transaction as the projection, so
  a redelivered event changes nothing.
- `GET /users/:userId/spread-history?limit=&cursor=` — reads only from its own store.
- `GET /users/:userId/spread-history/:spreadId` — one saved spread, however old. `404` when this
  user has no such spread in the read model (it may simply not be projected yet), `410` when the
  user removed it, so a caller never resurrects a removed spread from the write side.
- `DELETE /users/:userId/spread-history/:spreadId` — soft-deletes a saved spread.

The read model is derived data: it can be dropped and rebuilt by replaying the events.

## Layout

```text
src/spread-history/domain           read-model entry and cursor
src/spread-history/application      projection command, query, ports (tarot, repository)
src/spread-history/infrastructure   TypeORM adapters, HTTP client for tarot-service-api
src/spread-history/messaging        BullMQ processor
src/spread-history/http             controller and DTOs
```

## Running

```bash
cp .env.example .env
npm install
npm run start:dev      # http://localhost:3005
npm run test:e2e       # needs Docker
```
