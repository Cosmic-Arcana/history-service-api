import { Query } from '@nestjs/cqrs';
import type { HistoryCursor, SpreadHistoryPage } from '../../domain/spread-history-entry';

export class GetSpreadHistoryQuery extends Query<SpreadHistoryPage> {
  constructor(
    readonly userId: string,
    readonly limit: number,
    readonly after: HistoryCursor | null,
  ) {
    super();
  }
}
