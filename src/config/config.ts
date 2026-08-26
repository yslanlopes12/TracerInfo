import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

// ─── Config Schema ────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  databasePath: z.string().min(1).default('./tracerinfo.db'),
  requestTimeout: z.coerce.number().int().positive().default(10_000),
  requestIntervalMs: z.coerce.number().int().nonnegative().default(1_500),
  cacheTtl: z.coerce.number().int().nonnegative().default(3_600),
  logLevel: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

// ─── Singleton Config ─────────────────────────────────────────────────────────

function loadConfig(): Config {
  return ConfigSchema.parse({
    databasePath: process.env['DATABASE_PATH'],
    requestTimeout: process.env['REQUEST_TIMEOUT'],
    requestIntervalMs: process.env['REQUEST_INTERVAL_MS'],
    cacheTtl: process.env['CACHE_TTL'],
    logLevel: process.env['LOG_LEVEL'],
  });
}

/** Application configuration, loaded once at startup. */
export const config: Config = loadConfig();
