import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'log', 'debug', 'verbose').default('log'),

  HTTP_PORT: Joi.number().port().default(3005),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_RUN_MIGRATIONS: Joi.boolean().default(true),

  REDIS_HOST: Joi.string().hostname().default('127.0.0.1'),
  REDIS_PORT: Joi.number().port().default(6379),
  SPREAD_CREATED_CONCURRENCY: Joi.number().integer().min(1).max(100).default(10),

  TAROT_SERVICE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://127.0.0.1:3004'),
  TAROT_SERVICE_TIMEOUT_MS: Joi.number().integer().min(100).default(3_000),
});
