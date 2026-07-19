import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppConfigSchema } from './types';
import type { AppConfig } from './types';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function resolveEnvVars(value: string): string {
  if (value.startsWith('$')) {
    const envVar = value.slice(1);
    return process.env[envVar] ?? '';
  }
  return value;
}

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

function resolveConfigValues(config: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = expandHomeDir(resolveEnvVars(value));
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      resolved[key] = resolveConfigValues(value as Record<string, unknown>);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

export function loadConfig(configPath?: string): AppConfig {
  const defaultPath = path.join(process.cwd(), 'ashlore.config.json');
  const resolvedPath = configPath ?? defaultPath;

  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigError(
      `Config file not found at ${resolvedPath}. Copy ashlore.config.example.json to ashlore.config.json and edit it.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  const resolved = resolveConfigValues(raw);

  const result = AppConfigSchema.safeParse(resolved);

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}
