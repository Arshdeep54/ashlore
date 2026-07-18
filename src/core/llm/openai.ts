import { BaseLLMProvider } from './base';
import type { Message } from './base';
import type { LlmConfig } from '../config/types';

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';

  constructor(_config: LlmConfig) {
    super();
  }

  async chat(_messages: Message[]): Promise<string> {
    throw new Error('OpenAI provider not yet implemented');
  }

  async *chatStream(_messages: Message[]): AsyncIterable<string> {
    throw new Error('OpenAI provider not yet implemented');
  }
}
