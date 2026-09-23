# history-service-api

Query side of the spreads. Owns the user's spread-history read model and never produces domain
events.

## Responsibilities

- Consumes `spread.created` from BullMQ, re-queries tarot-service-api for the spread's content and
  upserts one denormalized row per spread.
- Records every consumed `eventId` in an inbox table in the same transaction as the projection, so
  a redelivered event changes nothing.
- `GET /users/:userId/spread-history?limit=&cursor=` — reads only from its own store.

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
