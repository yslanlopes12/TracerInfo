/**
 * Utility class for normalizing common OSINT data types.
 * Pure functions with no side effects.
 */
export class Normalizer {
  /**
   * Normalizes a URL for deduplication and comparison.
   * - Converts to lowercase
   * - Removes trailing slashes
   * - Strips protocol (http://, https://) and www.
   * - Removes tracking parameters
   */
  static url(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);

      // Strip common tracking parameters
      const paramsToKeep = new URLSearchParams();
      for (const [key, value] of parsed.searchParams.entries()) {
        if (!key.startsWith('utm_') && key !== 'fbclid' && key !== 'gclid') {
          paramsToKeep.append(key, value);
        }
      }

      let host = parsed.hostname.toLowerCase();
      if (host.startsWith('www.')) {
        host = host.slice(4);
      }

      let path = parsed.pathname.toLowerCase(); // FIX: lowercase path
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      if (path === '') {
        path = '/';
      }

      const search = paramsToKeep.toString();
      const query = search ? `?${search}` : '';

      return `${host}${path}${query}`;
    } catch {
      // Fallback for invalid URLs
      return rawUrl
        .toLowerCase()
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/\/$/, '')
        .trim();
    }
  }

  /**
   * Normalizes a person's name.
   * - Converts to lowercase
   * - Removes accents/diacritics (e.g., João -> joao)
   * - Replaces multiple spaces with a single space
   * - Trims edges
   */
  static name(rawName: string): string {
    return rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  static nameVariants(rawName: string, aliases: string[] = []): string[] {
    const normalized = this.name(rawName);
    const tokens = normalized.split(' ').filter(Boolean);
    const variants = new Set([normalized]);

    if (tokens.length > 1) {
      variants.add([...tokens].reverse().join(' '));
      variants.add(tokens.map((token) => token[0]).join(''));
      variants.add(tokens.join(''));
    }

    for (const alias of aliases) {
      const normalizedAlias = this.name(alias);
      if (normalizedAlias) variants.add(normalizedAlias);
    }

    return [...variants];
  }

  /**
   * Normalizes a username or handle.
   * - Removes leading '@'
   * - Converts to lowercase
   * - Trims whitespace
   */
  static username(rawHandle: string): string {
    return rawHandle.trim().replace(/^@/, '').toLowerCase(); // FIX: trim before replace
  }

  /**
   * Normalizes an email address.
   * - Converts to lowercase
   * - Trims whitespace
   */
  static email(rawEmail: string): string {
    return rawEmail.toLowerCase().trim();
  }

  /**
   * Normalizes a domain name.
   * - Converts to lowercase
   * - Removes trailing slashes
   * - Removes protocol and www.
   */
  static domain(rawDomain: string): string {
    try {
      const url = rawDomain.includes('://') ? rawDomain : `http://${rawDomain}`;
      const parsed = new URL(url);
      let host = parsed.hostname.toLowerCase();
      if (host.startsWith('www.')) {
        host = host.slice(4);
      }
      return host;
    } catch {
      return rawDomain.toLowerCase().replace(/^www\./, '').trim();
    }
  }
}
