import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SpreadHistoryItemV1 } from '@cosmic-arcana/sdk';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { TAROT_SPREADS } from '../src/spread-history/application/ports/tarot-spreads.port';
import { createTestApp, resetDatabase } from './support/test-app';

describe('Feature: read one saved spread', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const tarot = { getSpread: jest.fn() };

  const userId = randomUUID();
  const otherUserId = randomUUID();
  const cards = [{ positionKey: 'past', cardId: 'queen-of-swords', reversed: true }];

  const seed = async (owner: string, createdAt = '2026-09-20T10:00:00.000Z'): Promise<string> => {
    const spreadId = randomUUID();
    await dataSource.query(
      `INSERT INTO spread_history (spread_id, user_id, question, prediction, cards, created_at, projected_at)
       VALUES ($1, $2, 'will the move work out?', 'stub prediction', $3, $4, now())`,
      [spreadId, owner, JSON.stringify(cards), createdAt],
    );
    return spreadId;
  };

  const read = (owner: string, spreadId: string) =>
    request(app.getHttpServer() as App).get(`/users/${owner}/spread-history/${spreadId}`);

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(TAROT_SPREADS).useValue(tarot));
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    tarot.getSpread.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Given a saved spread, When it is read by id, Then its question, cards, prediction and date come back', async () => {
    const spreadId = await seed(userId);

    const item = (await read(userId, spreadId).expect(200)).body as SpreadHistoryItemV1;

    expect(item).toEqual({
      spreadId,
      question: 'will the move work out?',
      cards,
      prediction: 'stub prediction',
      createdAt: '2026-09-20T10:00:00.000Z',
    });
    // The read side answers from its own store; it never calls the owner of the spread.
    expect(tarot.getSpread).not.toHaveBeenCalled();
  });

  it('Given more spreads than one page holds, When the oldest is read by id, Then it is found', async () => {
    const oldest = await seed(userId, '2026-01-01T00:00:00.000Z');
    for (let day = 1; day <= 25; day += 1) {
      await seed(userId, `2026-02-${String(day).padStart(2, '0')}T00:00:00.000Z`);
    }

    await read(userId, oldest).expect(200);
  });

  it("Given another user's spread, When it is read, Then it is reported unknown and its existence is not revealed", async () => {
    const spreadId = await seed(otherUserId);

    await read(userId, spreadId).expect(404);
  });

  it('Given a spread the history never saw, When it is read, Then it is reported unknown', async () => {
    await read(userId, randomUUID()).expect(404);
  });

  it('Given a removed spread, When it is read, Then it is reported gone, so a caller knows not to bring it back', async () => {
    const spreadId = await seed(userId);
    await request(app.getHttpServer() as App)
      .delete(`/users/${userId}/spread-history/${spreadId}`)
      .expect(200);

    await read(userId, spreadId).expect(410);
  });

  it('Given an id that is not a uuid, When it is read, Then the request is rejected', async () => {
    await read(userId, 'not-a-uuid').expect(400);
    await read('not-a-uuid', randomUUID()).expect(400);
  });
});
