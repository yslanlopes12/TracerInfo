import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { config } from '../config/config.js';
import * as schema from './schema.js';

// ─── Database Connection ──────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: Client | null = null;

/**
 * Returns the singleton Drizzle ORM database instance.
 * Uses @libsql/client — no native bindings required.
 */
export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db !== null) {
    return _db;
  }

  _client = createClient({
    url: `file:${config.databasePath}`,
  });

  _db = drizzle(_client, { schema });
  return _db;
}

/**
 * Runs all pending database migrations from the ./drizzle directory.
 */
export async function runMigrations(): Promise<void> {
  const db = getDatabase();
  await migrate(db, { migrationsFolder: './drizzle' });
}

/**
 * Closes the database client connection.
 * Should be called on application shutdown.
 */
export function closeDatabase(): void {
  _client?.close();
  _client = null;
  _db = null;
}

export type Db = ReturnType<typeof getDatabase>;
