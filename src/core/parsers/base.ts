import type { AppConfig } from '../config/types';

export interface RawChatSession {
  source: string;
  externalId: string;
  title: string;
  project?: string;
  projectPath?: string;
  firstMessageAt: string;
  lastMessageAt: string;
  metadata?: Record<string, unknown>;
}

export interface RawChatMessage {
  sessionExternalId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface RawToolInvocation {
  sessionExternalId: string;
  messageExternalId?: string;
  toolName: string;
  toolInput?: string;
  toolOutput?: string;
  timestamp: string;
}

export interface ParserResult {
  sessions: RawChatSession[];
  messages: RawChatMessage[];
  toolInvocations: RawToolInvocation[];
}

export abstract class BaseParser {
  abstract readonly name: string;
  abstract readonly sourceDir: string;
  abstract canIncremental(): boolean;
  abstract parse(): Promise<ParserResult>;
  parseIncremental?(_cursor: number): Promise<ParserResult>;
}

export type ParserConstructor = new (config: AppConfig) => BaseParser;
