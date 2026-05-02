import { Command } from 'commander';
import { installHooks } from '@phoenixaihub/agent-prov-core';

export function initCommand(): Command {
  return new Command('init')
    .description('Install agent-prov git hooks into current repo')
    .option('-p, --path <path>', 'Repository path', process.cwd())
    .action(async (opts) => {
      try {
        const result = await installHooks(opts.path);
        console.log(`✅ Installed hooks: ${result.installed.join(', ')}`);
        console.log(`📁 Created .agent-prov/ directory for provenance data`);
      } catch (err) {
        console.error(`❌ Failed to install hooks:`, (err as Error).message);
        process.exit(1);
      }
    });
}
