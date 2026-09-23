import { randomUUID } from 'node:crypto';
import type { SpreadCreatedV1, SpreadDetailsV1 } from '@cosmic-arcana/sdk';

export const spreadCreated = (overrides: Partial<SpreadCreatedV1> = {}): SpreadCreatedV1 => ({
  version: 1,
  eventId: randomUUID(),
  spreadId: randomUUID(),
  userId: randomUUID(),
  occurredAt: new Date().toISOString(),
  ...overrides,
});

export const spreadDetails = (
  event: SpreadCreatedV1,
  prediction = 'stub prediction',
): SpreadDetailsV1 => ({
  spreadId: event.spreadId,
  userId: event.userId,
  question: 'will the move work out?',
  cards: [{ positionKey: 'stub', cardId: 'stub-0a1b2c3d', reversed: false }],
  prediction,
  createdAt: event.occurredAt,
});
