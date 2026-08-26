import * as cheerio from 'cheerio';
import type { RawSearchResult, SourceType } from '../../core/models/SearchResult.js';
import type { SearchQuery } from '../../core/models/SearchQuery.js';
import type { SearchSource, SourceMetadata } from '../Source.js';
import { Normalizer } from '../../core/normalization/Normalizer.js';

export interface PublicSearchSourceOptions {
  id: string;
  name: string;
  type: SourceType;
  description: string;
  rateLimitKey?: string;
  buildUrl: (query: string) => string;
  fallbackBuildUrls?: Array<(query: string) => string>;
  queryPrefix?: string;
  resultSelector?: string;
  titleSelector?: string;
  snippetSelector?: string;
  allowedHosts?: string[];
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

export class PublicSearchSource implements SearchSource {
  readonly metadata: SourceMetadata;
  private readonly options: PublicSearchSourceOptions;

  constructor(options: PublicSearchSourceOptions) {
    this.options = options;
    this.metadata = {
      id: options.id,
      name: options.name,
      type: options.type,
      description: options.description,
      ...(options.rateLimitKey ? { rateLimitKey: options.rateLimitKey } : {}),
    };
  }

  async search(query: SearchQuery, signal?: AbortSignal): Promise<RawSearchResult[]> {
    const requestInit: RequestInit = {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };
    if (signal) requestInit.signal = signal;

    const searchQuery = `${this.options.queryPrefix ?? ''}${query.raw}`.trim();
    const urls = [this.options.buildUrl, ...(this.options.fallbackBuildUrls ?? [])];
    let lastError: Error | undefined;
    let responded = false;

    for (const buildUrl of urls) {
      const response = await fetch(buildUrl(searchQuery), requestInit);
      if (response.ok) {
        responded = true;
        const results = this.parseHtml(await response.text(), query);
        if (results.length > 0) return results;
        continue;
      }
      lastError = new Error(`${this.metadata.name} returned HTTP ${response.status}`);
    }

    if (responded) return [];
    throw lastError ?? new Error(`${this.metadata.name} did not respond`);
  }

  protected parseHtml(html: string, query: SearchQuery): RawSearchResult[] {
    const $ = cheerio.load(html);
    const results: RawSearchResult[] = [];
    const resultSelector = this.options.resultSelector ?? 'a[href]';
    const titleSelector = this.options.titleSelector ?? '';
    const snippetSelector = this.options.snippetSelector ?? '';
    const seenUrls = new Set<string>();
    const collectedAt = new Date().toISOString();

    $(resultSelector).each((_, element) => {
      if (results.length >= query.maxResultsPerSource) return;

      const link = $(element);
      const anchor = titleSelector ? link.find(titleSelector).first() : link;
      const href = anchor.attr('href') ?? link.attr('href') ?? '';
      const url = this.resolveUrl(href);
      const host = this.hostOf(url);
      if (!url || !host || this.isOwnHost(host) || !this.isAllowedHost(host)) return;

      const title = (titleSelector ? anchor.text() : link.text()).trim();
      const snippet = snippetSelector ? link.find(snippetSelector).text().trim() : '';
      const canonicalUrl = Normalizer.url(url);
      if (!title || seenUrls.has(canonicalUrl)) return;
      seenUrls.add(canonicalUrl);

      results.push({
        title,
        url,
        description: snippet || undefined,
        source: this.metadata.name,
        sourceType: this.metadata.type,
        collectedAt,
        excerpt: snippet || undefined,
        confidence: this.confidence(title, snippet, query.raw),
        entities: [],
      });
    });

    return results;
  }

  private resolveUrl(href: string): string {
    const baseUrls = [this.options.buildUrl, ...(this.options.fallbackBuildUrls ?? [])];
    for (const buildUrl of baseUrls) {
      try {
        const resolved = new URL(href, buildUrl(''));
        if (href.startsWith('/url') && !resolved.hostname.includes('google.')) continue;
        if (href.includes('/ck/a') && !resolved.hostname.endsWith('bing.com')) continue;
      const encodedTarget = resolved.searchParams.get('u');
      if (resolved.hostname.endsWith('bing.com') && encodedTarget?.startsWith('a1')) {
        const decoded = Buffer.from(encodedTarget.slice(2), 'base64url').toString('utf8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) return decoded;
      }
      const googleTarget = resolved.searchParams.get('q') ?? resolved.searchParams.get('url');
      if (resolved.hostname.includes('google.') && googleTarget?.startsWith('http')) return googleTarget;
      return resolved.toString();
      } catch {
        continue;
      }
    }
    return '';
  }

  private hostOf(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isOwnHost(host: string): boolean {
    try {
      return new URL(this.options.buildUrl('')).hostname.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  private isAllowedHost(host: string): boolean {
    return !this.options.allowedHosts || this.options.allowedHosts.some((allowed) =>
      host === allowed || host.endsWith(`.${allowed}`),
    );
  }

  private confidence(title: string, snippet: string, rawQuery: string): number {
    const normalizedQuery = Normalizer.name(rawQuery);
    const normalizedTitle = Normalizer.name(title);
    const normalizedSnippet = Normalizer.name(snippet);
    if (normalizedTitle.includes(normalizedQuery)) return 0.8;
    if (normalizedSnippet.includes(normalizedQuery)) return 0.65;
    return 0.5;
  }
}
