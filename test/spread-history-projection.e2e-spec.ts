import type { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Queue, QueueEvents } from 'bullmq';
import { DataSource } from 'typeorm';
import {
  SPREAD_CREATED_EVENT,
  SPREAD_CREATED_QUEUE,
  type SpreadCreatedV1,
} from '@cosmic-arcana/sdk';
import { ProjectSpreadCreatedCommand } from '../src/spread-history/application/commands/project-spread-created.command';
import { TAROT_SPREADS } from '../src/spread-history/application/ports/tarot-spreads.port';
import { countRows, createTestApp, resetDatabase } from './support/test-app';
import { spreadCreated, spreadDetails } from './support/spread-fixtures';

describe('Feature: project spread.created into the spread history', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commandBus: CommandBus;
  let producer: Queue;
  let queueEvents: QueueEvents;
  const tarot = { getSpread: jest.fn() };

  const publish = (event: SpreadCreatedV1, jobId: string) =>
    producer.add(
      SPREAD_CREATED_EVENT,
      {
        meta: { correlationId: 'test-correlation-id', producer: 'tarot-service-api' },
        data: event,
      },
      { jobId, attempts: 1 },
    );

  const consume = async (event: SpreadCreatedV1, jobId: string): Promise<string> => {
    const job = await publish(event, jobId);
    return (await job.waitUntilFinished(queueEvents, 10_000)) as string;
  };

  const historyRows = () =>
    dataSource.query<{ spread_id: string; user_id: string; prediction: string; cards: unknown }[]>(
      'SELECT spread_id, user_id, prediction, cards FROM spread_history',
    );

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(TAROT_SPREADS).useValue(tarot));
    dataSource = app.get(DataSource);
    commandBus = app.get(CommandBus);

    const connection = { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) };
    producer = new Queue(SPREAD_CREATED_QUEUE, { connection });
    queueEvents = new QueueEvents(SPREAD_CREATED_QUEUE, { connection });
    await queueEvents.waitUntilReady();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    tarot.getSpread.mockReset();
  });

  afterAll(async () => {
    await queueEvents.close();
    await producer.close();
    await app.close();
  });

  it('Given spread.created on the queue, When history consumes it, Then the read model is updated exactly once', async () => {
    const event = spreadCreated();
    tarot.getSpread.mockResolvedValue(spreadDetails(event));

    await expect(consume(event, event.eventId)).resolves.toBe('applied');

    const rows = await historyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ spread_id: event.spreadId, user_id: event.userId });
    expect(rows[0].cards).toEqual(spreadDetails(event).cards);
    expect(tarot.getSpread).toHaveBeenCalledWith(event.spreadId);
    expect(await countRows(dataSource, 'inbox')).toBe(1);
  });

  it('Given the same spread.created delivered twice, When history consumes both, Then the read model is updated only once', async () => {
    const event = spreadCreated();
    tarot.getSpread
      .mockResolvedValueOnce(spreadDetails(event, 'first projection'))
      .mockResolvedValueOnce(spreadDetails(event, 'second projection'));

    // Deliberately different job ids: the inbox must be what dedupes, not BullMQ's jobId check.
    await expect(consume(event, `${event.eventId}-first`)).resolves.toBe('applied');
    await expect(consume(event, `${event.eventId}-second`)).resolves.toBe('duplicate');

    const rows = await historyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].prediction).toBe('first projection');
    expect(await countRows(dataSource, 'inbox')).toBe(1);
  });

  it('Given the same event projected concurrently, When both run, Then the inbox lets exactly one through', async () => {
    const event = spreadCreated();
    tarot.getSpread.mockResolvedValue(spreadDetails(event));

    const outcomes = await Promise.all([
      commandBus.execute(new ProjectSpreadCreatedCommand(event)),
      commandBus.execute(new ProjectSpreadCreatedCommand(event)),
    ]);

    expect(outcomes.sort()).toEqual(['applied', 'duplicate']);
    expect(await countRows(dataSource, 'spread_history')).toBe(1);
  });

  it('Given a malformed job, When history consumes it, Then it fails without retrying and writes nothing', async () => {
    const job = await producer.add(
      SPREAD_CREATED_EVENT,
      { meta: { correlationId: 'test-correlation-id', producer: 'tarot-service-api' }, data: {} },
      { jobId: 'malformed-job', attempts: 5 },
    );

    await expect(job.waitUntilFinished(queueEvents, 10_000)).rejects.toThrow('spread.created');

    const failed = await producer.getJob('malformed-job');
    expect(failed?.attemptsMade).toBe(1);
    expect(await countRows(dataSource, 'spread_history')).toBe(0);
    expect(await countRows(dataSource, 'inbox')).toBe(0);
  });
});
