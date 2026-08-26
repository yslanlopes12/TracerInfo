import { describe, it, expect } from 'vitest';
import { SearchResultSchema } from '../../../src/core/models/SearchResult.js';
import { randomUUID } from 'node:crypto';

describe('SearchResultSchema', () => {
  const validResult = {
    id: randomUUID(),
    title: 'Test Result Title',
    url: 'https://example.com/page',
    description: 'A brief description of the result.',
    source: 'TestSource',
    sourceType: 'web',
    collectedAt: new Date().toISOString(),
    entities: [],
    confidence: 0.75,
  };

  it('validates a correct SearchResult', () => {
    const result = SearchResultSchema.parse(validResult);
    expect(result.title).toBe('Test Result Title');
    expect(result.confidence).toBe(0.75);
  });

  it('accepts optional fields when absent', () => {
    const result = SearchResultSchema.parse(validResult);
    expect(result.description).toBeDefined();
    expect(result.publishedAt).toBeUndefined();
    expect(result.excerpt).toBeUndefined();
  });

  it('rejects an invalid URL', () => {
    expect(() =>
      SearchResultSchema.parse({ ...validResult, url: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects confidence out of range', () => {
    expect(() =>
      SearchResultSchema.parse({ ...validResult, confidence: 1.5 }),
    ).toThrow();

    expect(() =>
      SearchResultSchema.parse({ ...validResult, confidence: -0.1 }),
    ).toThrow();
  });

  it('rejects invalid sourceType', () => {
    expect(() =>
      SearchResultSchema.parse({ ...validResult, sourceType: 'invalid_type' }),
    ).toThrow();
  });

  it('rejects missing title', () => {
    const { title: _, ...rest } = validResult;
    expect(() => SearchResultSchema.parse(rest)).toThrow();
  });

  it('defaults entities to empty array when not provided', () => {
    const { entities: _, ...rest } = validResult;
    const result = SearchResultSchema.parse(rest);
    expect(result.entities).toEqual([]);
  });

  it('validates all valid sourceType values', () => {
    const validSourceTypes = [
      'web', 'news', 'document', 'public_record',
      'social', 'academic', 'government', 'mock',
    ];

    for (const sourceType of validSourceTypes) {
      expect(() =>
        SearchResultSchema.parse({ ...validResult, sourceType }),
      ).not.toThrow();
    }
  });

  it('validates entity mentions within a result', () => {
    const result = SearchResultSchema.parse({
      ...validResult,
      entities: [
        { type: 'person', value: 'João da Silva', confidence: 0.9 },
        { type: 'organization', value: 'Empresa X', confidence: 0.7 },
      ],
    });

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]?.type).toBe('person');
  });

  it('rejects entity with invalid confidence', () => {
    expect(() =>
      SearchResultSchema.parse({
        ...validResult,
        entities: [{ type: 'person', value: 'João', confidence: 2.0 }],
      }),
    ).toThrow();
  });
});
