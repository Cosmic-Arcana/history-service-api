import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  InboxRecord,
  SpreadHistoryRepositoryPort,
} from '../application/ports/spread-history-repository.port';
import type { HistoryCursor, SpreadHistoryEntry } from '../domain/spread-history-entry';
import { InboxEntity } from './inbox.entity';
import { SpreadHistoryEntity } from './spread-history.entity';

@Injectable()
export class TypeOrmSpreadHistoryRepository implements SpreadHistoryRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  isProcessed(eventId: string): Promise<boolean> {
    return this.dataSource.getRepository(InboxEntity).existsBy({ eventId });
  }

  applyOnce(record: InboxRecord, entry: SpreadHistoryEntry): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const inbox = await manager
        .createQueryBuilder()
        .insert()
        .into(InboxEntity)
        .values({ ...record, processedAt: new Date() })
        .orIgnore()
        .returning('event_id')
        .execute();

      if ((inbox.raw as unknown[]).length === 0) {
        return false;
      }

      await manager
        .createQueryBuilder()
        .insert()
        .into(SpreadHistoryEntity)
        .values({ ...entry, projectedAt: new Date() })
        .orUpdate(
          ['user_id', 'question', 'prediction', 'cards', 'created_at', 'projected_at'],
          ['spread_id'],
        )
        .execute();
      return true;
    });
  }

  async findByUser(
    userId: string,
    limit: number,
    after: HistoryCursor | null,
  ): Promise<SpreadHistoryEntry[]> {
    const query = this.dataSource
      .getRepository(SpreadHistoryEntity)
      .createQueryBuilder('history')
      .where('history.userId = :userId', { userId })
      .orderBy('history.createdAt', 'DESC')
      .addOrderBy('history.spreadId', 'DESC')
      .limit(limit);

    if (after) {
      query.andWhere(
        '(history.createdAt, history.spreadId) < (CAST(:createdAt AS timestamptz), CAST(:spreadId AS uuid))',
        after,
      );
    }

    const rows = await query.getMany();
    return rows.map(({ spreadId, userId: owner, question, cards, prediction, createdAt }) => ({
      spreadId,
      userId: owner,
      question,
      cards,
      prediction,
      createdAt,
    }));
  }
}
