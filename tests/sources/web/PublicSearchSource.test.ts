import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicSearchSource } from '../../../src/sources/web/PublicSearchSource.js';
import { buildSearchQuery } from '../../../src/core/models/SearchQuery.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PublicSearchSource', () => {
  beforeEach(() => vi.clearAllMocks());

  it('decodes Bing redirect links before applying the host filter', async () => {
    const target = 'https://www.instagram.com/felipe_yslan/';
    const encoded = `a1${Buffer.from(target).toString('base64url')}`;
    const html = `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?u=${encoded}">Felipe Yslan</a></h2></li>`;
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => html });

    const source = new PublicSearchSource({
      id: 'instagram',
      name: 'Instagram',
      type: 'social',
      description: 'test',
      buildUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      queryPrefix: 'site:instagram.com ',
      allowedHosts: ['instagram.com'],
      resultSelector: 'li.b_algo',
      titleSelector: 'h2 a',
    });

    const results = await source.search(buildSearchQuery('yslan', 'person'));
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe(target);
  });

  it('resolves relative Google result links against the fallback provider', async () => {
    const target = 'https://www.instagram.com/relative-profile/';
    const html = `<div><a href="/url?q=${encodeURIComponent(target)}"><h3>Instagram profile</h3></a></div>`;
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => html });

    const source = new PublicSearchSource({
      id: 'instagram',
      name: 'Instagram',
      type: 'social',
      description: 'test',
      buildUrl: () => 'https://search.brave.com/search?q=blocked',
      fallbackBuildUrls: [(query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`],
      allowedHosts: ['instagram.com'],
    });

    const results = await source.search(buildSearchQuery('yslan', 'person'));
    expect(results[0]?.url).toBe(target);
  });
});
