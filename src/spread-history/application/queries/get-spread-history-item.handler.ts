import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { SpreadHistoryLookup } from '../../domain/spread-history-entry';
import {
  SPREAD_HISTORY_REPOSITORY,
  type SpreadHistoryRepositoryPort,
} from '../ports/spread-history-repository.port';
import { GetSpreadHistoryItemQuery } from './get-spread-history-item.query';

@QueryHandler(GetSpreadHistoryItemQuery)
export class GetSpreadHistoryItemHandler implements IQueryHandler<GetSpreadHistoryItemQuery> {
  constructor(
    @Inject(SPREAD_HISTORY_REPOSITORY) private readonly history: SpreadHistoryRepositoryPort,
  ) {}

  execute(query: GetSpreadHistoryItemQuery): Promise<SpreadHistoryLookup> {
    return this.history.findOne(query.userId, query.spreadId);
  }
}
