import { BaseEmbeddingProvider } from './base';
import type { EmbeddingConfig } from '../config/types';

export class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'gemini';
  readonly dimensions = 768;

  constructor(_config: EmbeddingConfig) {
    super();
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error('Gemini embedding provider not yet implemented');
  }

  async embedSingle(_text: string): Promise<number[]> {
    throw new Error('Gemini embedding provider not yet implemented');
  }
}
