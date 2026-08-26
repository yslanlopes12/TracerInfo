import chalk from 'chalk';
import type { SearchResult } from '../../core/models/SearchResult.js';

// ─── Table Formatters ─────────────────────────────────────────────────────────

/**
 * Renders a summary table of sources and their result counts.
 */
export function renderSourceSummaryTable(
  sources: Array<{ name: string; count: number; failed: boolean; reason?: string }>,
): void {
  console.log();
  console.log(chalk.bold.hex('#7C3AED')('Source Summary'));
  console.log(chalk.hex('#6B7280')('─'.repeat(45)));

  for (const { name, count, failed, reason } of sources) {
    const nameCol = name.padEnd(24);

    if (failed) {
      console.log(
        `  ${chalk.red('✗')} ${chalk.gray(nameCol)} ${chalk.red('unavailable')} ${chalk.gray(`(${reason ?? 'unknown'})`)}`
      );
    } else {
      const countStr = chalk.green(String(count).padStart(4));
      console.log(`  ${chalk.green('✓')} ${chalk.white(nameCol)} ${countStr} ${chalk.gray('results')}`);
    }
  }
}

/**
 * Renders a compact list of search results in terminal-friendly format.
 */
export function renderResultsTable(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log(chalk.gray('  No results found.'));
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result) continue;

    const num = chalk.gray(`[${String(i + 1).padStart(2, '0')}]`);
    const confidence = formatConfidenceBadge(result.confidence);
    const sourceTag = chalk.gray(`[${result.sourceType.toUpperCase()}]`);

    console.log();
    console.log(`${num} ${chalk.bold(truncate(result.title, 60))} ${sourceTag} ${confidence}`);
    console.log(`    ${chalk.hex('#00D4FF')(result.url)}`);

    if (result.excerpt) {
      console.log(`    ${chalk.gray(truncate(result.excerpt, 110))}`);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatConfidenceBadge(confidence: number): string {
  const percent = Math.round(confidence * 100);
  const label = `${percent}%`;
  if (percent >= 80) return chalk.green(label);
  if (percent >= 60) return chalk.yellow(label);
  return chalk.gray(label);
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
