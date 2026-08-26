import { PublicSearchSource } from './PublicSearchSource.js';

export class XSource extends PublicSearchSource {
  constructor() {
    super({
      id: 'x',
      name: 'X (Twitter)',
      type: 'social',
      description: 'Public X profiles and posts indexed by Brave Search.',
      buildUrl: (query) => {
        const url = new URL('https://search.brave.com/search');
        url.searchParams.set('q', query);
        return url.toString();
      },
      fallbackBuildUrls: [
        (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      ],
      queryPrefix: 'site:x.com ',
      allowedHosts: ['x.com', 'twitter.com'],
      rateLimitKey: 'brave',
    });
  }
}
