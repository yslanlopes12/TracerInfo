import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const SourceTypeSchema = z.enum([
  'web',
  'news',
  'document',
  'public_record',
  'social',
  'academic',
  'government',
  'mock',
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

// ─── Entity Mention ──────────────────────────────────────────────────────────

/**
 * Represents a named entity found within a search result.
 */
export const EntityMentionSchema = z.object({
  type: z.enum(['person', 'organization', 'location', 'username', 'email', 'phone', 'domain']),
  value: z.string().min(1),
  /** Confidence that this entity mention is relevant (0-1). */
  confidence: z.number().min(0).max(1),
});

export type EntityMention = z.infer<typeof EntityMentionSchema>;

// ─── SearchResult ─────────────────────────────────────────────────────────────

/**
 * The canonical, normalized model for a single search result.
 * Every source MUST convert its output to this structure.
 */
export const SearchResultSchema = z.object({
  /** Unique identifier derived from hashing the URL. */
  id: z.string().uuid(),

  /** Title of the result as returned by the source. */
  title: z.string().min(1),

  /** The original, canonical URL of the source. */
  url: z.string().url(),

  /** A brief description or snippet from the source. */
  description: z.string().optional(),

  /** Human-readable name of the source (e.g., "DuckDuckGo", "Google News"). */
  source: z.string().min(1),

  /** Categorical type of the source. */
  sourceType: SourceTypeSchema,

  /** ISO 8601 timestamp when the content was originally published, if available. */
  publishedAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp when this result was collected. */
  collectedAt: z.string().datetime(),

  /** Raw excerpt or relevant text from the page content, if available. */
  excerpt: z.string().optional(),

  /** Entities identified within this result. */
  entities: z.array(EntityMentionSchema).default([]),

  /**
   * Confidence that this result is relevant to the query (0-1).
   * Set by the source or enriched by the orchestrator.
   */
  confidence: z.number().min(0).max(1),

  /**
   * SHA-256 hash of the URL for deduplication purposes.
   * Populated by the orchestrator.
   */
  urlHash: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// ─── Source Result (raw, before normalization) ────────────────────────────────

/**
 * What a source returns before full validation — allows partial data
 * that the orchestrator will complete and validate.
 */
export type RawSearchResult = Omit<SearchResult, 'id' | 'collectedAt' | 'urlHash'> & {
  id?: string;
  collectedAt?: string;
  urlHash?: string;
};
