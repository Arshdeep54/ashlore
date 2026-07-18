import { BaseLLMProvider } from './base';
import type { Message } from './base';
import type { LlmConfig } from '../config/types';

export class GeminiProvider extends BaseLLMProvider {
  readonly name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(config: LlmConfig) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? 'gemini-2.0-flash';
  }

  async chat(messages: Message[]): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.model });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    if (lastMessage && history.length > 0) {
      const chat = model.startChat({ history: history as any });
      const result = await chat.sendMessage(lastMessage.content);
      return result.response.text();
    }

    const result = await model.generateContent(lastMessage?.content ?? '');
    return result.response.text();
  }

  async *chatStream(messages: Message[]): AsyncIterable<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.model });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    let stream;
    if (lastMessage && history.length > 0) {
      const chat = model.startChat({ history: history as any });
      stream = await chat.sendMessageStream(lastMessage.content);
    } else {
      stream = await model.generateContentStream(lastMessage?.content ?? '');
    }

    for await (const chunk of stream.stream) {
      yield chunk.text();
    }
  }
}
