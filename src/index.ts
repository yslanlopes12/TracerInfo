#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { runMigrations, closeDatabase } from './storage/database.js';
import { registerPersonCommand } from './cli/commands/person.js';
import { registerSearchCommand } from './cli/commands/search.js';
import { registerUsernameCommand } from './cli/commands/username.js';
import { registerReportCommand } from './cli/commands/report.js';

// ─── Package Info ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string; description: string };

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Ensure the database schema is up to date before any command runs
  try {
    await runMigrations();
  } catch {
    // Migrations may fail on first run if the drizzle folder doesn't exist yet.
    // The DB will be created automatically when the first query runs.
  }

  const program = new Command();

  program
    .name('tracerinfo')
    .description(pkg.description)
    .version(pkg.version, '-v, --version', 'Display the current version')
    .addHelpText(
      'after',
      `
Examples:
  $ tracerinfo person "João da Silva"
  $ tracerinfo person "João da Silva" --json
  $ tracerinfo person "João da Silva" --social instagram,x
  $ tracerinfo person "João da Silva" --extend
  $ tracerinfo username joaosilva
  $ tracerinfo search "João da Silva Empresa X"
  $ tracerinfo report <search-id>
      `,
    );

  // Register all commands
  registerPersonCommand(program);
  registerSearchCommand(program);
  registerUsernameCommand(program);
  registerReportCommand(program);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
