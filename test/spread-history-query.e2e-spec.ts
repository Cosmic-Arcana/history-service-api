import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SpreadHistoryPageV1 } from '@cosmic-arcana/sdk';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { TAROT_SPREADS } from '../src/spread-history/application/ports/tarot-spreads.port';
import { createTestApp, resetDatabase } from './support/test-app';

describe('Feature: read the spread history', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const tarot = { getSpread: jest.fn() };

  const userId = randomUUID();
  const otherUserId = randomUUID();

  const seed = (owner: string, createdAt: string) =>
    dataSource.query(
      `INSERT INTO spread_history (spread_id, user_id, question, prediction, cards, created_at, projected_at)
       VALUES ($1, $2, 'will the move work out?', 'stub prediction', $3, $4, now())`,
      [randomUUID(), owner, JSON.stringify([]), createdAt],
    );

  const list = (query = '') =>
    request(app.getHttpServer() as App).get(`/users/${userId}/spread-history${query}`);

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

  it('Given spreads of several users, When listing one user, Then only their spreads are returned newest first', async () => {
    await seed(userId, '2026-09-20T10:00:00.000Z');
    await seed(userId, '2026-09-21T10:00:00.000Z');
    await seed(otherUserId, '2026-09-22T10:00:00.000Z');

    const page = (await list().expect(200)).body as SpreadHistoryPageV1;

    expect(page.items.map((item) => item.createdAt)).toEqual([
      '2026-09-21T10:00:00.000Z',
      '2026-09-20T10:00:00.000Z',
    ]);
    expect(page.nextCursor).toBeNull();
    // The read side answers from its own store; it never calls the owner of the spread.
    expect(tarot.getSpread).not.toHaveBeenCalled();
  });

  it('Given more spreads than the page size, When paging with the cursor, Then every spread is returned once', async () => {
    await seed(userId, '2026-09-20T10:00:00.000Z');
    await seed(userId, '2026-09-21T10:00:00.000Z');
    await seed(userId, '2026-09-22T10:00:00.000Z');

    const first = (await list('?limit=2').expect(200)).body as SpreadHistoryPageV1;
    expect(first.items).toHaveLength(2);
    expect(typeof first.nextCursor).toBe('string');

    const second = (await list(`?limit=2&cursor=${first.nextCursor}`).expect(200))
      .body as SpreadHistoryPageV1;
    expect(second.items.map((item) => item.createdAt)).toEqual(['2026-09-20T10:00:00.000Z']);
    expect(second.nextCursor).toBeNull();
  });

  it('Given a broken cursor, When listing, Then the request is rejected', async () => {
    await list('?cursor=not-a-cursor').expect(400);
  });

  it('Given a non-uuid user, When listing, Then the request is rejected', async () => {
    await request(app.getHttpServer() as App)
      .get('/users/not-a-uuid/spread-history')
      .expect(400);
  });
});
