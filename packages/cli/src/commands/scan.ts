import { Command } from 'commander';
import { scanFile, scanDirectory, ProvenanceStore, ASTParser, AIClassifier } from '@phoenixaihub/agent-prov-core';
import { join, resolve } from 'node:path';

export function scanCommand(): Command {
  return new Command('scan')
    .description('Scan repo for AI-generated code, output per-file scores')
    .option('-f, --file <path>', 'Scan a single file')
    .option('-d, --dir <path>', 'Directory to scan', '.')
    .option('--commit <hash>', 'Associate with commit hash')
    .option('--model <name>', 'AI model used')
    .option('--verified <level>', 'Verification level', 'none')
    .option('--json', 'Output as JSON')
    .option('--save', 'Save results to provenance DB')
    .action(async (opts) => {
      try {
        const parser = new ASTParser();
        const classifier = new AIClassifier(parser);

        let results;
        if (opts.file) {
          const result = await scanFile(resolve(opts.file), parser, classifier);
          results = [result];
        } else {
          results = await scanDirectory(resolve(opts.dir), parser, classifier);
        }

        if (opts.save && opts.commit) {
          const dbPath = join(process.cwd(), '.agent-prov', 'provenance.db');
          const store = new ProvenanceStore(dbPath);
          for (const r of results) {
            store.insert({
              commit_hash: opts.commit,
              file_path: r.filePath,
              ai_generated_pct: r.classification.aiGeneratedPct,
              model_used: opts.model ?? null,
              verification_level: opts.verified ?? 'none',
              test_coverage_delta: null,
              fingerprint: r.fingerprint?.hash ?? null,
              style_metrics: JSON.stringify(r.classification.metrics),
            });
          }
          store.close();
          console.log(`💾 Saved ${results.length} records to provenance DB`);
        }

        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          console.log(`\n📊 Scan Results (${results.length} files)\n`);
          console.log('File'.padEnd(45) + 'AI %'.padEnd(8) + 'Confidence'.padEnd(12) + 'Signals');
          console.log('─'.repeat(90));
          for (const r of results) {
            const pct = `${r.classification.aiGeneratedPct}%`;
            const conf = `${(r.classification.confidence * 100).toFixed(0)}%`;
            const sigs = r.classification.signals.slice(0, 2).join(', ');
            console.log(
              r.filePath.padEnd(45) +
              pct.padEnd(8) +
              conf.padEnd(12) +
              sigs
            );
          }
        }
      } catch (err) {
        console.error(`❌ Scan failed:`, (err as Error).message);
        process.exit(1);
      }
    });
}
