import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  SPREAD_HISTORY_REPOSITORY,
  type SpreadHistoryRepositoryPort,
} from '../ports/spread-history-repository.port';
import { SoftDeleteSpreadCommand } from './soft-delete-spread.command';

@CommandHandler(SoftDeleteSpreadCommand)
export class SoftDeleteSpreadHandler implements ICommandHandler<SoftDeleteSpreadCommand, boolean> {
  constructor(
    @Inject(SPREAD_HISTORY_REPOSITORY) private readonly history: SpreadHistoryRepositoryPort,
  ) {}

  execute(command: SoftDeleteSpreadCommand): Promise<boolean> {
    return this.history.markDeleted(command.userId, command.spreadId);
  }
}
