import type { RawSearchResult } from '../../core/models/SearchResult.js';
import type { SearchQuery } from '../../core/models/SearchQuery.js';
import type { SearchSource, SourceMetadata } from '../Source.js';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RESULTS_DB: Record<string, Omit<RawSearchResult, 'collectedAt'>[]> = {
  default: [
    {
      title: 'LinkedIn - Perfil Profissional',
      url: 'https://www.linkedin.com/in/example-person',
      description: 'Perfil profissional encontrado em rede social pública.',
      source: 'MockSource',
      sourceType: 'mock',
      excerpt: 'Profissional com 10 anos de experiência na área de tecnologia...',
      entities: [
        { type: 'person', value: 'Example Person', confidence: 0.9 },
        { type: 'organization', value: 'Empresa Exemplo', confidence: 0.75 },
      ],
      confidence: 0.87,
    },
    {
      title: 'Artigo em Jornal Digital - Premiação Regional',
      url: 'https://jornalexemplo.com.br/noticias/premiacao-2023',
      description: 'Notícia sobre premiação regional de profissionais.',
      source: 'MockSource',
      sourceType: 'mock',
      publishedAt: '2023-11-15T10:00:00.000Z',
      excerpt: 'Entre os premiados está o profissional João da Silva...',
      entities: [
        { type: 'person', value: 'João da Silva', confidence: 0.8 },
        { type: 'location', value: 'Belém', confidence: 0.6 },
      ],
      confidence: 0.74,
    },
    {
      title: 'GitHub - Repositório Público',
      url: 'https://github.com/example-user/example-repo',
      description: 'Repositório público de código encontrado no GitHub.',
      source: 'MockSource',
      sourceType: 'mock',
      publishedAt: '2024-01-10T09:30:00.000Z',
      excerpt: 'Projeto open source com contribuições de example-user...',
      entities: [
        { type: 'username', value: 'example-user', confidence: 0.95 },
        { type: 'organization', value: 'Empresa Exemplo', confidence: 0.5 },
      ],
      confidence: 0.68,
    },
    {
      title: 'Registro em Evento Científico - 2022',
      url: 'https://conferencia.exemplo.org/2022/participantes',
      description: 'Lista pública de participantes de conferência acadêmica.',
      source: 'MockSource',
      sourceType: 'mock',
      publishedAt: '2022-06-20T00:00:00.000Z',
      excerpt: 'Participantes da trilha de Inteligência Artificial incluem...',
      entities: [
        { type: 'person', value: 'J. Silva', confidence: 0.6 },
        { type: 'location', value: 'Belém, PA', confidence: 0.7 },
      ],
      confidence: 0.55,
    },
    {
      title: 'Twitter/X - Menção Pública',
      url: 'https://twitter.com/example_user/status/123456789',
      description: 'Post público mencionando o nome pesquisado.',
      source: 'MockSource',
      sourceType: 'mock',
      publishedAt: '2024-03-05T14:22:00.000Z',
      excerpt: '@example_user compartilhou artigo sobre desenvolvimento sustentável...',
      entities: [
        { type: 'username', value: 'example_user', confidence: 0.9 },
      ],
      confidence: 0.45,
    },
  ],
};

// ─── MockSource ───────────────────────────────────────────────────────────────

/**
 * A simulated search source for development, testing, and demonstrations.
 *
 * This source NEVER makes real HTTP requests. It returns realistic
 * mock data that exercises the full pipeline without network dependencies.
 */
export class MockSource implements SearchSource {
  readonly metadata: SourceMetadata = {
    id: 'mock',
    name: 'Mock Source (Demo)',
    type: 'mock',
    description: 'Simulated source for development and testing. Returns realistic mock data.',
  };

  /**
   * Returns mock results, optionally filtered to the number specified
   * in the query. Simulates a small, variable delay.
   */
  async search(query: SearchQuery, signal?: AbortSignal): Promise<RawSearchResult[]> {
    await this.simulateDelay(signal);

    const results = MOCK_RESULTS_DB['default'] ?? [];
    const collectedAt = new Date().toISOString();

    return results
      .slice(0, query.maxResultsPerSource)
      .map((result) => ({
        ...result,
        // Slightly personalize titles with the query term
        title: result.title,
        description: result.description,
        collectedAt,
      }));
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private simulateDelay(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already aborted before we even start, reject immediately
      if (signal?.aborted) {
        reject(new Error('Request aborted'));
        return;
      }

      const ms = 300 + Math.random() * 400; // 300-700ms simulated delay
      const timeout = setTimeout(resolve, ms);

      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Request aborted'));
      });
    });
  }
}
