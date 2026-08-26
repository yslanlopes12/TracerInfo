import chalk from 'chalk';

// ─── Brand Colors ─────────────────────────────────────────────────────────────

export const brand = {
  primary: chalk.hex('#00D4FF'),
  secondary: chalk.hex('#7C3AED'),
  accent: chalk.hex('#10B981'),
  warning: chalk.hex('#F59E0B'),
  danger: chalk.hex('#EF4444'),
  muted: chalk.hex('#6B7280'),
  bold: chalk.bold,
};

// ─── Borders & Layout ─────────────────────────────────────────────────────────

const WIDTH = 50;

/** Prints a full-width horizontal rule. */
export function printRule(char = '─'): void {
  console.log(brand.muted(char.repeat(WIDTH)));
}

/** Prints a header box with a centered title. */
export function printHeader(title: string): void {
  const inner = title.toUpperCase();
  const pad = Math.max(0, Math.floor((WIDTH - inner.length - 2) / 2));
  const paddedTitle = ' '.repeat(pad) + inner + ' '.repeat(pad);
  const finalTitle =
    paddedTitle.length < WIDTH - 2
      ? paddedTitle + ' '
      : paddedTitle;

  console.log();
  console.log(brand.primary('╭' + '─'.repeat(WIDTH - 2) + '╮'));
  console.log(brand.primary('│') + brand.bold(brand.primary(finalTitle.padEnd(WIDTH - 2))) + brand.primary('│'));
  console.log(brand.primary('╰' + '─'.repeat(WIDTH - 2) + '╯'));
  console.log();
}

// ─── Status Lines ─────────────────────────────────────────────────────────────

export function printSuccess(label: string, count: number): void {
  const countStr = brand.accent(String(count).padStart(4));
  const labelStr = brand.muted(label.padEnd(22));
  console.log(`  ${brand.accent('✓')} ${labelStr} ${countStr} ${brand.muted('results')}`);
}

export function printFailure(label: string, reason: string): void {
  console.log(`  ${brand.danger('✗')} ${brand.muted(label.padEnd(22))} ${brand.danger('FAILED')} ${brand.muted(`(${reason})`)}`);
}

export function printWarning(message: string): void {
  console.log(`  ${brand.warning('⚠')}  ${brand.warning(message)}`);
}

export function printInfo(message: string): void {
  console.log(`  ${brand.muted('ℹ')}  ${brand.muted(message)}`);
}

// ─── Section Titles ────────────────────────────────────────────────────────────

export function printSection(title: string): void {
  console.log();
  console.log(brand.secondary(brand.bold(title)));
  console.log(brand.muted('─'.repeat(title.length)));
}

// ─── Result Items ─────────────────────────────────────────────────────────────

export function printResult(
  index: number,
  title: string,
  url: string,
  source: string,
  confidence: number,
  excerpt?: string,
): void {
  const num = brand.muted(`[${String(index).padStart(2, '0')}]`);
  const conf = formatConfidence(confidence);
  const src = brand.muted(`(${source})`);

  console.log();
  console.log(`${num} ${brand.bold(title)} ${src} ${conf}`);
  console.log(`    ${brand.primary(url)}`);

  if (excerpt) {
    const truncated = excerpt.length > 120 ? excerpt.slice(0, 120) + '…' : excerpt;
    console.log(`    ${brand.muted(truncated)}`);
  }
}

export function printSocialResult(
  index: number,
  title: string,
  url: string,
  source: string,
  confidence: number,
  excerpt?: string,
): void {
  const num = brand.muted(`[${String(index).padStart(2, '0')}]`);
  const conf = formatConfidence(confidence);
  const src = brand.bold(brand.primary(`[${source}]`));

  console.log();
  console.log(`${brand.primary('SOCIAL')} ${num} ${brand.bold(title)} ${src} ${conf}`);
  console.log(`    ${brand.primary(url)}`);

  if (excerpt) {
    const truncated = excerpt.length > 120 ? excerpt.slice(0, 120) + '…' : excerpt;
    console.log(`    ${brand.muted(truncated)}`);
  }
}

// ─── Confidence Badges ────────────────────────────────────────────────────────

export function formatConfidence(confidence: number): string {
  const percent = Math.round(confidence * 100);
  const label = `${percent}%`;

  if (percent >= 80) return brand.accent(label);
  if (percent >= 60) return brand.warning(label);
  return brand.muted(label);
}

// ─── Summary Line ─────────────────────────────────────────────────────────────

export function printSummary(
  query: string,
  totalResults: number,
  durationMs: number,
  searchId: string,
  cached = false,
): void {
  console.log();
  printRule();
  console.log();
  console.log(`  ${brand.muted('Query    ')} ${brand.bold(query)}`);
  console.log(`  ${brand.muted('Results  ')} ${brand.bold(brand.accent(String(totalResults)))}`);
  
  const cacheIndicator = cached ? brand.accent(' (cached)') : '';
  console.log(`  ${brand.muted('Duration ')} ${brand.muted(`${durationMs}ms`)}${cacheIndicator}`);
  
  console.log(`  ${brand.muted('ID       ')} ${brand.muted(searchId)}`);
  console.log();
  console.log(`  ${brand.muted('Run')} ${brand.primary(`tracerinfo report ${searchId}`)} ${brand.muted('for full report.')}`);
  console.log();
}

// ─── Error ────────────────────────────────────────────────────────────────────

export function printError(message: string, detail?: string): void {
  console.error();
  console.error(`  ${brand.danger('ERROR')} ${message}`);
  if (detail) {
    console.error(`  ${brand.muted(detail)}`);
  }
  console.error();
}
