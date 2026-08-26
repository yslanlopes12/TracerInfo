import { randomUUID } from 'node:crypto';
import type { Command } from 'commander';
import { SearchOrchestrator } from '../../core/search/SearchOrchestrator.js';
import { buildSearchQuery } from '../../core/models/SearchQuery.js';
import { Normalizer } from '../../core/normalization/Normalizer.js';
import { createProductionSources } from '../../sources/web/sourceRegistry.js';
import { getDatabase } from '../../storage/database.js';
import { SearchRepository } from '../../storage/repositories/SearchRepository.js';
import { PersonRepository } from '../../storage/repositories/PersonRepository.js';
import { ProgressManager } from '../ui/progress.js';
import { printHeader, printSection, printResult, printSummary, printWarning, printFailure, printSuccess, printError } from '../ui/terminal.js';
import { renderSourceSummaryTable } from '../ui/tables.js';
import type { SourceFailure, SourceSuccess } from '../../sources/Source.js';
import type { SearchResult } from '../../core/models/SearchResult.js';

// ─── Command Options ──────────────────────────────────────────────────────────

interface PersonCommandOptions {
  json: boolean;
  source?: string;
  social?: string;
  alias?: string[];
  extend: boolean;
  noCache: boolean;
  verbose: boolean;
}

// ─── JSON Output Shape ────────────────────────────────────────────────────────

interface PersonJsonOutput {
  query: string;
  searchId: string;
  person: { name: string } | null;
  results: SearchResult[];
  warnings: string[];
  meta: {
    totalResults: number;
    durationMs: number;
    cached: boolean;
    sources: Array<{ name: string; type: string; results: number; status: 'success' | 'failure' }>;
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Core handler for the `person` command.
 * Contains NO UI logic — delegates rendering to the UI modules.
 */
async function handlePersonSearch(
  name: string,
  options: PersonCommandOptions,
): Promise<void> {
  const progress = new ProgressManager(options.json);
  const db = getDatabase();
  const searchRepo = new SearchRepository(db);
  const personRepo = new PersonRepository(db);

  // Build the query
  const knownTypes: SearchResult['sourceType'][] = ['web', 'news', 'document', 'public_record', 'social', 'academic', 'government', 'mock'];
  const sourceFilter = options.source && knownTypes.includes(options.source as SearchResult['sourceType'])
    ? [options.source as SearchResult['sourceType']]
    : undefined;
  const selectedSourceIds = [
    ...(options.source && !sourceFilter ? [options.source.toLowerCase()] : []),
    ...(options.social?.split(',').map((network) => network.trim().toLowerCase()).filter(Boolean) ?? []),
  ];
  const query = buildSearchQuery(name, 'person', {
    noCache: options.noCache,
    sourceFilter,
    sourceIds: selectedSourceIds,
    variants: Normalizer.nameVariants(name, options.alias ?? []),
    minConfidence: options.extend ? 0.5 : 0.7,
    maxResults: options.extend ? 120 : 20,
    maxResultsPerSource: options.extend ? 120 : 20,
  });

  // Set up the orchestrator with available sources
  const orchestrator = new SearchOrchestrator(searchRepo);
  for (const source of createProductionSources()) orchestrator.registerSource(source);

  if (!options.json) {
    printHeader('TracerInfo OSINT');
    console.log(`  Searching: ${name}\n`);
  }

  // Execute search
  progress.start('Collecting data from sources...');
  const orchestratorResult = await orchestrator.run(query);
  progress.stop();

  const { results, outcomes, failures, totalDurationMs, cached } = orchestratorResult;

  // Persist person and search only if not cached
  let searchId: string;
  let personId: string | undefined;
  if (!cached) {
    const person = await personRepo.create(name);
    personId = person.id;
    const search = await searchRepo.createSearch(query, results, person.id);
    searchId = search.id;
  } else {
    // If cached, we need to find the latest search ID for this query
    const cachedSearch = await searchRepo.findCachedSearch(query.cacheKey, 999999);
    searchId = cachedSearch?.search.id ?? 'unknown';
  }

  // ─── Terminal Output ──────────────────────────────────────────────────────

  if (options.json) {
    const warnings: string[] = failures.map(
      (f) => `Source "${f.source.name}" failed: ${f.error.message}`,
    );

    const sourcesMeta = outcomes.map((o) => ({
      name: o.source.name,
      type: o.source.type,
      results: o.status === 'success' ? o.results.length : 0,
      status: o.status,
    }));

    const output: PersonJsonOutput = {
      query: name,
      searchId,
      person: { name },
      results,
      warnings,
      meta: { totalResults: results.length, durationMs: totalDurationMs, cached, sources: sourcesMeta },
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // ─── Rich Terminal Output ─────────────────────────────────────────────────

  // Source summary
  if (!cached) {
    printSection('Sources');
    const summaryData = outcomes.map((o) => ({
      name: o.source.name,
      count: o.status === 'success' ? o.results.length : 0,
      failed: o.status === 'failure',
      ...(o.status === 'failure' ? { reason: o.error.message } : {}),
    }));
    renderSourceSummaryTable(summaryData);
  }

  // Warnings for failing sources
  if (failures.length > 0) {
    console.log();
    for (const f of failures) {
      printWarning(`Source "${f.source.name}" unavailable: ${f.error.message}`);
    }
  }

  // Results
  if (results.length > 0) {
    printSection(`Results (${results.length})`);

    results.forEach((result, index) => {
      printResult(
        index + 1,
        result.title,
        result.url,
        result.source,
        result.confidence,
        result.excerpt,
      );
    });
  } else {
    console.log();
    console.log('  No results found for this query.');
  }

  // Summary footer
  printSummary(name, results.length, totalDurationMs, searchId, cached);

  if (options.verbose) {
    printSection('Verbose Diagnostics');
    console.log(`  Registered sources: ${orchestrator.getRegisteredSources().length}`);
    console.log(`  Query type: ${query.type}`);
    console.log(`  No-cache: ${query.noCache}`);
    console.log(`  Person ID: ${personId ?? 'not created (cache hit)'}`);
    console.log(`  Search ID: ${searchId}`);
    console.log();
  }
}

// ─── Command Registration ─────────────────────────────────────────────────────

/**
 * Registers the `person` command on the given Commander program.
 * CLI parsing only — no business logic here.
 */
export function registerPersonCommand(program: Command): void {
  program
    .command('person <name>')
    .description('Search for information about a person using their name')
    .option('--json', 'Output results as JSON (disables colored UI)', false)
    .option('--source <type>', 'Filter to a specific source type (web, news, document, social, academic)')
    .option('--social <networks>', 'Filter social networks: instagram,x,youtube,linkedin,facebook,threads,github (comma-separated)')
    .option('--alias <name>', 'Add a known nickname or codename; repeat for multiple aliases', (value: string, previous: string[] = []) => [...previous, value], [])
    .option('--extend', 'Allow results from 50% confidence and return up to 120 results', false)
    .option('--no-cache', 'Bypass local cache and force new data collection')
    .option('--verbose', 'Show diagnostic information', false)
    .action(async (name: string, options: PersonCommandOptions) => {
      try {
        await handlePersonSearch(name, options);
      } catch (err) {
        if (options.json) {
          console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        } else {
          printError(
            'An unexpected error occurred.',
            err instanceof Error ? err.message : String(err),
          );
        }
        process.exit(1);
      }
    });
}
