import { decodeCursor, encodeCursor, InvalidCursorError } from './history-cursor';

describe('history cursor', () => {
  const cursor = { createdAt: '2026-09-29T21:15:30.123Z', spreadId: 'f1e2d3c4-b5a6-4788-9900-112233445566' };

  it('survives a round trip', () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('is opaque to the caller', () => {
    expect(encodeCursor(cursor)).not.toContain(cursor.spreadId);
  });

  it.each([
    ['empty', ''],
    ['not base64url of two parts', 'bm90LWEtY3Vyc29y'],
    ['a cursor with extra parts', Buffer.from('a|b|c').toString('base64url')],
    ['a cursor whose timestamp is not a date', Buffer.from('never|spread').toString('base64url')],
  ])('rejects %s', (_case, value) => {
    expect(() => decodeCursor(value)).toThrow(InvalidCursorError);
  });
});
