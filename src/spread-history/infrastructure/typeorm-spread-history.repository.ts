import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  InboxRecord,
  SpreadHistoryRepositoryPort,
} from '../application/ports/spread-history-repository.port';
import type {
  HistoryCursor,
  SpreadHistoryEntry,
  SpreadHistoryLookup,
} from '../domain/spread-history-entry';
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
      .andWhere('history.deletedAt IS NULL')
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

  async findOne(userId: string, spreadId: string): Promise<SpreadHistoryLookup> {
    // The owner is part of the key, so another user's spread is indistinguishable from none.
    const row = await this.dataSource
      .getRepository(SpreadHistoryEntity)
      .findOneBy({ spreadId, userId });
    if (!row) {
      return { kind: 'unknown' };
    }
    if (row.deletedAt) {
      return { kind: 'removed' };
    }
    const { question, cards, prediction, createdAt } = row;
    return { kind: 'found', entry: { spreadId, userId, question, cards, prediction, createdAt } };
  }

  async markDeleted(userId: string, spreadId: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(SpreadHistoryEntity)
      .createQueryBuilder()
      .update(SpreadHistoryEntity)
      .set({ deletedAt: new Date() })
      .where('spread_id = :spreadId', { spreadId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('deleted_at IS NULL')
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
