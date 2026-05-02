import { describe, it, expect } from 'vitest';
import { createWebhookApp } from '../src/webhook.js';

describe('Webhook App', () => {
  it('creates a Hono app', () => {
    const app = createWebhookApp({
      secret: 'test-secret',
      githubToken: 'test-token',
    });
    expect(app).toBeDefined();
  });

  it('responds to health check', async () => {
    const app = createWebhookApp({
      secret: 'test-secret',
      githubToken: 'test-token',
    });

    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
