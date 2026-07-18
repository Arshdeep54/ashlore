import { Command } from 'commander';
import { loadConfig } from '../core/config/loader';
import { getDb } from '../core/db/connection';
import { parserRegistry } from '../core/parsers/registry';
import '../core/parsers/kilo';
import '../core/parsers/codex';
import { ingestParser } from '../core/ingest/pipeline';

const program = new Command();

program
  .name('code-skills')
  .description('Personal Knowledge Graph — ingest AI chats and git history')
  .version('0.1.0');

program
  .command('ingest')
  .description('Run ingestion for data sources')
  .option('-s, --source <name>', 'source to ingest (kilo, codex, claude, all)')
  .option('--dry-run', 'parse but do not insert into database')
  .action(async (options) => {
    const config = loadConfig();
    getDb(config.database.path);

    const sources =
      options.source === 'all'
        ? parserRegistry.list()
        : options.source
          ? [options.source]
          : parserRegistry.list();

    for (const sourceName of sources) {
      const sourceConfig = config.sources[sourceName as keyof typeof config.sources];
      if (!sourceConfig) {
        continue;
      }

      if ('enabled' in sourceConfig && !sourceConfig.enabled) {
        continue;
      }

      const parser = parserRegistry.create(sourceName);

      const result = await ingestParser(parser, { dryRun: options.dryRun });

      if (options.dryRun) {
        console.log(`\n[${sourceName}] ${result.sessions} sessions, ${result.messages} messages`);
      } else {
        console.log(
          `\n[${sourceName}] ${result.sessions} sessions, ${result.messages} new messages, ${result.duplicates} duplicates skipped`
        );
      }
    }
  });

program
  .command('list-sources')
  .description('List all available data sources')
  .action(() => {
    const parsers = parserRegistry.list();
    console.log('Available sources:');
    for (const name of parsers) {
      console.log(`  - ${name}`);
    }
  });

program.parse();
