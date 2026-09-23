import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { SPREAD_CREATED_EVENT } from '@cosmic-arcana/sdk';
import { SpreadUnavailableError } from '../../domain/spread-unavailable.error';
import {
  SPREAD_HISTORY_REPOSITORY,
  type SpreadHistoryRepositoryPort,
} from '../ports/spread-history-repository.port';
import { TAROT_SPREADS, type TarotSpreadsPort } from '../ports/tarot-spreads.port';
import {
  ProjectSpreadCreatedCommand,
  type ProjectionOutcome,
} from './project-spread-created.command';

@CommandHandler(ProjectSpreadCreatedCommand)
export class ProjectSpreadCreatedHandler implements ICommandHandler<ProjectSpreadCreatedCommand> {
  constructor(
    @Inject(SPREAD_HISTORY_REPOSITORY) private readonly history: SpreadHistoryRepositoryPort,
    @Inject(TAROT_SPREADS) private readonly tarot: TarotSpreadsPort,
  ) {}

  async execute({ event }: ProjectSpreadCreatedCommand): Promise<ProjectionOutcome> {
    // Cheap early exit for redeliveries; the inbox insert below is what actually guards the race.
    if (await this.history.isProcessed(event.eventId)) {
      return 'duplicate';
    }

    const spread = await this.tarot.getSpread(event.spreadId);
    if (!spread) {
      throw new SpreadUnavailableError(event.spreadId);
    }

    const applied = await this.history.applyOnce(
      { eventId: event.eventId, eventType: SPREAD_CREATED_EVENT },
      {
        spreadId: event.spreadId,
        userId: event.userId,
        question: spread.question,
        cards: spread.cards,
        prediction: spread.prediction,
        createdAt: new Date(spread.createdAt),
      },
    );
    return applied ? 'applied' : 'duplicate';
  }
}
