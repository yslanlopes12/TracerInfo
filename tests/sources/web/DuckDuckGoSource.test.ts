import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuckDuckGoSource } from '../../../src/sources/web/DuckDuckGoSource.js';
import { buildSearchQuery } from '../../../src/core/models/SearchQuery.js';

// Create a mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DuckDuckGoSource', () => {
  let source: DuckDuckGoSource;

  beforeEach(() => {
    source = new DuckDuckGoSource();
    vi.clearAllMocks();
  });

  const MOCK_HTML = `
    <html>
      <body>
        <div class="result">
          <h2 class="result__title"><a href="https://example.com/1">Example 1</a></h2>
          <a class="result__snippet">This is the first snippet.</a>
        </div>
        <div class="result">
          <h2 class="result__title"><a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F2">Example 2</a></h2>
          <a class="result__snippet">This is the second snippet.</a>
        </div>
      </body>
    </html>
  `;

  it('parses HTML results correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => MOCK_HTML,
    });

    const query = buildSearchQuery('test query', 'generic');
    const results = await source.search(query);

    expect(results).toHaveLength(2);

    expect(results[0]?.title).toBe('Example 1');
    expect(results[0]?.url).toBe('https://example.com/1');
    expect(results[0]?.description).toBe('This is the first snippet.');

    // Should decode the uddg parameter
    expect(results[1]?.url).toBe('https://example.com/2');
  });

  it('respects maxResultsPerSource', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => MOCK_HTML,
    });

    const query = buildSearchQuery('test query', 'generic', { maxResultsPerSource: 1 });
    const results = await source.search(query);

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Example 1');
  });

  it('throws an error if fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const query = buildSearchQuery('test query', 'generic');
    await expect(source.search(query)).rejects.toThrow('DuckDuckGo returned HTTP 403 Forbidden');
  });
});
