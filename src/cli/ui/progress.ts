import ora, { type Ora } from 'ora';
import chalk from 'chalk';

// ─── ProgressManager ──────────────────────────────────────────────────────────

/**
 * Wraps Ora to provide consistent spinner behavior across the CLI.
 * In JSON mode, no spinners are shown.
 */
export class ProgressManager {
  private spinner: Ora | null = null;
  private readonly jsonMode: boolean;

  constructor(jsonMode = false) {
    this.jsonMode = jsonMode;
  }

  /** Starts a spinner with the given message. */
  start(message: string): void {
    if (this.jsonMode) return;

    this.spinner = ora({
      text: chalk.gray(message),
      spinner: 'dots',
      color: 'cyan',
    }).start();
  }

  /** Updates the spinner's text without stopping it. */
  update(message: string): void {
    if (this.jsonMode || !this.spinner) return;
    this.spinner.text = chalk.gray(message);
  }

  /** Stops the spinner with a success checkmark. */
  succeed(message: string): void {
    if (this.jsonMode) return;
    this.spinner?.succeed(chalk.green(message));
    this.spinner = null;
  }

  /** Stops the spinner with a failure indicator. */
  fail(message: string): void {
    if (this.jsonMode) return;
    this.spinner?.fail(chalk.red(message));
    this.spinner = null;
  }

  /** Stops and removes the spinner without any indicator. */
  stop(): void {
    if (this.jsonMode) return;
    this.spinner?.stop();
    this.spinner = null;
  }

  /** Stops with a warning indicator. */
  warn(message: string): void {
    if (this.jsonMode) return;
    this.spinner?.warn(chalk.yellow(message));
    this.spinner = null;
  }
}
