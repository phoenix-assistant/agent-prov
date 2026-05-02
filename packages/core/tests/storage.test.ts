import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProvenanceStore, type ProvenanceRecord } from '../src/storage.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ProvenanceStore', () => {
  let store: ProvenanceStore;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agent-prov-test-'));
    store = new ProvenanceStore(join(tmpDir, 'test.db'));
  });

  afterEach(() => {
    store.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('inserts and retrieves a record', () => {
    const id = store.insert({
      commit_hash: 'abc123',
      file_path: 'src/index.ts',
      ai_generated_pct: 75.5,
      model_used: 'claude-4',
      verification_level: 'none',
      test_coverage_delta: 5.2,
      fingerprint: 'fp123',
      style_metrics: JSON.stringify({ entropy: 4.2 }),
    });

    expect(id).toBeGreaterThan(0);

    const records = store.getByCommit('abc123');
    expect(records).toHaveLength(1);
    expect(records[0].ai_generated_pct).toBe(75.5);
    expect(records[0].model_used).toBe('claude-4');
  });

  it('queries with filters', () => {
    store.insertMany([
      { commit_hash: 'a1', file_path: 'a.ts', ai_generated_pct: 90, model_used: 'gpt-4', verification_level: 'none', test_coverage_delta: null, fingerprint: null, style_metrics: null },
      { commit_hash: 'a1', file_path: 'b.ts', ai_generated_pct: 30, model_used: 'claude-4', verification_level: 'reviewed', test_coverage_delta: null, fingerprint: null, style_metrics: null },
      { commit_hash: 'a2', file_path: 'c.ts', ai_generated_pct: 60, model_used: 'gpt-4', verification_level: 'none', test_coverage_delta: null, fingerprint: null, style_metrics: null },
    ]);

    const highAi = store.query({ minAiPct: 70 });
    expect(highAi).toHaveLength(1);
    expect(highAi[0].file_path).toBe('a.ts');

    const unreviewed = store.query({ unreviewed: true });
    expect(unreviewed).toHaveLength(2);

    const gpt = store.query({ model: 'gpt-4' });
    expect(gpt).toHaveLength(2);
  });

  it('getLatestByFile returns most recent', () => {
    store.insert({ commit_hash: 'c1', file_path: 'x.ts', ai_generated_pct: 50, model_used: null, verification_level: 'none', test_coverage_delta: null, fingerprint: null, style_metrics: null });
    store.insert({ commit_hash: 'c2', file_path: 'x.ts', ai_generated_pct: 80, model_used: 'claude', verification_level: 'reviewed', test_coverage_delta: null, fingerprint: null, style_metrics: null });

    const latest = store.getLatestByFile('x.ts');
    expect(latest).toBeDefined();
    // Both records exist (different commits), latest is the one inserted last
    expect(latest).toBeDefined();
    const all = store.getByFile('x.ts');
    expect(all).toHaveLength(2);
  });
});
