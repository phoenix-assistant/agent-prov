import { Command } from 'commander';
import { ProvenanceStore, QueryEngine } from '@phoenixaihub/agent-prov-core';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function reportCommand(): Command {
  return new Command('report')
    .description('Generate provenance report (JSON + markdown)')
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--format <type>', 'Output format: json, markdown, both', 'both')
    .action(async (opts) => {
      try {
        const dbPath = join(process.cwd(), '.agent-prov', 'provenance.db');
        const store = new ProvenanceStore(dbPath);
        const engine = new QueryEngine(store);

        const all = engine.query({});
        const unreviewed = engine.getUnreviewed();
        const highAi = engine.getHighAiContent(70);

        const report = {
          generated: new Date().toISOString(),
          summary: all.summary,
          unreviewed: unreviewed.summary,
          highAiContent: highAi.summary,
          records: all.records,
        };

        if (opts.format === 'json' || opts.format === 'both') {
          const jsonPath = join(opts.output, 'provenance-report.json');
          await writeFile(jsonPath, JSON.stringify(report, null, 2));
          console.log(`📄 JSON report: ${jsonPath}`);
        }

        if (opts.format === 'markdown' || opts.format === 'both') {
          const md = generateMarkdown(report);
          const mdPath = join(opts.output, 'provenance-report.md');
          await writeFile(mdPath, md);
          console.log(`📝 Markdown report: ${mdPath}`);
        }

        store.close();
      } catch (err) {
        console.error(`❌ Report failed:`, (err as Error).message);
        process.exit(1);
      }
    });
}

function generateMarkdown(report: any): string {
  const lines: string[] = [
    '# Agent Provenance Report',
    '',
    `Generated: ${report.generated}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Files | ${report.summary.totalFiles} |`,
    `| Avg AI-Generated | ${report.summary.avgAiPct}% |`,
    `| Unreviewed Files | ${report.summary.unreviewedCount} |`,
    '',
    '## Model Breakdown',
    '',
    '| Model | Files |',
    '|-------|-------|',
  ];

  for (const [model, count] of Object.entries(report.summary.modelBreakdown)) {
    lines.push(`| ${model} | ${count} |`);
  }

  lines.push('', '## Files', '', '| File | AI % | Status | Model |', '|------|------|--------|-------|');

  for (const r of report.records) {
    lines.push(`| ${r.file_path} | ${r.ai_generated_pct}% | ${r.verification_level} | ${r.model_used ?? '-'} |`);
  }

  if (report.unreviewed.unreviewedCount > 0) {
    lines.push('', '## ⚠️ Unreviewed AI Code', '', `${report.unreviewed.unreviewedCount} files with >50% AI-generated code have not been reviewed.`);
  }

  return lines.join('\n');
}
