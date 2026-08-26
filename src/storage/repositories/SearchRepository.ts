import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../database.js';
import {
  searches,
  searchResults,
  type NewSearch,
  type NewSearchResultRow,
  type Search,
  type SearchResultRow,
} from '../schema.js';
import type { SearchResult } from '../../core/models/SearchResult.js';
import type { SearchQuery } from '../../core/models/SearchQuery.js';

// ─── SearchRepository ─────────────────────────────────────────────────────────

export class SearchRepository {
  constructor(private readonly db: Db) {}

  /**
   * Creates a new search record and persists all its results.
   * Returns the created search with its generated ID.
   */
  async createSearch(
    query: SearchQuery,
    results: SearchResult[],
    personId?: string,
  ): Promise<Search> {
    const searchId = randomUUID();

    const newSearch: NewSearch = {
      id: searchId,
      query: query.cacheKey,
      queryType: query.type,
      personId: personId ?? null,
      resultCount: results.length,
    };

    await this.db.insert(searches).values(newSearch);

    if (results.length > 0) {
      const rows: NewSearchResultRow[] = results.map((r) => ({
        id: r.id,
        searchId,
        title: r.title,
        url: r.url,
        urlHash: r.urlHash ?? '',
        description: r.description ?? null,
        source: r.source,
        sourceType: r.sourceType,
        publishedAt: r.publishedAt ?? null,
        collectedAt: r.collectedAt,
        excerpt: r.excerpt ?? null,
        entities: JSON.stringify(r.entities),
        confidence: r.confidence,
      }));

      await this.db.insert(searchResults).values(rows);
    }

    const [created] = await this.db
      .select()
      .from(searches)
      .where(eq(searches.id, searchId))
      .limit(1);

    if (!created) {
      throw new Error(`Failed to retrieve created search with id ${searchId}`);
    }

    return created;
  }

  /**
   * Finds a cached search for the given query within the TTL window.
   * Returns null if no valid cached result exists.
   */
  async findCachedSearch(
    rawQuery: string,
    cacheTtlSeconds: number,
  ): Promise<{ search: Search; results: SearchResultRow[] } | null> {
    const cutoff = new Date(Date.now() - cacheTtlSeconds * 1000).toISOString();

    const allSearches = await this.db
      .select()
      .from(searches)
      .where(eq(searches.query, rawQuery))
      .orderBy(desc(searches.createdAt));

    // Filter to searches within the TTL window
    const validSearch = allSearches.find((s) => s.createdAt >= cutoff);

    if (!validSearch) return null;

    const results = await this.db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, validSearch.id));

    return { search: validSearch, results };
  }

  /** Retrieves a search by its ID along with all associated results. */
  async findById(
    searchId: string,
  ): Promise<{ search: Search; results: SearchResultRow[] } | null> {
    const [search] = await this.db
      .select()
      .from(searches)
      .where(eq(searches.id, searchId))
      .limit(1);

    if (!search) return null;

    const results = await this.db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, searchId));

    return { search, results };
  }
}
