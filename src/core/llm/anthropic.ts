import { BaseLLMProvider } from './base';
import type { Message } from './base';
import type { LlmConfig } from '../config/types';

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';

  constructor(_config: LlmConfig) {
    super();
  }

  async chat(_messages: Message[]): Promise<string> {
    throw new Error('Anthropic provider not yet implemented. Available providers: gemini');
  }

  async *chatStream(_messages: Message[]): AsyncIterable<string> {
    throw new Error('Anthropic provider not yet implemented. Available providers: gemini');
  }
}
