# agent-prov

> Git-native provenance layer for AI-generated code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Know what's AI-generated. Know what's been reviewed. Know what to trust.**

agent-prov hooks into your git workflow to automatically track which code was AI-generated, classify existing code using stylometric heuristics, and surface unreviewed AI code in PRs.

## Features

- 🔍 **AI Code Detection** — Stylometric classifier using entropy analysis, naming patterns, AST structure, comment density, and repetitive pattern detection. No LLM required.
- 🪝 **Git Hooks** — Auto-tag commits with model used, verification level, and test coverage delta
- 🗄️ **Provenance Storage** — SQLite-backed records per file per commit
- 🔎 **Query Engine** — Filter by AI %, review status, model, date range
- 🏷️ **Trust Badges** — SVG badges showing AI % and review coverage
- 🐙 **GitHub Integration** — PR comments with per-file AI analysis, status checks

## Packages

| Package | Description |
|---------|-------------|
| [`@phoenixaihub/agent-prov-core`](./packages/core) | Core library: classifier, storage, hooks, scanner |
| [`@phoenixaihub/agent-prov-cli`](./packages/cli) | CLI tool for scanning, querying, reporting |
| [`@phoenixaihub/agent-prov-github`](./packages/github) | GitHub webhook handler for PR integration |

## Quick Start

```bash
# Install CLI globally
npm install -g @phoenixaihub/agent-prov-cli

# Initialize in your repo
cd your-project
agent-prov init

# Scan for AI-generated code
agent-prov scan

# Query results
agent-prov query --ai-generated --unreviewed

# Generate report
agent-prov report

# Generate trust badge
agent-prov badge
```

## How Detection Works

agent-prov uses **stylometric heuristics** — no AI/LLM calls needed. It analyzes:

| Signal | What It Measures | AI Pattern |
|--------|-----------------|------------|
| Shannon Entropy | Randomness in identifier names | Higher (4.0-4.8 range) |
| CamelCase Ratio | Naming convention consistency | Very consistent (>85%) |
| Identifier Length | Variable name length distribution | Uniform, moderate length |
| Comment Density | Ratio of comments to code | Higher, doc-style |
| AST Depth | Subtree depth variance | More uniform |
| Repetitive Patterns | Normalized line duplication | More repetitive |
| Line Length | Code width uniformity | More consistent |

Each signal contributes to a weighted score (0-100%) with confidence.

## Git Hooks

After `agent-prov init`, two hooks are installed:

**Pre-commit:** Captures staged files and any `AGENT_PROV_MODEL` environment variable.

```bash
# Tell agent-prov which model you used
AGENT_PROV_MODEL=claude-4 git commit -m "Add feature"
```

**Post-commit:** Runs the classifier on committed files and stores provenance records.

## GitHub Integration

Deploy the webhook handler to receive PR events:

```typescript
import { createWebhookApp } from '@phoenixaihub/agent-prov-github';

const app = createWebhookApp({
  secret: process.env.WEBHOOK_SECRET!,
  githubToken: process.env.GITHUB_TOKEN!,
});

export default app; // Deploy to Cloudflare Workers, Vercel, etc.
```

PRs get automatic comments showing:
- Per-file AI-generated percentage
- Review depth status
- Lines changed
- Trust indicators (🤖 >70% AI, 🔶 30-70%, 👤 <30%)

## CLI Reference

```
agent-prov init                          Install git hooks
agent-prov scan [--file <path>] [--json] Scan for AI-generated code
agent-prov query [--ai-generated]        Query provenance records
              [--unreviewed]
              [--model <name>]
              [--min-ai <pct>]
agent-prov report [--format json|md]     Generate provenance report
agent-prov badge [-o <path>]             Generate trust badge SVG
```

## Development

```bash
# Clone and install
git clone https://github.com/phoenix-assistant/agent-prov.git
cd agent-prov
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Architecture

```
.agent-prov/
  provenance.db        # SQLite database
.git/hooks/
  pre-commit           # Captures model info + staged files
  post-commit          # Runs classifier + stores records
```

## License

MIT © [Phoenix Assistant](https://github.com/phoenix-assistant)
