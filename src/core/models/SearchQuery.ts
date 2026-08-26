import { z } from 'zod';
import { SourceTypeSchema } from './SearchResult.js';

// ─── Query Types ──────────────────────────────────────────────────────────────

export const QueryTypeSchema = z.enum([
  'person',
  'username',
  'email',
  'domain',
  'generic',
]);

export type QueryType = z.infer<typeof QueryTypeSchema>;

// ─── SearchQuery ──────────────────────────────────────────────────────────────

/**
 * Represents a normalized, validated search query passed to sources.
 */
export const SearchQuerySchema = z.object({
  /** The raw search term as provided by the user. */
  raw: z.string().min(1).max(500),

  /** Normalized version of the query for consistent comparison. */
  normalized: z.string().min(1),

  /** Stable cache key including aliases and source filters. */
  cacheKey: z.string().min(1),

  /** The semantic type of the query. */
  type: QueryTypeSchema,

  /**
   * Filter to specific source types.
   * If empty, all sources will be queried.
   */
  sourceFilter: z.array(SourceTypeSchema).optional(),

  /** Additional source IDs or types selected by the caller. */
  sourceIds: z.array(z.string().min(1)).optional(),

  /** Name variants used for broader person searches. */
  variants: z.array(z.string().min(1)).default([]),

  /** Minimum confidence accepted by the orchestrator. */
  minConfidence: z.number().min(0).max(1).default(0.7),

  /** Maximum number of final results returned by the orchestrator. */
  maxResults: z.number().int().positive().default(20),

  /**
   * Maximum number of results to collect per source.
   * Defaults to 20.
   */
  maxResultsPerSource: z.number().int().positive().default(20),

  /** Whether to bypass the local result cache. */
  noCache: z.boolean().default(false),

  /** ISO 8601 timestamp when this query was created. */
  createdAt: z.string().datetime(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ─── Query Builder ────────────────────────────────────────────────────────────

/**
 * Creates a normalized SearchQuery from a raw user input string.
 */
export function buildSearchQuery(
  raw: string,
  type: QueryType,
  options?: Partial<Pick<SearchQuery, 'sourceFilter' | 'sourceIds' | 'variants' | 'minConfidence' | 'maxResults' | 'maxResultsPerSource' | 'noCache'>>,
): SearchQuery {
  const sourceIds = options?.sourceIds ?? [];
  const variants = options?.variants ?? [];
  const normalized = raw.trim().toLowerCase();
  const minConfidence = options?.minConfidence ?? 0.7;
  const maxResults = options?.maxResults ?? 20;
  const cacheKey = [normalized, options?.sourceFilter?.join(',') ?? '', sourceIds.join(','), variants.join('|'), minConfidence, maxResults].join('::');

  return SearchQuerySchema.parse({
    raw: raw.trim(),
    normalized,
    cacheKey,
    type,
    sourceFilter: options?.sourceFilter,
    sourceIds,
    variants,
    minConfidence,
    maxResults,
    maxResultsPerSource: options?.maxResultsPerSource ?? 20,
    noCache: options?.noCache ?? false,
    createdAt: new Date().toISOString(),
  });
}
