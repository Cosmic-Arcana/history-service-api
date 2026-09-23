import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { SpreadHistoryPageV1 } from '@cosmic-arcana/sdk';
import { decodeCursor, encodeCursor, InvalidCursorError } from '../application/history-cursor';
import { GetSpreadHistoryQuery } from '../application/queries/get-spread-history.query';
import type { HistoryCursor, SpreadHistoryPage } from '../domain/spread-history-entry';
import { DEFAULT_PAGE_SIZE, GetSpreadHistoryDto } from './get-spread-history.dto';

@Controller('users/:userId/spread-history')
export class SpreadHistoryController {
  constructor(private readonly queryBus: QueryBus) {}

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
}
