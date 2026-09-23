import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { SpreadHistoryPage } from '../../domain/spread-history-entry';
import {
  SPREAD_HISTORY_REPOSITORY,
  type SpreadHistoryRepositoryPort,
} from '../ports/spread-history-repository.port';
import { GetSpreadHistoryQuery } from './get-spread-history.query';

@QueryHandler(GetSpreadHistoryQuery)
export class GetSpreadHistoryHandler implements IQueryHandler<GetSpreadHistoryQuery> {
  constructor(
    @Inject(SPREAD_HISTORY_REPOSITORY) private readonly history: SpreadHistoryRepositoryPort,
  ) {}

  async execute(query: GetSpreadHistoryQuery): Promise<SpreadHistoryPage> {
    const found = await this.history.findByUser(query.userId, query.limit + 1, query.after);
    const entries = found.slice(0, query.limit);
    const last = entries.at(-1);

    return {
      entries,
      nextCursor:
        found.length > query.limit && last
          ? { createdAt: last.createdAt.toISOString(), spreadId: last.spreadId }
          : null,
    };
  }
}
