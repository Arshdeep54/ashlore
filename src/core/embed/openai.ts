import { BaseEmbeddingProvider } from './base';
import type { EmbeddingConfig } from '../config/types';

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = 1536;

  constructor(_config: EmbeddingConfig) {
    super();
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error('OpenAI embedding provider not yet implemented');
  }

  async embedSingle(_text: string): Promise<number[]> {
    throw new Error('OpenAI embedding provider not yet implemented');
  }
}
