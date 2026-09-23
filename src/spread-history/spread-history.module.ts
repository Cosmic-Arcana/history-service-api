import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SPREAD_CREATED_QUEUE } from '@cosmic-arcana/sdk';
import { ProjectSpreadCreatedHandler } from './application/commands/project-spread-created.handler';
import { GetSpreadHistoryHandler } from './application/queries/get-spread-history.handler';
import { SPREAD_HISTORY_REPOSITORY } from './application/ports/spread-history-repository.port';
import { TAROT_SPREADS } from './application/ports/tarot-spreads.port';
import { HttpTarotSpreadsClient } from './infrastructure/http-tarot-spreads.client';
import { TypeOrmSpreadHistoryRepository } from './infrastructure/typeorm-spread-history.repository';
import { SpreadCreatedProcessor } from './messaging/spread-created.processor';
import { SpreadHistoryController } from './http/spread-history.controller';

@Module({
  // registerQueue is what loads @nestjs/bullmq's worker explorer. Nothing injects the queue:
  // this service consumes spread.created and never publishes to it.
  imports: [BullModule.registerQueue({ name: SPREAD_CREATED_QUEUE })],
  controllers: [SpreadHistoryController],
  providers: [
    ProjectSpreadCreatedHandler,
    GetSpreadHistoryHandler,
    SpreadCreatedProcessor,
    { provide: SPREAD_HISTORY_REPOSITORY, useClass: TypeOrmSpreadHistoryRepository },
    { provide: TAROT_SPREADS, useClass: HttpTarotSpreadsClient },
  ],
})
export class SpreadHistoryModule {}
