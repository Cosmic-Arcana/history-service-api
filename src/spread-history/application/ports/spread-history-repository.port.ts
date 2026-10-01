import type {
  HistoryCursor,
  SpreadHistoryEntry,
  SpreadHistoryLookup,
} from '../../domain/spread-history-entry';

export const SPREAD_HISTORY_REPOSITORY = Symbol('SPREAD_HISTORY_REPOSITORY');

export interface InboxRecord {
  eventId: string;
  eventType: string;
}

export interface SpreadHistoryRepositoryPort {
  isProcessed(eventId: string): Promise<boolean>;
  /**
   * Records the event in the inbox and upserts the read model in one transaction. Returns false
   * and changes nothing when the event was already recorded.
   */
  applyOnce(record: InboxRecord, entry: SpreadHistoryEntry): Promise<boolean>;
  findByUser(
    userId: string,
    limit: number,
    after: HistoryCursor | null,
  ): Promise<SpreadHistoryEntry[]>;
  findOne(userId: string, spreadId: string): Promise<SpreadHistoryLookup>;
  markDeleted(userId: string, spreadId: string): Promise<boolean>;
}
