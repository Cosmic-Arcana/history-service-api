import type { SpreadCardV1 } from '@cosmic-arcana/sdk';

/** One row of the read model: everything the history screen shows for one spread. */
export interface SpreadHistoryEntry {
  spreadId: string;
  userId: string;
  question: string;
  cards: SpreadCardV1[];
  prediction: string;
  createdAt: Date;
}

export interface HistoryCursor {
  createdAt: string;
  spreadId: string;
}

export interface SpreadHistoryPage {
  entries: SpreadHistoryEntry[];
  nextCursor: HistoryCursor | null;
}

/**
 * Why a lookup of one spread came back empty-handed matters to the caller: "removed" must never
 * be answered from the write side, while "unknown" may simply mean the projection has not run yet.
 */
export type SpreadHistoryLookup =
  { kind: 'found'; entry: SpreadHistoryEntry } | { kind: 'removed' } | { kind: 'unknown' };
