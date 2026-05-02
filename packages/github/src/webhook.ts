import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { renderPRComment, type PRCommentData } from './renderer.js';
import { createStatusCheck } from './status.js';

export interface WebhookConfig {
  secret: string;
  githubToken: string;
  onPRAnalysis?: (data: PRCommentData) => Promise<void>;
}

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  patch?: string;
}

export function createWebhookApp(config: WebhookConfig): Hono {
  const app = new Hono();

  app.post('/webhook', async (c) => {
    const body = await c.req.text();

    // Verify signature
    const signature = c.req.header('x-hub-signature-256');
    if (signature && !verifySignature(body, signature, config.secret)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = c.req.header('x-github-event');
    const payload = JSON.parse(body);

    if (event === 'pull_request' && ['opened', 'synchronize'].includes(payload.action)) {
      await handlePullRequest(payload, config);
    }

    return c.json({ ok: true });
  });

  app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

  return app;
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function handlePullRequest(payload: any, config: WebhookConfig): Promise<void> {
  const { pull_request: pr, repository } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;
  const prNumber = pr.number;

  // Fetch PR files
  const filesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    { headers: { Authorization: `Bearer ${config.githubToken}`, Accept: 'application/vnd.github.v3+json' } }
  );
  const files: PRFile[] = await filesRes.json() as PRFile[];

  // Build analysis data (placeholder — real analysis requires cloning)
  const fileAnalysis = files
    .filter(f => /\.(ts|js|tsx|jsx|py)$/.test(f.filename))
    .map(f => ({
      path: f.filename,
      aiGeneratedPct: 0, // Would run classifier on actual content
      reviewDepth: 'none' as const,
      linesChanged: f.additions,
    }));

  const commentData: PRCommentData = {
    files: fileAnalysis,
    totalFiles: fileAnalysis.length,
    avgAiPct: 0,
    commitHash: pr.head.sha,
  };

  if (config.onPRAnalysis) {
    await config.onPRAnalysis(commentData);
  }

  // Post PR comment
  const commentBody = renderPRComment(commentData);
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.githubToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody }),
    }
  );

  // Create status check
  await createStatusCheck({
    owner, repo,
    sha: pr.head.sha,
    token: config.githubToken,
    aiPct: commentData.avgAiPct,
    unreviewedCount: fileAnalysis.filter(f => f.reviewDepth === 'none').length,
  });
}
