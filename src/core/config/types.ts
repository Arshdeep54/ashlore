import { z } from 'zod';

export const LlmConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'anthropic', 'ollama']),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  availableModels: z.array(z.string()).optional(),
});

export const EmbeddingConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'ollama']),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  dimensions: z.number().optional(),
});

export const KiloSourceSchema = z.object({
  enabled: z.boolean(),
  databasePath: z.string(),
});

export const CodexSourceSchema = z.object({
  enabled: z.boolean(),
  historyPath: z.string(),
  stateDbPath: z.string(),
  sessionsDir: z.string(),
});

export const ClaudeSourceSchema = z.object({
  enabled: z.boolean(),
  historyPath: z.string(),
  projectsDir: z.string(),
  sessionsDir: z.string(),
});

export const ChatGptSourceSchema = z.object({
  enabled: z.boolean(),
  exportsDir: z.string(),
});

export const GithubSourceSchema = z.object({
  enabled: z.boolean(),
  username: z.string(),
  repos: z.array(z.string()),
});

export const SourcesConfigSchema = z.object({
  kilo: KiloSourceSchema,
  codex: CodexSourceSchema,
  claude: ClaudeSourceSchema,
  chatgpt: ChatGptSourceSchema,
  claudeWeb: ChatGptSourceSchema,
  github: GithubSourceSchema,
});

export const DatabaseConfigSchema = z.object({
  path: z.string(),
});

export const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string().optional(),
});

export const AppConfigSchema = z.object({
  sources: SourcesConfigSchema,
  llm: LlmConfigSchema,
  embedding: EmbeddingConfigSchema,
  database: DatabaseConfigSchema,
  dateRange: DateRangeSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type LlmConfig = z.infer<typeof LlmConfigSchema>;
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export type SourcesConfig = z.infer<typeof SourcesConfigSchema>;
