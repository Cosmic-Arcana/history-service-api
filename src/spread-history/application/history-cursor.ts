import type { HistoryCursor } from '../domain/spread-history-entry';

export class InvalidCursorError extends Error {
  override readonly name = 'InvalidCursorError';

  constructor() {
    super('cursor is not a valid page cursor');
  }
}

export const encodeCursor = (cursor: HistoryCursor): string =>
  Buffer.from(`${cursor.createdAt}|${cursor.spreadId}`).toString('base64url');

export const decodeCursor = (value: string): HistoryCursor => {
  const [createdAt, spreadId, ...rest] = Buffer.from(value, 'base64url').toString().split('|');
  if (!createdAt || !spreadId || rest.length > 0 || Number.isNaN(Date.parse(createdAt))) {
    throw new InvalidCursorError();
  }
  return { createdAt, spreadId };
};
