import { describe, it, expect } from 'vitest';
import { QueryEngine } from '../src/query-engine.js';
import { ProvenanceStore } from '../src/storage.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('QueryEngine', () => {
  it('summarizes query results', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'qe-test-'));
    const store = new ProvenanceStore(join(tmpDir, 'test.db'));

    store.insertMany([
      { commit_hash: 'c1', file_path: 'a.ts', ai_generated_pct: 90, model_used: 'gpt-4', verification_level: 'none', test_coverage_delta: null, fingerprint: null, style_metrics: null },
      { commit_hash: 'c1', file_path: 'b.ts', ai_generated_pct: 20, model_used: 'claude', verification_level: 'reviewed', test_coverage_delta: null, fingerprint: null, style_metrics: null },
      { commit_hash: 'c2', file_path: 'c.ts', ai_generated_pct: 60, model_used: 'gpt-4', verification_level: 'none', test_coverage_delta: null, fingerprint: null, style_metrics: null },
    ]);

    const engine = new QueryEngine(store);
    const result = engine.getUnreviewed(50);

    expect(result.records).toHaveLength(2);
    expect(result.summary.unreviewedCount).toBe(2);
    expect(result.summary.modelBreakdown['gpt-4']).toBe(2);

    store.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });
});
