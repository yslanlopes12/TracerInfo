import type { Config } from 'drizzle-kit';

export default {
  schema: './src/storage/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'libsql',
  dbCredentials: {
    url: `file:${process.env['DATABASE_PATH'] ?? './tracerinfo.db'}`,
  },
} satisfies Config;
