import type { Command } from 'commander';
import { buildSearchQuery } from '../../core/models/SearchQuery.js';
import { SearchOrchestrator } from '../../core/search/SearchOrchestrator.js';
import { createProductionSources } from '../../sources/web/sourceRegistry.js';
import { getDatabase } from '../../storage/database.js';
import { SearchRepository } from '../../storage/repositories/SearchRepository.js';
import { ProgressManager } from '../ui/progress.js';
import { printHeader, printSection, printResult, printSummary, printError } from '../ui/terminal.js';
import { renderSourceSummaryTable } from '../ui/tables.js';

interface SearchCommandOptions {
  json: boolean;
  noCache: boolean;
}

async function handleGenericSearch(
  queryStr: string,
  options: SearchCommandOptions,
): Promise<void> {
  const progress = new ProgressManager(options.json);
  const db = getDatabase();
  const searchRepo = new SearchRepository(db);

  const query = buildSearchQuery(queryStr, 'generic', { noCache: options.noCache });

  const orchestrator = new SearchOrchestrator(searchRepo);
  for (const source of createProductionSources()) orchestrator.registerSource(source);

  if (!options.json) {
    printHeader('TracerInfo OSINT');
    console.log(`  Searching: ${queryStr}\n`);
  }

  progress.start('Searching...');
  const { results, outcomes, totalDurationMs, cached } = await orchestrator.run(query);
  progress.stop();

  let searchId: string;
  if (!cached) {
    const search = await searchRepo.createSearch(query, results);
    searchId = search.id;
  } else {
    const cachedSearch = await searchRepo.findCachedSearch(query.cacheKey, 999999);
    searchId = cachedSearch?.search.id ?? 'unknown';
  }

  if (options.json) {
    console.log(JSON.stringify({ query: queryStr, searchId, cached, results }, null, 2));
    return;
  }

  if (!cached) {
    printSection('Sources');
    renderSourceSummaryTable(
      outcomes.map((o) => ({
        name: o.source.name,
        count: o.status === 'success' ? o.results.length : 0,
        failed: o.status === 'failure',
        ...(o.status === 'failure' ? { reason: o.error.message } : {}),
      })),
    );
  }

  if (results.length > 0) {
    printSection(`Results (${results.length})`);
    results.forEach((r, i) => printResult(i + 1, r.title, r.url, r.source, r.confidence, r.excerpt));
  } else {
    console.log('\n  No results found.');
  }

  printSummary(queryStr, results.length, totalDurationMs, searchId, cached);
}

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Perform a generic OSINT search for any query string')
    .option('--json', 'Output as JSON', false)
    .option('--no-cache', 'Bypass cache')
    .action(async (query: string, options: SearchCommandOptions) => {
      try {
        await handleGenericSearch(query, options);
      } catch (err) {
        if (options.json) {
          console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        } else {
          printError('Search failed.', err instanceof Error ? err.message : String(err));
        }
        process.exit(1);
      }
    });
}
