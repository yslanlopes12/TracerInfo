import type { SearchSource } from '../Source.js';
import { DuckDuckGoSource } from './DuckDuckGoSource.js';
import { PublicSearchSource } from './PublicSearchSource.js';
import { XSource } from './XSource.js';

const htmlSearch = (baseUrl: string, parameter = 'q') => (query: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set(parameter, query);
  return url.toString();
};

const socialFallbacks = [
  htmlSearch('https://www.google.com/search'),
  htmlSearch('https://www.bing.com/search'),
];

export function createProductionSources(): SearchSource[] {
  return [
    new DuckDuckGoSource({ rateLimitKey: 'duckduckgo' }),
    new XSource(),
    new PublicSearchSource({ id: 'instagram', name: 'Instagram', type: 'social', description: 'Public Instagram pages indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:instagram.com ', allowedHosts: ['instagram.com'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'youtube', name: 'YouTube', type: 'social', description: 'Public YouTube channels and videos indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:youtube.com ', allowedHosts: ['youtube.com', 'youtu.be'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'linkedin', name: 'LinkedIn', type: 'social', description: 'Public LinkedIn pages indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:linkedin.com ', allowedHosts: ['linkedin.com'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'facebook', name: 'Facebook', type: 'social', description: 'Public Facebook pages indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:facebook.com ', allowedHosts: ['facebook.com'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'threads', name: 'Threads', type: 'social', description: 'Public Threads pages indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:threads.net ', allowedHosts: ['threads.net'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'bing', name: 'Bing', type: 'web', description: 'Bing public web results.', buildUrl: htmlSearch('https://www.bing.com/search') }),
    new PublicSearchSource({ id: 'brave', name: 'Brave Search', type: 'web', description: 'Brave public web results.', buildUrl: htmlSearch('https://search.brave.com/search') }),
    new PublicSearchSource({ id: 'google', name: 'Google Search', type: 'web', description: 'Google public web results.', buildUrl: htmlSearch('https://www.google.com/search') }),
    new PublicSearchSource({ id: 'yahoo', name: 'Yahoo Search', type: 'web', description: 'Yahoo public web results.', buildUrl: htmlSearch('https://search.yahoo.com/search') }),
    new PublicSearchSource({ id: 'yandex', name: 'Yandex', type: 'web', description: 'Yandex public web results.', buildUrl: htmlSearch('https://yandex.com/search') }),
    new PublicSearchSource({ id: 'startpage', name: 'Startpage', type: 'web', description: 'Startpage public web results.', buildUrl: htmlSearch('https://www.startpage.com/sp/search') }),
    new PublicSearchSource({ id: 'mojeek', name: 'Mojeek', type: 'web', description: 'Mojeek independent web results.', buildUrl: htmlSearch('https://www.mojeek.com/search') }),
    new PublicSearchSource({ id: 'qwant', name: 'Qwant', type: 'web', description: 'Qwant public web results.', buildUrl: htmlSearch('https://www.qwant.com/') }),
    new PublicSearchSource({ id: 'ecosia', name: 'Ecosia', type: 'web', description: 'Ecosia public web results.', buildUrl: htmlSearch('https://www.ecosia.org/search') }),
    new PublicSearchSource({ id: 'swisscows', name: 'Swisscows', type: 'web', description: 'Swisscows public web results.', buildUrl: htmlSearch('https://swisscows.com/en/web') }),
    new PublicSearchSource({ id: 'wiby', name: 'Wiby', type: 'web', description: 'Wiby lightweight web results.', buildUrl: htmlSearch('https://wiby.me/') }),
    new PublicSearchSource({ id: 'marginalia', name: 'Marginalia Search', type: 'web', description: 'Marginalia independent web index.', buildUrl: htmlSearch('https://search.marginalia.nu/search') }),
    new PublicSearchSource({ id: 'wikipedia', name: 'Wikipedia', type: 'academic', description: 'Wikipedia public encyclopedia search.', buildUrl: htmlSearch('https://en.wikipedia.org/w/index.php', 'search') }),
      new PublicSearchSource({ id: 'github', name: 'GitHub', type: 'social', description: 'Public GitHub profiles and repositories indexed by search providers.', buildUrl: htmlSearch('https://search.brave.com/search'), fallbackBuildUrls: socialFallbacks, queryPrefix: 'site:github.com ', allowedHosts: ['github.com'], rateLimitKey: 'brave' }),
    new PublicSearchSource({ id: 'reddit', name: 'Reddit', type: 'social', description: 'Public Reddit search results.', buildUrl: htmlSearch('https://www.reddit.com/search', 'q') }),
    new PublicSearchSource({ id: 'hackernews', name: 'Hacker News', type: 'academic', description: 'Public Hacker News search results.', buildUrl: htmlSearch('https://hn.algolia.com/', 'query') }),
    new PublicSearchSource({ id: 'archive', name: 'Internet Archive', type: 'document', description: 'Public Internet Archive search results.', buildUrl: htmlSearch('https://archive.org/search', 'query') }),
    new PublicSearchSource({ id: 'crossref', name: 'Crossref', type: 'academic', description: 'Public scholarly metadata search.', buildUrl: htmlSearch('https://search.crossref.org/', 'q') }),
  ];
}
