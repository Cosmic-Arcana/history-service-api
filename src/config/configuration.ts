export interface AppConfig {
  serviceName: string;
  nodeEnv: string;
  logLevel: string;
  http: { port: number };
  database: { url: string; runMigrations: boolean };
  redis: { host: string; port: number };
  spreadCreatedConsumer: { concurrency: number };
  tarotService: { baseUrl: string; timeoutMs: number };
}

export const configuration = (): AppConfig => ({
  serviceName: 'history-service-api',
  nodeEnv: process.env.NODE_ENV as string,
  logLevel: process.env.LOG_LEVEL as string,
  http: { port: Number(process.env.HTTP_PORT) },
  database: {
    url: process.env.DATABASE_URL as string,
    runMigrations: process.env.DATABASE_RUN_MIGRATIONS === 'true',
  },
  redis: { host: process.env.REDIS_HOST as string, port: Number(process.env.REDIS_PORT) },
  spreadCreatedConsumer: { concurrency: Number(process.env.SPREAD_CREATED_CONCURRENCY) },
  tarotService: {
    baseUrl: process.env.TAROT_SERVICE_URL as string,
    timeoutMs: Number(process.env.TAROT_SERVICE_TIMEOUT_MS),
  },
});
