# agent-prov

Git-native provenance layer for AI-generated code. Track which commits were AI-generated, detect AI code patterns via heuristics, and maintain a trust audit trail.

## The Problem

AI is writing more code than ever. But most teams have zero visibility into:
- Which code was AI-generated vs human-written
- Whether AI-generated code was reviewed or tested
- Which AI model produced what
- The overall "trust posture" of a codebase

`agent-prov` solves this with git hooks, heuristic detection, and a local provenance database.

## Install

```bash
npm install -g @phoenixaihub/agent-prov
```

## Usage

### Initialize in a repo

```bash
cd your-repo
agent-prov init
```

This installs git hooks and creates a `.agent-prov/` directory (auto-added to `.gitignore`).

### Scan for AI-generated code

```bash
agent-prov scan
agent-prov scan --path src/
```

Analyzes files using heuristic patterns:
- Overly verbose variable names
- Repetitive error handling
- Import clustering patterns
- Comment density anomalies

### Query provenance data

```bash
agent-prov query --ai-generated --unreviewed  # Find risky code
agent-prov query --model claude                # Filter by model
```

### Generate report

```bash
agent-prov report
agent-prov report -o provenance-report.md
```

### Generate trust badge

```bash
agent-prov badge
agent-prov badge -o badge.svg
```

## How It Works

### Git Hooks

**Pre-commit:** Detects the AI model from environment variables (e.g., `ANTHROPIC_API_KEY` → Claude) and runs tests if available.

**Post-commit:** Records provenance metadata (model, verification status, files changed) into a local SQLite database.

### AI Detection Heuristics

The scanner uses pattern-based heuristics (no ML model required):

| Signal | Weight | What it detects |
|--------|--------|-----------------|
| Verbose names | 25% | `userAuthenticationTokenValidationResult` |
| Error handling | 30% | Repetitive try/catch patterns |
| Import clustering | 15% | Alphabetically sorted, tightly clustered imports |
| Comment density | 30% | Over-commented code (>30% comment lines) |

### Architecture

```
agent-prov init
  └─ installs .git/hooks/{pre,post}-commit
  └─ creates .agent-prov/provenance.db (SQLite)

on commit:
  pre-commit → detect model, run tests
  post-commit → record metadata to SQLite

agent-prov scan
  └─ walks repo files
  └─ scores each file with heuristic analyzer
  └─ stores results in provenance.db

agent-prov query/report/badge
  └─ reads from provenance.db
  └─ outputs filtered views
```

### Storage

All metadata lives in `.agent-prov/provenance.db` (SQLite):

- **commits** — hash, timestamp, model, verification level, files, AI confidence
- **file_scans** — filepath, AI score, signal breakdown, scan timestamp

## Supported Languages

File scanning works for: TypeScript, JavaScript, Python (`.ts`, `.js`, `.tsx`, `.jsx`, `.py`, `.mjs`, `.cjs`)

## License

MIT
