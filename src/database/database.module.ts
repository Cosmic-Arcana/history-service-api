import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration';
import { InboxEntity } from '../spread-history/infrastructure/inbox.entity';
import { SpreadHistoryEntity } from '../spread-history/infrastructure/spread-history.entity';
import { CreateSpreadHistoryAndInbox1790092012000 } from './migrations/1790092012000-create-spread-history-and-inbox';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.getOrThrow<AppConfig['database']>('database');
        return {
          type: 'postgres',
          url: database.url,
          entities: [SpreadHistoryEntity, InboxEntity],
          migrations: [CreateSpreadHistoryAndInbox1790092012000],
          migrationsRun: database.runMigrations,
          synchronize: false,
          // TypeORM's logger writes to the console, which bypasses the structured logger.
          logging: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
