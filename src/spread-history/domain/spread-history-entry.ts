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
