import { getDb } from '../db/connection';

const SKILL_TAXONOMY: { name: string; category: string; patterns: RegExp[] }[] = [
  {
    name: 'TypeScript',
    category: 'language',
    patterns: [/\btypescript\b/i, /\b\.ts\b/, /\b\.tsx\b/, /\btsconfig\b/i],
  },
  {
    name: 'JavaScript',
    category: 'language',
    patterns: [/\bjavascript\b/i, /\b\.js\b/, /\b\.jsx\b/, /\bnode\.js\b/i],
  },
  {
    name: 'Python',
    category: 'language',
    patterns: [/\bpython\b/i, /\b\.py\b/, /\bpip\b/, /\bvenv\b/i],
  },
  {
    name: 'Rust',
    category: 'language',
    patterns: [/\brust\b/i, /\bcargo\b/i, /\b\.rs\b/, /\btokio\b/i],
  },
  {
    name: 'SQL',
    category: 'language',
    patterns: [/\bSELECT\b/, /\bINSERT\b/, /\bUPDATE\b.*\bSET\b/, /\bCREATE TABLE\b/i],
  },
  {
    name: 'React',
    category: 'frontend',
    patterns: [/\breact\b/i, /\bjsx\b/i, /\buseState\b/i, /\buseEffect\b/i, /\buseCallback\b/i],
  },
  {
    name: 'Next.js',
    category: 'frontend',
    patterns: [/\bnext\.js\b/i, /\bnext\b.*\bconfig\b/i, /\bapp router\b/i, /\bgetServerSideProps\b/i],
  },
  {
    name: 'Tailwind',
    category: 'frontend',
    patterns: [/\btailwind\b/i, /\btw-merge\b/i, /\bclassName="[^"]*\b(flex|grid|text-|bg-)\b/],
  },
  {
    name: 'PostgreSQL',
    category: 'database',
    patterns: [/\bpostgres\b/i, /\bpostgresql\b/i, /\bpgvector\b/i, /\bpsql\b/i],
  },
  {
    name: 'SQLite',
    category: 'database',
    patterns: [/\bsqlite\b/i, /\bbetter-sqlite3\b/i, /\bFTS5\b/i, /\b\.db\b/],
  },
  {
    name: 'Drizzle',
    category: 'database',
    patterns: [/\bdrizzle\b/i, /\bdrizzle-kit\b/i, /\bdrizzle\.config\b/i],
  },
  {
    name: 'Docker',
    category: 'devops',
    patterns: [/\bdocker\b/i, /\bdockerfile\b/i, /\bdocker-compose\b/i, /\bcontainer\b/i],
  },
  {
    name: 'Kubernetes',
    category: 'devops',
    patterns: [/\bkubernetes\b/i, /\bk8s\b/i, /\bkubectl\b/i, /\bhelm\b/i],
  },
  {
    name: 'Git',
    category: 'devops',
    patterns: [/\bgit\b.*\bcommit\b/i, /\bgit\b.*\brebase\b/i, /\bgit\b.*\bmerge\b/i, /\bgithub\b/i],
  },
  {
    name: 'CI/CD',
    category: 'devops',
    patterns: [/\bci\/cd\b/i, /\bpipeline\b/i, /\bgithub actions\b/i, /\bdeploy\b/i],
  },
  {
    name: 'Hono',
    category: 'backend',
    patterns: [/\bhono\b/i, /\bhono\/jsx\b/i, /\bcreateRoute\b/i],
  },
  {
    name: 'Express',
    category: 'backend',
    patterns: [/\bexpress\b/i, /\bexpress\.js\b/i, /\bapp\.get\b/i, /\bapp\.post\b/i],
  },
  {
    name: 'REST API',
    category: 'backend',
    patterns: [/\bREST\b/, /\bapi route\b/i, /\bendpoint\b/i, /\bGET \//, /\bPOST \//],
  },
  {
    name: 'GraphQL',
    category: 'backend',
    patterns: [/\bgraphql\b/i, /\bgql\b/i, /\bquery\b.*\b{\b/, /\bmutation\b/i],
  },
  {
    name: 'gRPC',
    category: 'backend',
    patterns: [/\bgrpc\b/i, /\bprotobuf\b/i, /\bproto\b.*\bmessage\b/i],
  },
  {
    name: 'Auth',
    category: 'security',
    patterns: [/\bauth\b/i, /\bauthentication\b/i, /\bJWT\b/i, /\bOAuth\b/i, /\bOAuth2\b/i, /\bmagic.link\b/i, /\baccess.token\b/i],
  },
  {
    name: 'Vercel',
    category: 'platform',
    patterns: [/\bvercel\b/i, /\bvercel\.json\b/i],
  },
  {
    name: 'VSD',
    category: 'platform',
    patterns: [/\bVSD\b/, /\bvapi\b/i],
  },
  {
    name: 'Sentry',
    category: 'platform',
    patterns: [/\bsentry\b/i, /\berror tracking\b/i],
  },
  {
    name: 'Stripe',
    category: 'platform',
    patterns: [/\bstripe\b/i, /\bstripe\.js\b/i],
  },
  {
    name: 'WebSockets',
    category: 'backend',
    patterns: [/\bwebsocket\b/i, /\bwss?\b/i, /\bSSE\b/, /\bserver.sent events\b/i],
  },
  {
    name: 'Redis',
    category: 'database',
    patterns: [/\bredis\b/i, /\bioredis\b/i, /\bcache\b/i],
  },
  {
    name: 'CRDT',
    category: 'database',
    patterns: [/\bCRDT\b/i, /\bconflict-free\b/i, /\bmerge\b.*\bsemantics\b/i],
  },
  {
    name: 'Embeddings',
    category: 'ai',
    patterns: [/\bembedding\b/i, /\bvector\b/i, /\bvector database\b/i, /\bANN\b/i, /\bHNSW\b/i, /\bqdrant\b/i],
  },
  {
    name: 'LLM',
    category: 'ai',
    patterns: [/\bLLM\b/i, /\blarge language model\b/i, /\bgpt\b/i, /\bgemini\b/i, /\bclaude\b/i, /\btoken\b.*\bcount\b/i],
  },
  {
    name: 'Prompt Engineering',
    category: 'ai',
    patterns: [/\bprompt\b.*\bengineer\b/i, /\bsystem prompt\b/i, /\bfew.shot\b/i, /\bcontext window\b/i],
  },
  {
    name: 'VS Code',
    category: 'tooling',
    patterns: [/\bvs code\b/i, /\b\.vscode\b/i, /\bcommand palette\b/i],
  },
  {
    name: 'Testing',
    category: 'quality',
    patterns: [/\bvitest\b/i, /\bjest\b/i, /\bunit test\b/i, /\bintegration test\b/i, /\btest suite\b/i],
  },
  {
    name: 'TypeScript',
    category: 'language',
    patterns: [/\btype\b.*\berror\b/i, /\btype assertion\b/i, /\bcandidate\b.*\|\b.*\bhm\b/i],
  },
  {
    name: 'Web3',
    category: 'blockchain',
    patterns: [/\bsolidity\b/i, /\bsmart contract\b/i, /\bERC-20\b/i, /\bBase chain\b/i, /\bweb3\b/i],
  },
  {
    name: 'Wasmedge',
    category: 'systems',
    patterns: [/\bwasmedge\b/i, /\bWasm\b/i, /\bWebAssembly\b/i],
  },
  {
    name: 'Wati',
    category: 'platform',
    patterns: [/\bwati/i, /\bwhatsapp\b/i, /\bwatiService\b/i],
  },
];

export function runSkillExtraction(): { name: string; mentions: number }[] {
  const db = getDb();

  db.exec(`DELETE FROM skill_references`);
  db.exec(`DELETE FROM skills`);

  const messages = db
    .prepare('SELECT m.id, m.content, m.session_id, s.date as msg_date FROM chat_messages m JOIN chat_sessions s ON m.session_id = s.id')
    .all() as { id: number; content: string; session_id: string; msg_date: string }[];

  const results: { name: string; mentions: number }[] = [];

  for (const skill of SKILL_TAXONOMY) {
    let mentionCount = 0;
    const dates: string[] = [];

    for (const msg of messages) {
      for (const pattern of skill.patterns) {
        if (pattern.test(msg.content)) {
          mentionCount++;
          dates.push(msg.msg_date);
          break;
        }
      }
    }

    if (mentionCount === 0) continue;

    const sortedDates = dates.sort();
    const firstSeen = sortedDates[0];
    const lastSeen = sortedDates[sortedDates.length - 1];

    const skillInsert = db.prepare(
      'INSERT OR REPLACE INTO skills (name, category, first_seen_date, last_seen_date, mention_count) VALUES (?, ?, ?, ?, ?)'
    );
    skillInsert.run(skill.name, skill.category, firstSeen, lastSeen, mentionCount);

    results.push({ name: skill.name, mentions: mentionCount });
  }

  return results.sort((a, b) => b.mentions - a.mentions);
}
