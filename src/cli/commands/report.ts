import type { Command } from 'commander';
import { getDatabase } from '../../storage/database.js';
import { SearchRepository } from '../../storage/repositories/SearchRepository.js';
import { PersonRepository } from '../../storage/repositories/PersonRepository.js';
import { printHeader, printSection, printResult, printError, printRule, brand } from '../ui/terminal.js';

interface ReportCommandOptions {
  json: boolean;
}

async function handleReport(searchId: string, options: ReportCommandOptions): Promise<void> {
  const db = getDatabase();
  const searchRepo = new SearchRepository(db);
  const personRepo = new PersonRepository(db);

  const data = await searchRepo.findById(searchId);

  if (!data) {
    if (options.json) {
      console.error(JSON.stringify({ error: `No search found with ID "${searchId}"` }));
    } else {
      printError(`No search found with ID "${searchId}".`, 'Use tracerinfo person <name> to start a new search.');
    }
    process.exit(1);
  }

  const { search, results } = data;

  // Parse entities from JSON strings
  const parsedResults = results.map((r) => ({
    ...r,
    entities: JSON.parse(r.entities) as unknown[],
  }));

  // Fetch person data if available
  const person = search.personId ? await personRepo.findById(search.personId) : null;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          search: {
            id: search.id,
            query: search.query,
            queryType: search.queryType,
            createdAt: search.createdAt,
            resultCount: search.resultCount,
          },
          person,
          results: parsedResults,
        },
        null,
        2,
      ),
    );
    return;
  }

  // ─── Terminal Report ──────────────────────────────────────────────────────

  printHeader(`Report: ${search.id.slice(0, 8)}...`);

  // Meta
  printSection('Search Information');
  console.log(`  ${brand.muted('ID      ')} ${brand.muted(search.id)}`);
  console.log(`  ${brand.muted('Query   ')} ${brand.bold(search.query)}`);
  console.log(`  ${brand.muted('Type    ')} ${brand.muted(search.queryType)}`);
  console.log(`  ${brand.muted('Date    ')} ${brand.muted(search.createdAt)}`);
  console.log(`  ${brand.muted('Results ')} ${brand.accent(String(search.resultCount))}`);

  // Person
  if (person) {
    printSection('Entity');
    console.log(`  ${brand.muted('Name  ')} ${brand.bold(person.name)}`);
    console.log(`  ${brand.muted('ID    ')} ${brand.muted(person.id)}`);
  }

  // Results
  if (parsedResults.length > 0) {
    printSection(`Evidence & Sources (${parsedResults.length})`);
    parsedResults.forEach((r, i) => {
      printResult(i + 1, r.title, r.url, r.source, r.confidence, r.excerpt ?? undefined);
    });
  } else {
    console.log('\n  No results stored for this search.');
  }

  console.log();
  printRule();
  console.log(`  ${brand.muted('End of report.')}`);
  console.log();
}

export function registerReportCommand(program: Command): void {
  program
    .command('report <searchId>')
    .description('Display a full report for a previous search by its ID')
    .option('--json', 'Output as JSON', false)
    .action(async (searchId: string, options: ReportCommandOptions) => {
      try {
        await handleReport(searchId, options);
      } catch (err) {
        if (options.json) {
          console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        } else {
          printError('Failed to load report.', err instanceof Error ? err.message : String(err));
        }
        process.exit(1);
      }
    });
}
