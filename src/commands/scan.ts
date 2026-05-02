import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { analyzeFile } from '../detector/ai-patterns.js';
import { AgentProvDB } from '../db.js';

const SCANNABLE = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.mjs', '.cjs']);

export async function scanCommand(opts: { path: string }): Promise<void> {
  let gitRoot: string;
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Error: not a git repository');
    process.exit(1);
  }

  const scanPath = path.resolve(opts.path);
  const db = new AgentProvDB(gitRoot);
  const files = collectFiles(scanPath);
  let aiCount = 0;

  console.log(`Scanning ${files.length} files...\n`);

  for (const file of files) {
    const signals = analyzeFile(file);
    const rel = path.relative(gitRoot, file);
    db.insertScan(rel, signals.overallScore, signals);

    if (signals.overallScore > 0.5) {
      aiCount++;
      console.log(`  🤖 ${rel} (score: ${signals.overallScore.toFixed(2)})`);
      if (signals.verboseNames > 0.5) console.log(`     ├─ verbose names: ${signals.verboseNames.toFixed(2)}`);
      if (signals.repetitiveErrorHandling > 0.5) console.log(`     ├─ repetitive errors: ${signals.repetitiveErrorHandling.toFixed(2)}`);
      if (signals.commentDensity > 0.5) console.log(`     └─ comment density: ${signals.commentDensity.toFixed(2)}`);
    }
  }

  console.log(`\n✓ Scanned ${files.length} files, ${aiCount} likely AI-generated`);
  db.close();
}

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.statSync(dir).isDirectory()) {
    if (SCANNABLE.has(path.extname(dir))) return [dir];
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (SCANNABLE.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}
