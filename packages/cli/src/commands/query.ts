import { Command } from 'commander';
import { ProvenanceStore, QueryEngine } from '@phoenixaihub/agent-prov-core';
import { join } from 'node:path';

export function queryCommand(): Command {
  return new Command('query')
    .description('Query provenance records')
    .option('--ai-generated', 'Filter for AI-generated code (>50%)')
    .option('--unreviewed', 'Filter for unreviewed code')
    .option('--model <name>', 'Filter by model')
    .option('--min-ai <pct>', 'Minimum AI percentage', parseFloat)
    .option('--file <path>', 'Filter by file path')
    .option('--from <date>', 'From date (YYYY-MM-DD)')
    .option('--to <date>', 'To date (YYYY-MM-DD)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const dbPath = join(process.cwd(), '.agent-prov', 'provenance.db');
        const store = new ProvenanceStore(dbPath);
        const engine = new QueryEngine(store);

        const result = engine.query({
          minAiPct: opts.aiGenerated ? 50 : opts.minAi,
          unreviewed: opts.unreviewed,
          model: opts.model,
          filePath: opts.file,
          fromDate: opts.from,
          toDate: opts.to,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n📋 Query Results\n`);
          console.log(`Total files: ${result.summary.totalFiles}`);
          console.log(`Avg AI %: ${result.summary.avgAiPct}%`);
          console.log(`Unreviewed: ${result.summary.unreviewedCount}`);
          console.log(`Models: ${JSON.stringify(result.summary.modelBreakdown)}`);
          console.log('\n' + 'File'.padEnd(40) + 'AI %'.padEnd(8) + 'Status'.padEnd(12) + 'Model');
          console.log('─'.repeat(80));
          for (const r of result.records) {
            console.log(
              r.file_path.padEnd(40) +
              `${r.ai_generated_pct}%`.padEnd(8) +
              r.verification_level.padEnd(12) +
              (r.model_used ?? 'unknown')
            );
          }
        }

        store.close();
      } catch (err) {
        console.error(`❌ Query failed:`, (err as Error).message);
        process.exit(1);
      }
    });
}
