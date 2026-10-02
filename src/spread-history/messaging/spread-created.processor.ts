import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { CommandBus } from '@nestjs/cqrs';
import { UnrecoverableError, type Job } from 'bullmq';
import {
  parseSpreadCreatedEnvelope,
  SPREAD_CREATED_EVENT,
  SPREAD_CREATED_QUEUE,
  type SpreadCreatedEnvelope,
} from '@cosmic-arcana/sdk';
import { runWithCorrelationId } from '../../common/correlation/correlation.storage';
import { elapsedMs } from '../../common/logging/elapsed-ms';
import {
  ProjectSpreadCreatedCommand,
  type ProjectionOutcome,
} from '../application/commands/project-spread-created.command';
import type { AppConfig } from '../../config/configuration';

@Processor(SPREAD_CREATED_QUEUE)
export class SpreadCreatedProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(SpreadCreatedProcessor.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly config: ConfigService,
  ) {
    super();
  }

  // The worker only exists once the BullMQ explorer has run, so concurrency, which comes from
  // validated config, is applied at bootstrap instead of in the static @Processor options.
  // Projections are independent per spread and the inbox guards duplicates, so parallel is safe.
  onApplicationBootstrap(): void {
    this.worker.concurrency =
      this.config.getOrThrow<AppConfig['spreadCreatedConsumer']>(
        'spreadCreatedConsumer',
      ).concurrency;
  }

  process(job: Job<unknown>): Promise<ProjectionOutcome> {
    const envelope = this.parse(job);
    return runWithCorrelationId(envelope.meta.correlationId, () => this.project(job, envelope));
  }

  @OnWorkerEvent('error')
  onWorkerError(error: Error): void {
    this.logger.error('broker connection failed', {
      errorName: error.name,
      errorMessage: error.message,
    });
  }

  private parse(job: Job<unknown>): SpreadCreatedEnvelope {
    try {
      if (job.name !== SPREAD_CREATED_EVENT) {
        throw new Error(`unexpected event ${job.name}`);
      }
      return parseSpreadCreatedEnvelope(job.data);
    } catch (error) {
      const { name, message } = error as Error;
      this.logger.error('inbound job rejected', {
        messagePattern: job.name,
        outcome: 'rejected',
        errorName: name,
        errorMessage: message,
      });
      // Malformed jobs are never going to parse: fail them without burning retries.
      throw new UnrecoverableError(message);
    }
  }

  private async project(
    job: Job<unknown>,
    envelope: SpreadCreatedEnvelope,
  ): Promise<ProjectionOutcome> {
    const startedAt = process.hrtime.bigint();
    const attempt = job.attemptsMade + 1;
    const base = { messagePattern: SPREAD_CREATED_EVENT, eventId: envelope.data.eventId, attempt };

    try {
      const outcome = await this.commandBus.execute(new ProjectSpreadCreatedCommand(envelope.data));
      this.logger.log('inbound job handled', {
        ...base,
        durationMs: elapsedMs(startedAt),
        outcome,
      });
      return outcome;
    } catch (error) {
      const { name, message, stack } = error as Error;
      const fields = {
        ...base,
        durationMs: elapsedMs(startedAt),
        outcome: 'error',
        errorName: name,
        errorMessage: message,
      };
      if (attempt < (job.opts.attempts ?? 1)) {
        this.logger.warn('inbound job failed, retrying', fields);
      } else {
        this.logger.error('inbound job failed', fields, stack);
      }
      throw error;
    }
  }
}
