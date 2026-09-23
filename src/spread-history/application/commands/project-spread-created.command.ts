import { Command } from '@nestjs/cqrs';
import type { SpreadCreatedV1 } from '@cosmic-arcana/sdk';

export type ProjectionOutcome = 'applied' | 'duplicate';

/**
 * Internal to the read side: "apply this event to the read model". history-service-api never
 * produces domain events. It is a command rather than an event so the broker can await the
 * result and retry a failed projection.
 */
export class ProjectSpreadCreatedCommand extends Command<ProjectionOutcome> {
  constructor(readonly event: SpreadCreatedV1) {
    super();
  }
}
