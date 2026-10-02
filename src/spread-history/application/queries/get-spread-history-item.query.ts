import { Query } from '@nestjs/cqrs';
import type { SpreadHistoryLookup } from '../../domain/spread-history-entry';

export class GetSpreadHistoryItemQuery extends Query<SpreadHistoryLookup> {
  constructor(
    readonly userId: string,
    readonly spreadId: string,
  ) {
    super();
  }
}
