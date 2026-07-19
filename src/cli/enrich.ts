import { getDb } from '../core/db/connection';
import { runSkillExtraction } from '../core/enrich/skills';
import { extractCodeSnippets } from '../core/enrich/code';
import { extractLinks } from '../core/enrich/links';

getDb();

const skills = runSkillExtraction();
console.log(`Skills: ${skills.length} detected`);
for (const s of skills.slice(0, 10)) {
  console.log(`  ${s.name}: ${s.mentions} mentions`);
}

const codeCount = extractCodeSnippets();
console.log(`\nCode snippets: ${codeCount} extracted`);

const linkCount = extractLinks();
console.log(`Links: ${linkCount} extracted`);
