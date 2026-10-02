import { Command } from '@nestjs/cqrs';

/** Resolves to false when the spread is not in this user's history, so the caller can answer 404. */
export class SoftDeleteSpreadCommand extends Command<boolean> {
  constructor(
    readonly userId: string,
    readonly spreadId: string,
  ) {
    super();
  }
}
