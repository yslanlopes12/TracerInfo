import * as cheerio from 'cheerio';
import type { SearchSource, SourceMetadata } from '../Source.js';
import type { SearchQuery } from '../../core/models/SearchQuery.js';
import type { RawSearchResult } from '../../core/models/SearchResult.js';
import { Normalizer } from '../../core/normalization/Normalizer.js';

/**
 * Searches the web using DuckDuckGo's HTML (Lite) version.
 * This does not require an API key and is suitable for low-volume OSINT queries.
 *
 * NOTE: DuckDuckGo HTML may occasionally block requests if volume is too high,
 * returning a redirect or a captcha page. The parser handles this gracefully
 * by returning zero results instead of crashing.
 */
export class DuckDuckGoSource implements SearchSource {
  readonly metadata: SourceMetadata;

  private readonly BASE_URL = 'https://html.duckduckgo.com/html/';
  private readonly queryPrefix: string;

  constructor(options?: Partial<SourceMetadata> & { queryPrefix?: string }) {
    this.metadata = {
      id: options?.id ?? 'ddg-web',
      name: options?.name ?? 'DuckDuckGo Web',
      type: options?.type ?? 'web',
      description: options?.description ?? 'General web search via DuckDuckGo HTML version.',
      ...(options?.rateLimitKey ? { rateLimitKey: options.rateLimitKey } : {}),
    };
    this.queryPrefix = options?.queryPrefix ?? '';
  }

  async search(query: SearchQuery, signal?: AbortSignal): Promise<RawSearchResult[]> {
    // DuckDuckGo expects application/x-www-form-urlencoded POST for queries,
    // but GET with 'q' param also works for the first page.
    const url = new URL(this.BASE_URL);
    url.searchParams.set('q', `${this.queryPrefix}${query.raw}`.trim());

    const requestInit: RequestInit = {
      method: 'GET',
      headers: {
        // Use a realistic user agent to prevent instant blocking
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };
    if (signal) requestInit.signal = signal;

    const response = await fetch(url.toString(), requestInit);

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseHtml(html, query);
  }

  /**
   * Parses the DuckDuckGo HTML response using Cheerio.
   */
  private parseHtml(html: string, query: SearchQuery): RawSearchResult[] {
    const $ = cheerio.load(html);
    const results: RawSearchResult[] = [];
    const collectedAt = new Date().toISOString();

    // The result containers in DDG HTML usually have the class 'result__body' or 'result'
    $('.result').slice(0, query.maxResultsPerSource).each((_, element) => {
      const titleEl = $(element).find('.result__title a');
      const snippetEl = $(element).find('.result__snippet');
      const urlEl = $(element).find('.result__url');

      const title = titleEl.text().trim();
      let url = titleEl.attr('href') || urlEl.attr('href') || '';
      const snippet = snippetEl.text().trim();

      // DuckDuckGo sometimes wraps URLs in a redirect parameter
      if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
        try {
          const parsedUrl = new URL(`https:${url}`);
          const uddg = parsedUrl.searchParams.get('uddg');
          if (uddg) {
            url = decodeURIComponent(uddg);
          }
        } catch {
          // Keep raw URL if parsing fails
        }
      }

      if (title && url) {
        results.push({
          title,
          url,
          description: snippet,
          source: this.metadata.name,
          sourceType: this.metadata.type,
          collectedAt,
          excerpt: snippet,
          confidence: this.calculateConfidence(title, snippet, query),
          entities: [], // Entities will be extracted in Phase 3
        });
      }
    });

    return results;
  }

  /**
   * Simple heuristic to assign a confidence score based on keyword matches.
   * Will be replaced by EntityResolver in Phase 3.
   */
  private calculateConfidence(title: string, snippet: string, query: SearchQuery): number {
    const normTitle = Normalizer.name(title);
    const normSnippet = Normalizer.name(snippet);
    const normQuery = Normalizer.name(query.raw); // Simplified for Phase 2

    let score = 0.5; // Base confidence

    if (normTitle.includes(normQuery)) {
      score += 0.3;
    } else if (normSnippet.includes(normQuery)) {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }
}
