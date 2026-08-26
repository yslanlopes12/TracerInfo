import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { SearchResultSchema, type SearchResult, type RawSearchResult } from '../models/SearchResult.js';
import type { SearchQuery } from '../models/SearchQuery.js';
import type {
  SearchSource,
  SourceOutcome,
  SourceSuccess,
  SourceFailure,
} from '../../sources/Source.js';
import { config } from '../../config/config.js';
import { Normalizer } from '../normalization/Normalizer.js';
import type { SearchRepository } from '../../storage/repositories/SearchRepository.js';

class RequestPacer {
  private readonly nextAvailable = new Map<string, Promise<void>>();
  private readonly lastRequestAt = new Map<string, number>();

  async wait(key: string, signal: AbortSignal): Promise<void> {
    const previous = this.nextAvailable.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.nextAvailable.set(key, current);

    await previous;
    try {
      const lastRequestAt = this.lastRequestAt.get(key);
      const elapsed = lastRequestAt === undefined ? config.requestIntervalMs : Date.now() - lastRequestAt;
      const remaining = Math.max(0, config.requestIntervalMs - elapsed);
      await this.delay(remaining, signal);
      this.lastRequestAt.set(key, Date.now());
    } finally {
      release();
    }
  }

  private delay(milliseconds: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new Error('Request aborted'));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, milliseconds);
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Request aborted'));
      }, { once: true });
    });
  }
}

// ─── Orchestration Result ─────────────────────────────────────────────────────

export interface OrchestratorResult {
  /** All successfully collected and validated results. */
  readonly results: SearchResult[];
  /** Status of each source after execution. */
  readonly outcomes: SourceOutcome[];
  /** Sources that failed to respond. */
  readonly failures: SourceFailure[];
  /** Total duration of the orchestration in ms. */
  readonly totalDurationMs: number;
  /** Whether the results were served from the local cache. */
  readonly cached: boolean;
}

// ─── SearchOrchestrator ───────────────────────────────────────────────────────

export class SearchOrchestrator {
  private readonly sources: SearchSource[] = [];
  private readonly requestPacer = new RequestPacer();

  constructor(private readonly searchRepo?: SearchRepository) {}

  registerSource(source: SearchSource): this {
    this.sources.push(source);
    return this;
  }

  getRegisteredSources(): ReadonlyArray<SearchSource['metadata']> {
    return this.sources.map((s) => s.metadata);
  }

  async run(query: SearchQuery): Promise<OrchestratorResult> {
    const startTime = Date.now();

    // ─── Cache Check ───
    if (!query.noCache && this.searchRepo) {
      const cached = await this.searchRepo.findCachedSearch(query.cacheKey, config.cacheTtl);
      if (cached) {
        // Map database rows back to SearchResult models
        const results = cached.results.map((r) => ({
          ...r,
          description: r.description ?? undefined,
          publishedAt: r.publishedAt ?? undefined,
          excerpt: r.excerpt ?? undefined,
          entities: JSON.parse(r.entities),
        })) as SearchResult[];

        return {
          results,
          outcomes: [],
          failures: [],
          totalDurationMs: Date.now() - startTime,
          cached: true,
        };
      }
    }

    if (this.sources.length === 0) {
      return { results: [], outcomes: [], failures: [], totalDurationMs: 0, cached: false };
    }

    const activeSources = query.sourceFilter?.length || query.sourceIds?.length
      ? this.sources.filter((s) =>
        query.sourceFilter?.includes(s.metadata.type) || query.sourceIds?.includes(s.metadata.id),
      )
      : this.sources;

    const variants = query.variants.length > 0 ? query.variants : [query.raw];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

    try {
      const settled = await Promise.allSettled(
        activeSources.map((source) => this.executeSourceVariants(source, query, variants, controller.signal)),
      );

      const outcomes: SourceOutcome[] = settled.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const source = activeSources[i]!;
        return {
          status: 'failure',
          source: source.metadata,
          error: r.reason instanceof Error ? r.reason : new Error(String(r.reason)),
          durationMs: 0,
        };
      });

      const allRaw = outcomes
        .filter((o): o is SourceSuccess => o.status === 'success')
        .flatMap((o) => o.results);

      const results = this.normalizeAndDeduplicate(allRaw)
        .filter((result) => result.confidence >= query.minConfidence)
        .slice(0, query.maxResults);
      const failures = outcomes.filter((o): o is SourceFailure => o.status === 'failure');

      return {
        results,
        outcomes,
        failures,
        totalDurationMs: Date.now() - startTime,
        cached: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async executeSource(
    source: SearchSource,
    query: SearchQuery,
    signal: AbortSignal,
  ): Promise<SourceOutcome> {
    const start = Date.now();
    try {
      const rawResults = await source.search(query, signal);
      return {
        status: 'success',
        source: source.metadata,
        results: rawResults,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'failure',
        source: source.metadata,
        error: err instanceof Error ? err : new Error(String(err)),
        durationMs: Date.now() - start,
      };
    }
  }

  private async executeSourceVariants(
    source: SearchSource,
    query: SearchQuery,
    variants: string[],
    signal: AbortSignal,
  ): Promise<SourceOutcome> {
    const start = Date.now();
    const results: RawSearchResult[] = [];

    try {
      for (const variant of variants) {
        await this.requestPacer.wait(source.metadata.rateLimitKey ?? source.metadata.id, signal);
        results.push(...await source.search({ ...query, raw: variant }, signal));
      }
      return {
        status: 'success',
        source: source.metadata,
        results,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'failure',
        source: source.metadata,
        error: err instanceof Error ? err : new Error(String(err)),
        durationMs: Date.now() - start,
      };
    }
  }

  private normalizeAndDeduplicate(rawResults: RawSearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const raw of rawResults) {
      const urlHash = this.hashUrl(raw.url);
      if (seen.has(urlHash)) continue;
      seen.add(urlHash);

      try {
        const result = SearchResultSchema.parse({
          ...raw,
          id: raw.id ?? randomUUID(),
          collectedAt: raw.collectedAt ?? new Date().toISOString(),
          urlHash,
        });
        results.push(result);
      } catch {
        // Skip malformed
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private hashUrl(url: string): string {
    const normalized = Normalizer.url(url);
    return createHash('sha256').update(normalized).digest('hex');
  }
}
