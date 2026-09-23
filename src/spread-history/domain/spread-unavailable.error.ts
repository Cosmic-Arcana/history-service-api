/** tarot-service-api owns the spread; if it cannot serve it, the projection must be retried. */
export class SpreadUnavailableError extends Error {
  override readonly name = 'SpreadUnavailableError';

  constructor(spreadId: string) {
    super(`spread ${spreadId} could not be read from tarot-service-api`);
  }
}
