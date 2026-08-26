import type { RawSearchResult, SearchResult } from '../core/models/SearchResult.js';
import type { SearchQuery } from '../core/models/SearchQuery.js';

// ─── Source Metadata ──────────────────────────────────────────────────────────

export interface SourceMetadata {
  /** Unique machine-readable identifier for this source. */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** Categorical type of this source. */
  readonly type: SearchResult['sourceType'];
  /** Short description of what this source searches. */
  readonly description: string;
  /** Shared key used to pace sources backed by the same provider. */
  readonly rateLimitKey?: string;
}

// ─── Source Result ────────────────────────────────────────────────────────────

export interface SourceSuccess {
  readonly status: 'success';
  readonly source: SourceMetadata;
  readonly results: RawSearchResult[];
  readonly durationMs: number;
}

export interface SourceFailure {
  readonly status: 'failure';
  readonly source: SourceMetadata;
  readonly error: Error;
  readonly durationMs: number;
}

export type SourceOutcome = SourceSuccess | SourceFailure;

// ─── SearchSource Interface ───────────────────────────────────────────────────

/**
 * The contract every search source must implement.
 *
 * Sources are responsible for fetching raw data and converting it to
 * the RawSearchResult shape. Normalization and deduplication are
 * handled by the orchestrator layer.
 *
 * Sources MUST NOT:
 * - Bypass authentication or access controls
 * - Perform requests to private or login-protected areas
 * - Attempt to circumvent rate limits or CAPTCHAs
 */
export interface SearchSource {
  /** Describes this source's identity and capabilities. */
  readonly metadata: SourceMetadata;

  /**
   * Executes a search against this source and returns raw results.
   * Implementations should handle their own HTTP errors gracefully
   * and return an empty array on non-critical failures.
   */
  search(query: SearchQuery, signal?: AbortSignal): Promise<RawSearchResult[]>;
}
