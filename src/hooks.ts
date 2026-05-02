export function getHookScript(type: 'pre-commit' | 'post-commit'): string {
  if (type === 'pre-commit') {
    return `#!/bin/sh
# agent-prov pre-commit hook
# Detects AI model from environment and stages metadata

PROV_DIR=".agent-prov"
mkdir -p "$PROV_DIR"

MODEL="unknown"
if [ -n "$ANTHROPIC_API_KEY" ]; then MODEL="claude"; fi
if [ -n "$OPENAI_API_KEY" ]; then MODEL="gpt"; fi
if [ -n "$GOOGLE_API_KEY" ]; then MODEL="gemini"; fi
if [ -n "$COPILOT_TOKEN" ]; then MODEL="copilot"; fi

# Store pending metadata for post-commit
echo "$MODEL" > "$PROV_DIR/.pending-model"

# Check if tests exist and pass
VERIFICATION="unverified"
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  if npm test --silent 2>/dev/null; then
    VERIFICATION="tested"
  fi
elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
  if python -m pytest --quiet 2>/dev/null; then
    VERIFICATION="tested"
  fi
fi
echo "$VERIFICATION" > "$PROV_DIR/.pending-verification"
`;
  }

  return `#!/bin/sh
# agent-prov post-commit hook
# Records provenance metadata for the commit

PROV_DIR=".agent-prov"
HASH=$(git rev-parse HEAD)
TIMESTAMP=$(git log -1 --format=%aI)
FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\\n' ',')
MODEL="unknown"
VERIFICATION="unverified"

if [ -f "$PROV_DIR/.pending-model" ]; then
  MODEL=$(cat "$PROV_DIR/.pending-model")
  rm "$PROV_DIR/.pending-model"
fi

if [ -f "$PROV_DIR/.pending-verification" ]; then
  VERIFICATION=$(cat "$PROV_DIR/.pending-verification")
  rm "$PROV_DIR/.pending-verification"
fi

# Use node to insert into SQLite if available
if command -v node >/dev/null 2>&1; then
  node -e "
    import('better-sqlite3').then(m => {
      const db = new m.default('$PROV_DIR/provenance.db');
      db.exec(\\"CREATE TABLE IF NOT EXISTS commits (hash TEXT PRIMARY KEY, timestamp TEXT NOT NULL, model TEXT, verification TEXT NOT NULL DEFAULT 'unverified', test_coverage_delta REAL, files_changed TEXT NOT NULL DEFAULT '[]', ai_confidence REAL)\\");
      db.prepare('INSERT OR REPLACE INTO commits VALUES (?,?,?,?,?,?,?)').run('$HASH','$TIMESTAMP','$MODEL','$VERIFICATION',null,'$FILES',null);
      db.close();
    }).catch(() => {});
  " 2>/dev/null || true
fi
`;
}
