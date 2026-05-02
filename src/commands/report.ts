import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { AgentProvDB } from '../db.js';

export async function reportCommand(opts: { output?: string }): Promise<void> {
  let gitRoot: string;
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Error: not a git repository');
    process.exit(1);
  }

  const db = new AgentProvDB(gitRoot);
  const stats = db.getStats();
  const commits = db.getCommits();
  const scans = db.getScans();

  const report = `# Agent Provenance Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total tracked commits | ${stats.totalCommits} |
| AI-generated commits | ${stats.aiCommits} |
| Unreviewed commits | ${stats.unreviewed} |
| Models detected | ${stats.models.join(', ') || 'none'} |
| Files scanned | ${scans.length} |
| AI-likely files | ${scans.filter(s => s.ai_score > 0.5).length} |

## Recent Commits

${commits.slice(0, 20).map(c => `- \`${c.hash.slice(0, 8)}\` ${c.model ?? 'unknown'} (${c.verification}) — ${c.timestamp}`).join('\n')}

## High-Risk Files

${scans.filter(s => s.ai_score > 0.5).map(s => `- **${s.filepath}** — AI score: ${s.ai_score.toFixed(2)}`).join('\n') || 'None detected'}
`;

  if (opts.output) {
    fs.writeFileSync(opts.output, report);
    console.log(`Report written to ${opts.output}`);
  } else {
    console.log(report);
  }

  db.close();
}
