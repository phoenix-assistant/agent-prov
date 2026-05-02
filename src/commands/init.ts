import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getHookScript } from '../hooks.js';
import { AgentProvDB } from '../db.js';

export async function initCommand(): Promise<void> {
  // Find git root
  let gitRoot: string;
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Error: not a git repository');
    process.exit(1);
  }

  // Initialize DB
  const db = new AgentProvDB(gitRoot);
  db.close();

  // Install hooks
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  for (const hook of ['pre-commit', 'post-commit'] as const) {
    const hookPath = path.join(hooksDir, hook);
    const script = getHookScript(hook);

    // Back up existing hook
    if (fs.existsSync(hookPath)) {
      fs.copyFileSync(hookPath, hookPath + '.backup');
      console.log(`  Backed up existing ${hook} hook`);
    }

    fs.writeFileSync(hookPath, script, { mode: 0o755 });
    console.log(`  Installed ${hook} hook`);
  }

  // Add .agent-prov to .gitignore if not already there
  const gitignorePath = path.join(gitRoot, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';
  if (!gitignore.includes('.agent-prov')) {
    fs.appendFileSync(gitignorePath, '\n.agent-prov/\n');
    console.log('  Added .agent-prov/ to .gitignore');
  }

  console.log('\n✓ agent-prov initialized');
}
