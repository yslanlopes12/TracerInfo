#!/usr/bin/env node
/**
 * Standalone migration script.
 * Run: npm run db:migrate
 */

import { runMigrations, closeDatabase } from './database.js';

console.log('Running database migrations...');

try {
  await runMigrations();
  console.log('✓ Migrations applied successfully.');
} catch (err) {
  console.error('✗ Migration failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  closeDatabase();
}
