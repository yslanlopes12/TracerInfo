import { describe, it, expect, vi } from 'vitest';
import { SearchOrchestrator } from '../../src/core/search/SearchOrchestrator.js';
import { buildSearchQuery } from '../../src/core/models/SearchQuery.js';
import type { SearchSource, SourceMetadata } from '../../src/sources/Source.js';
import type { RawSearchResult } from '../../src/core/models/SearchResult.js';
import type { SearchQuery } from '../../src/core/models/SearchQuery.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRawResult(url: string, confidence = 0.8): RawSearchResult {
  return {
    title: `Result for ${url}`,
    url,
    description: 'A test result',
    source: 'TestSource',
    sourceType: 'web',
    excerpt: 'Some excerpt text',
    entities: [],
    confidence,
  };
}

function makeMockSource(
  id: string,
  results: RawSearchResult[],
  shouldFail = false,
): SearchSource {
  const metadata: SourceMetadata = {
    id,
    name: id,
    type: 'web',
    description: 'Mock source for testing',
  };

  return {
    metadata,
    async search(_query: SearchQuery, _signal?: AbortSignal): Promise<RawSearchResult[]> {
      if (shouldFail) {
        throw new Error(`${id} source is unavailable`);
      }
      return results;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchOrchestrator', () => {
  const query = buildSearchQuery('Test Person', 'person');

  it('returns empty results when no sources are registered', async () => {
    const orchestrator = new SearchOrchestrator();
    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(0);
    expect(result.outcomes).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  it('collects results from a single source', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('source-a', [
        makeRawResult('https://example.com/a'),
        makeRawResult('https://example.com/b'),
      ]),
    );

    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(2);
    expect(result.outcomes).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
  });

  it('aggregates results from multiple sources', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('source-a', [makeRawResult('https://example.com/a')]),
    );
    orchestrator.registerSource(
      makeMockSource('source-b', [makeRawResult('https://example.com/b')]),
    );

    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(2);
    expect(result.outcomes).toHaveLength(2);
  });

  it('deduplicates results with the same URL across sources', async () => {
    const duplicateUrl = 'https://example.com/shared-page';
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('source-a', [makeRawResult(duplicateUrl)]),
    );
    orchestrator.registerSource(
      makeMockSource('source-b', [makeRawResult(duplicateUrl)]),
    );

    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.url).toBe(duplicateUrl);
  });

  it('continues when one source fails (Promise.allSettled behavior)', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('working-source', [makeRawResult('https://example.com/ok')]),
    );
    orchestrator.registerSource(
      makeMockSource('failing-source', [], true), // This source will throw
    );

    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.source.id).toBe('failing-source');
    expect(result.outcomes).toHaveLength(2);
  });

  it('handles all sources failing gracefully', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(makeMockSource('fail-1', [], true));
    orchestrator.registerSource(makeMockSource('fail-2', [], true));

    const result = await orchestrator.run(query);

    expect(result.results).toHaveLength(0);
    expect(result.failures).toHaveLength(2);
  });

  it('sorts results by confidence descending', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('source-a', [
        makeRawResult('https://example.com/low', 0.3),
        makeRawResult('https://example.com/high', 0.9),
        makeRawResult('https://example.com/mid', 0.6),
      ]),
    );

    const result = await orchestrator.run(buildSearchQuery('Test Person', 'person', { minConfidence: 0 }));

    expect(result.results[0]?.confidence).toBe(0.9);
    expect(result.results[1]?.confidence).toBe(0.6);
    expect(result.results[2]?.confidence).toBe(0.3);
  });

  it('filters low-confidence results and enforces the global result limit', async () => {
    const results = Array.from({ length: 25 }, (_, index) =>
      makeRawResult(`https://example.com/result-${index}`, index % 2 === 0 ? 0.8 : 0.6),
    );
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(makeMockSource('source-a', results));

    const standard = await orchestrator.run(buildSearchQuery('Test', 'generic'));
    expect(standard.results).toHaveLength(13);
    expect(standard.results.every((result) => result.confidence >= 0.7)).toBe(true);

    const extended = await orchestrator.run(buildSearchQuery('Test', 'generic', {
      minConfidence: 0.5,
      maxResults: 20,
      maxResultsPerSource: 20,
    }));
    expect(extended.results).toHaveLength(20);
    expect(extended.results.every((result) => result.confidence >= 0.5)).toBe(true);
  });

  it('assigns a urlHash to each result', async () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(
      makeMockSource('source-a', [makeRawResult('https://example.com/a')]),
    );

    const result = await orchestrator.run(query);

    expect(result.results[0]?.urlHash).toBeDefined();
    expect(result.results[0]?.urlHash).toHaveLength(64); // SHA-256 hex
  });

  it('applies source filter from query', async () => {
    const filteredQuery = buildSearchQuery('Test', 'person', { sourceFilter: ['news'] });
    const orchestrator = new SearchOrchestrator();

    const webSource = makeMockSource('web-source', [makeRawResult('https://example.com/web')]);
    const newsSource: SearchSource = {
      metadata: { id: 'news-source', name: 'News', type: 'news', description: '' },
      async search() {
        return [makeRawResult('https://news.example.com/article')];
      },
    };

    orchestrator.registerSource(webSource);
    orchestrator.registerSource(newsSource);

    const result = await orchestrator.run(filteredQuery);

    // Only the news source should be queried
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.url).toBe('https://news.example.com/article');
  });

  it('applies source ID filters and executes name variants', async () => {
    const searchedQueries: string[] = [];
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource({
      metadata: { id: 'instagram', name: 'Instagram', type: 'social', description: '' },
      async search(searchQuery) {
        searchedQueries.push(searchQuery.raw);
        return [makeRawResult(`https://example.com/${encodeURIComponent(searchQuery.raw)}`)];
      },
    });
    orchestrator.registerSource(makeMockSource('ignored', [makeRawResult('https://ignored.example.com')]));

    const filteredQuery = buildSearchQuery('Maria Silva', 'person', {
      sourceIds: ['instagram'],
      variants: ['Maria Silva', 'M. Silva'],
    });
    const result = await orchestrator.run(filteredQuery);

    expect(searchedQueries).toEqual(['Maria Silva', 'M. Silva']);
    expect(result.outcomes).toHaveLength(1);
    expect(result.results).toHaveLength(2);
  });

  it('returns registered sources metadata', () => {
    const orchestrator = new SearchOrchestrator();
    orchestrator.registerSource(makeMockSource('src-a', []));
    orchestrator.registerSource(makeMockSource('src-b', []));

    const sources = orchestrator.getRegisteredSources();
    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.id)).toContain('src-a');
    expect(sources.map((s) => s.id)).toContain('src-b');
  });

  it('supports method chaining for registerSource', () => {
    const orchestrator = new SearchOrchestrator();
    const result = orchestrator
      .registerSource(makeMockSource('src-a', []))
      .registerSource(makeMockSource('src-b', []));

    expect(result).toBe(orchestrator);
    expect(orchestrator.getRegisteredSources()).toHaveLength(2);
  });

  it('serves from cache if searchRepo is provided and cache hits', async () => {
    const mockRepo = {
      findCachedSearch: vi.fn().mockResolvedValue({
        search: { id: 'cached-search-id' },
        results: [
          {
            ...makeRawResult('https://cached.com'),
            id: 'res-id',
            entities: '[]',
          },
        ],
      }),
    } as any;

    const orchestrator = new SearchOrchestrator(mockRepo);
    orchestrator.registerSource(
      makeMockSource('source-a', [makeRawResult('https://example.com/new')]),
    );

    const result = await orchestrator.run(query);

    expect(result.cached).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.url).toBe('https://cached.com'); // Got from cache
    expect(mockRepo.findCachedSearch).toHaveBeenCalled();
  });

  it('ignores cache if query.noCache is true', async () => {
    const mockRepo = {
      findCachedSearch: vi.fn(),
    } as any;

    const orchestrator = new SearchOrchestrator(mockRepo);
    orchestrator.registerSource(makeMockSource('source-a', [makeRawResult('https://example.com/new')]));

    const noCacheQuery = buildSearchQuery('Test', 'person', { noCache: true });
    const result = await orchestrator.run(noCacheQuery);

    expect(result.cached).toBe(false);
    expect(mockRepo.findCachedSearch).not.toHaveBeenCalled();
    expect(result.results[0]?.url).toBe('https://example.com/new');
  });
});
