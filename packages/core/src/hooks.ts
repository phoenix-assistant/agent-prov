import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PRE_COMMIT_HOOK = `#!/bin/sh
# agent-prov pre-commit hook
# Tags staged files for provenance tracking

# Check if AGENT_PROV_MODEL is set (indicates AI-assisted commit)
if [ -n "$AGENT_PROV_MODEL" ]; then
  echo "[agent-prov] AI model detected: $AGENT_PROV_MODEL"
  git config --local agent-prov.pending-model "$AGENT_PROV_MODEL"
fi

# Check if AGENT_PROV_VERIFIED is set
if [ -n "$AGENT_PROV_VERIFIED" ]; then
  git config --local agent-prov.pending-verified "$AGENT_PROV_VERIFIED"
fi

# Store list of staged files for post-commit processing
git diff --cached --name-only --diff-filter=ACM > .agent-prov-staged
`;

const POST_COMMIT_HOOK = `#!/bin/sh
# agent-prov post-commit hook
# Records provenance data after commit

COMMIT_HASH=$(git rev-parse HEAD)
MODEL=$(git config --local --get agent-prov.pending-model 2>/dev/null || echo "")
VERIFIED=$(git config --local --get agent-prov.pending-verified 2>/dev/null || echo "none")

if [ -f .agent-prov-staged ]; then
  # Run provenance scan on committed files
  if command -v agent-prov >/dev/null 2>&1; then
    while IFS= read -r file; do
      if [ -f "$file" ]; then
        agent-prov scan --file "$file" --commit "$COMMIT_HASH" --model "$MODEL" --verified "$VERIFIED" 2>/dev/null || true
      fi
    done < .agent-prov-staged
  fi
  rm -f .agent-prov-staged
fi

# Clean up pending config
git config --local --unset agent-prov.pending-model 2>/dev/null || true
git config --local --unset agent-prov.pending-verified 2>/dev/null || true
`;

export function generatePreCommitHook(): string {
  return PRE_COMMIT_HOOK;
}

export function generatePostCommitHook(): string {
  return POST_COMMIT_HOOK;
}

export async function installHooks(repoPath: string): Promise<{ installed: string[] }> {
  const hooksDir = join(repoPath, '.git', 'hooks');
  await mkdir(hooksDir, { recursive: true });

  const hooks: Array<{ name: string; content: string }> = [
    { name: 'pre-commit', content: PRE_COMMIT_HOOK },
    { name: 'post-commit', content: POST_COMMIT_HOOK },
  ];

  const installed: string[] = [];

  for (const hook of hooks) {
    const hookPath = join(hooksDir, hook.name);
    await writeFile(hookPath, hook.content, { mode: 0o755 });
    installed.push(hook.name);
  }

  // Also create .agent-prov directory for DB
  await mkdir(join(repoPath, '.agent-prov'), { recursive: true });

  return { installed };
}
