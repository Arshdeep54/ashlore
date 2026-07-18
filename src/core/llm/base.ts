export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string;
}

export abstract class BaseLLMProvider {
  abstract readonly name: string;
  abstract chat(messages: Message[]): Promise<string>;
  abstract chatStream(messages: Message[]): AsyncIterable<string>;
}
