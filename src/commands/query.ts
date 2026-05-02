import { execSync } from 'node:child_process';
import { AgentProvDB } from '../db.js';

export async function queryCommand(opts: { aiGenerated?: boolean; unreviewed?: boolean; model?: string }): Promise<void> {
  let gitRoot: string;
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Error: not a git repository');
    process.exit(1);
  }

  const db = new AgentProvDB(gitRoot);
  const commits = db.getCommits({
    aiGenerated: opts.aiGenerated,
    unreviewed: opts.unreviewed,
    model: opts.model,
  });

  if (commits.length === 0) {
    console.log('No matching commits found.');
    db.close();
    return;
  }

  console.log(`Found ${commits.length} commits:\n`);
  for (const c of commits) {
    const status = c.verification === 'tested' ? '✅' : c.verification === 'reviewed' ? '👀' : '⚠️';
    console.log(`  ${status} ${c.hash.slice(0, 8)} | ${c.model ?? 'unknown'} | ${c.verification} | ${c.timestamp}`);
    if (c.files_changed) {
      const files = c.files_changed.split(',').filter(Boolean).slice(0, 5);
      if (files.length) console.log(`     files: ${files.join(', ')}`);
    }
  }

  db.close();
}
