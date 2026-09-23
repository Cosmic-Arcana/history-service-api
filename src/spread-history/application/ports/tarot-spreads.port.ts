import type { SpreadDetailsV1 } from '@cosmic-arcana/sdk';

export const TAROT_SPREADS = Symbol('TAROT_SPREADS');

/** The event is a thin fact, so the projection re-queries the owner for the spread's content. */
export interface TarotSpreadsPort {
  getSpread(spreadId: string): Promise<SpreadDetailsV1 | null>;
}
