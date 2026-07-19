import fs from 'fs';
import path from 'path';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage } from './base';
import type { AppConfig } from '../config/types';
import { parserRegistry } from './registry';

interface ClaudeWebConversation {
  uuid: string;
  name: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  account?: { uuid: string; name: string };
  chat_messages: ClaudeWebMessage[];
}

interface ClaudeWebMessage {
  uuid: string;
  text: string;
  sender: string;
  created_at: string;
}

export class ClaudeWebParser extends BaseParser {
  readonly name = 'claude-web';
  readonly sourceDir: string;
  private conversationsPath: string;

  constructor(config: AppConfig) {
    super();
    this.sourceDir = config.sources.claudeWeb.exportsDir;
    this.conversationsPath = path.join(this.sourceDir, 'conversations.json');
    this.ensureConversationsFile();
  }

  canIncremental(): boolean {
    return false;
  }

  async parse(): Promise<ParserResult> {
    const data: ClaudeWebConversation[] = JSON.parse(
      fs.readFileSync(this.conversationsPath, 'utf-8')
    );

    const startDate = new Date('2026-05-14');
    const sessions: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];

    for (const conv of data) {
      const created = new Date(conv.created_at);
      if (created < startDate) continue;

      const msgs = conv.chat_messages ?? [];
      if (msgs.length === 0) continue;

      const firstMsg = msgs[0]!;
      const lastMsg = msgs[msgs.length - 1]!;

      sessions.push({
        source: this.name,
        externalId: conv.uuid,
        title: conv.name ?? 'Untitled',
        project: undefined,
        projectPath: undefined,
        firstMessageAt: firstMsg.created_at,
        lastMessageAt: lastMsg.created_at,
        metadata: {
          account: conv.account?.name ?? 'unknown',
          summary: conv.summary ?? null,
        },
      });

      for (const msg of msgs) {
        const text = (msg.text ?? '').trim();
        if (!text) continue;

        messages.push({
          sessionExternalId: conv.uuid,
          role: msg.sender === 'human' ? 'user' : 'assistant',
          content: text,
          timestamp: msg.created_at,
          metadata: { messageUuid: msg.uuid },
        });
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }

  private ensureConversationsFile(): void {
    if (fs.existsSync(this.conversationsPath)) {
      return;
    }

    const zipPath = path.join(this.sourceDir, 'conversations.zip');
    const batchZip = path.join(this.sourceDir, '..', 'data-7322644d-56e3-47ac-999a-0123fce4fa75-1784405828-0c4487b1-batch-0000.zip');

    let foundZip: string | null = null;

    if (fs.existsSync(zipPath)) foundZip = zipPath;
    else if (fs.existsSync(batchZip)) foundZip = batchZip;
    else {
      const files = fs.readdirSync(this.sourceDir);
      const possible = files.find((f) => f.endsWith('.zip'));
      if (possible) {
        foundZip = path.join(this.sourceDir, possible);
      }
    }

    if (!foundZip) {
      throw new Error(
        `Claude Web: no conversations.json or .zip file found in ${this.sourceDir}. Drop your export ZIP here and retry.`
      );
    }

    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(foundZip);
      const entry = zip.getEntry('conversations.json');

      if (!entry) {
        throw new Error(
          `Claude Web export found but no conversations.json inside. Got: ${zip.getEntries().map((e: { entryName: string }) => e.entryName).join(', ')}`
        );
      }

      const jsonContent = zip.readAsText(entry);
      fs.writeFileSync(this.conversationsPath, jsonContent);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Claude Web')) throw err;
      throw new Error(
        `Failed to extract Claude Web export from ${foundZip}. Is this a valid Claude data export?`
      );
    }
  }
}

parserRegistry.register('claude-web', ClaudeWebParser);
