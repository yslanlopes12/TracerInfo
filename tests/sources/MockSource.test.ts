import { describe, it, expect, vi } from 'vitest';
import { MockSource } from '../../src/sources/mock/MockSource.js';
import { buildSearchQuery } from '../../src/core/models/SearchQuery.js';

describe('MockSource', () => {
  const query = buildSearchQuery('Test Query', 'person');
  const source = new MockSource();

  it('has correct metadata', () => {
    expect(source.metadata.id).toBe('mock');
    expect(source.metadata.type).toBe('mock');
    expect(source.metadata.name).toBeTruthy();
  });

  it('returns an array of results', async () => {
    const results = await source.search(query);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns results within the maxResultsPerSource limit', async () => {
    const limitedQuery = buildSearchQuery('Test', 'person', { maxResultsPerSource: 2 });
    const results = await source.search(limitedQuery);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns results with required fields', async () => {
    const results = await source.search(query);
    const first = results[0];

    expect(first).toBeDefined();
    expect(first?.title).toBeTruthy();
    expect(first?.url).toMatch(/^https?:\/\//);
    expect(first?.source).toBe('MockSource');
    expect(first?.sourceType).toBe('mock');
    expect(typeof first?.confidence).toBe('number');
  });

  it('throws when aborted', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort immediately

    await expect(source.search(query, controller.signal)).rejects.toThrow();
  });

  it('all results have valid confidence values', async () => {
    const results = await source.search(query);

    for (const result of results) {
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('all results have collectedAt set', async () => {
    const results = await source.search(query);

    for (const result of results) {
      expect(result.collectedAt).toBeDefined();
      expect(() => new Date(result.collectedAt!)).not.toThrow();
    }
  });
});
