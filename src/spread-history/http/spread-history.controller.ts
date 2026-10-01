import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  GoneException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { SpreadHistoryItemV1, SpreadHistoryPageV1 } from '@cosmic-arcana/sdk';
import { decodeCursor, encodeCursor, InvalidCursorError } from '../application/history-cursor';
import { GetSpreadHistoryItemQuery } from '../application/queries/get-spread-history-item.query';
import { GetSpreadHistoryQuery } from '../application/queries/get-spread-history.query';
import { SoftDeleteSpreadCommand } from '../application/commands/soft-delete-spread.command';
import type {
  HistoryCursor,
  SpreadHistoryLookup,
  SpreadHistoryPage,
} from '../domain/spread-history-entry';
import { DEFAULT_PAGE_SIZE, GetSpreadHistoryDto } from './get-spread-history.dto';
import { InternalTokenGuard } from './internal-token.guard';

@UseGuards(InternalTokenGuard)
@Controller('users/:userId/spread-history')
export class SpreadHistoryController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  // TODO(auth): the user comes from the path until authority-service-api issues verified tokens.
  @Get()
  async list(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query() query: GetSpreadHistoryDto,
  ): Promise<SpreadHistoryPageV1> {
    let after: HistoryCursor | null = null;
    if (query.cursor) {
      try {
        after = decodeCursor(query.cursor);
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }
    }

    const page: SpreadHistoryPage = await this.queryBus.execute(
      new GetSpreadHistoryQuery(userId, query.limit ?? DEFAULT_PAGE_SIZE, after),
    );

    return {
      items: page.entries.map((entry) => ({
        spreadId: entry.spreadId,
        question: entry.question,
        cards: entry.cards,
        prediction: entry.prediction,
        createdAt: entry.createdAt.toISOString(),
      })),
      nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    };
  }

  @Get(':spreadId')
  async one(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('spreadId', new ParseUUIDPipe()) spreadId: string,
  ): Promise<SpreadHistoryItemV1> {
    const lookup: SpreadHistoryLookup = await this.queryBus.execute(
      new GetSpreadHistoryItemQuery(userId, spreadId),
    );
    if (lookup.kind === 'removed') {
      throw new GoneException('spread was removed');
    }
    if (lookup.kind === 'unknown') {
      throw new NotFoundException('spread not found');
    }

    const { entry } = lookup;
    return {
      spreadId: entry.spreadId,
      question: entry.question,
      cards: entry.cards,
      prediction: entry.prediction,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  @Delete(':spreadId')
  async remove(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('spreadId', new ParseUUIDPipe()) spreadId: string,
  ): Promise<{ deleted: true }> {
    const deleted = await this.commandBus.execute(new SoftDeleteSpreadCommand(userId, spreadId));
    if (!deleted) {
      throw new NotFoundException('spread not found');
    }
    return { deleted: true };
  }
}
