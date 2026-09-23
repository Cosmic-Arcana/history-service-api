import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseSpreadDetailsV1, type SpreadDetailsV1 } from '@cosmic-arcana/sdk';
import type { AppConfig } from '../../config/configuration';
import {
  CORRELATION_ID_HEADER,
  isValidCorrelationId,
} from '../../common/correlation/correlation.constants';
import { getCorrelationId } from '../../common/correlation/correlation.storage';
import { elapsedMs } from '../../common/logging/elapsed-ms';
import type { TarotSpreadsPort } from '../application/ports/tarot-spreads.port';

@Injectable()
export class HttpTarotSpreadsClient implements TarotSpreadsPort {
  private readonly logger = new Logger(HttpTarotSpreadsClient.name);
  private readonly settings: AppConfig['tarotService'];

  constructor(config: ConfigService) {
    this.settings = config.getOrThrow<AppConfig['tarotService']>('tarotService');
  }

  async getSpread(spreadId: string): Promise<SpreadDetailsV1 | null> {
    const startedAt = process.hrtime.bigint();
    const url = new URL(`/spreads/${spreadId}`, this.settings.baseUrl);
    const correlationId = getCorrelationId();
    const headers: Record<string, string> = { accept: 'application/json' };
    if (isValidCorrelationId(correlationId)) {
      headers[CORRELATION_ID_HEADER] = correlationId;
    }

    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.settings.timeoutMs),
      });

      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`tarot-service-api responded with ${response.status}`);
      }
      return parseSpreadDetailsV1(await response.json());
    } catch (error) {
      const { name, message } = error as Error;
      this.logger.warn('outbound call failed', {
        method: 'GET',
        route: '/spreads/:spreadId',
        durationMs: elapsedMs(startedAt),
        outcome: 'error',
        errorName: name,
        errorMessage: message,
      });
      throw error;
    }
  }
}
