import { BaseLLMProvider } from '../llm/base';
import { BaseEmbeddingProvider } from '../embed/base';
import type { LlmConfig } from './types';
import type { EmbeddingConfig } from './types';

export async function createLLMProvider(config: LlmConfig): Promise<BaseLLMProvider> {
  switch (config.provider) {
    case 'gemini': {
      const { GeminiProvider } = await import('../llm/gemini');
      return new GeminiProvider(config);
    }
    case 'openai': {
      const { OpenAIProvider } = await import('../llm/openai');
      return new OpenAIProvider(config);
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('../llm/anthropic');
      return new AnthropicProvider(config);
    }
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

export async function createEmbeddingProvider(
  config: EmbeddingConfig
): Promise<BaseEmbeddingProvider> {
  switch (config.provider) {
    case 'gemini': {
      const { GeminiEmbeddingProvider } = await import('../embed/gemini');
      return new GeminiEmbeddingProvider(config);
    }
    case 'openai': {
      const { OpenAIEmbeddingProvider } = await import('../embed/openai');
      return new OpenAIEmbeddingProvider(config);
    }
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}
