import { execSync } from 'child_process';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage } from './base';
import type { AppConfig } from '../config/types';
import { parserRegistry } from './registry';

interface GitCommit {
  sha: string;
  date: string;
  message: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  repo: string;
}

function parseGitLog(repoPath: string, repoName: string): GitCommit[] {
  const since = '2026-05-14';

  const authorCheck = execSync(
    `git log --author="Arshdeep\\|cosign" --since="${since}" --oneline 2>/dev/null | wc -l`,
    { cwd: repoPath }
  ).toString().trim();

  if (authorCheck === '0') return [];

  const format = '%H|%ai|%s';
  const log = execSync(
    `git log --author="Arshdeep\\|cosign" --since="${since}" --format="${format}" --shortstat`,
    { cwd: repoPath, maxBuffer: 50 * 1024 * 1024 }
  ).toString();

  const commits: GitCommit[] = [];
  const lines = log.split('\n');

  let current: Partial<GitCommit> | null = null;

  for (const line of lines) {
    if (line.includes('|')) {
      const parts = line.split('|');
      if (parts.length >= 3 && parts[0]!.length === 40) {
        current = {
          sha: parts[0],
          date: parts[1]?.trim() ?? '',
          message: parts[2]?.trim() ?? '',
          filesChanged: 0,
          additions: 0,
          deletions: 0,
          repo: repoName,
        };
        commits.push(current as GitCommit);
      }
      continue;
    }

    if (current && line.includes('file')) {
      const match = line.match(/(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?)?(?:,\s+(\d+)\s+deletions?)?/);
      if (match) {
        current.filesChanged = parseInt(match[1] ?? '0', 10);
        current.additions = parseInt(match[2] ?? '0', 10);
        current.deletions = parseInt(match[3] ?? '0', 10);
      }
    }
  }

  return commits;
}

export class GithubParser extends BaseParser {
  readonly name = 'github';
  readonly sourceDir: string;

  constructor(_config: AppConfig) {
    super();
    this.sourceDir = '';
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const repos = [
      { path: '/home/cosign/grapevine/tal-ai-agent', name: 'tal-ai-agent' },
      { path: '/home/cosign/grapevine/tal-ai-dashboard', name: 'tal-ai-dashboard' },
      { path: '/home/cosign/grapevine/backend', name: 'backend' },
    ];

    const allCommits: GitCommit[] = [];

    for (const repo of repos) {
      try {
        const commits = parseGitLog(repo.path, repo.name);
        allCommits.push(...commits);
      } catch {
        continue;
      }
    }

    const sessions: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];

    const commitsByDate = new Map<string, GitCommit[]>();
    for (const c of allCommits) {
      const date = c.date.slice(0, 10);
      const group = commitsByDate.get(date) ?? [];
      group.push(c);
      commitsByDate.set(date, group);
    }

    for (const [date, commits] of commitsByDate) {
      const firstTime = new Date(commits[0]!.date).toISOString();
      const lastTime = new Date(commits[commits.length - 1]!.date).toISOString();

      sessions.push({
        source: this.name,
        externalId: `github-${date}`,
        title: `${commits.length} commit${commits.length !== 1 ? 's' : ''}`,
        project: commits.map((c) => c.repo).filter((v, i, a) => a.indexOf(v) === i).join(', '),
        projectPath: undefined,
        firstMessageAt: firstTime,
        lastMessageAt: lastTime,
        metadata: {
          repos: commits.map((c) => c.repo).filter((v, i, a) => a.indexOf(v) === i),
          totalFiles: commits.reduce((sum, c) => sum + c.filesChanged, 0),
          totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
          totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
        },
      });

      for (const commit of commits) {
        messages.push({
          sessionExternalId: `github-${date}`,
          role: 'user',
          content: `[${commit.repo}] ${commit.message} (${commit.sha.slice(0, 7)})`,
          timestamp: new Date(commit.date).toISOString(),
          metadata: {
            sha: commit.sha,
            repo: commit.repo,
            filesChanged: commit.filesChanged,
            additions: commit.additions,
            deletions: commit.deletions,
          },
        });
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }
}

parserRegistry.register('github', GithubParser);
