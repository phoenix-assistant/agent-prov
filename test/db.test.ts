import { describe, it, expect, afterEach } from 'vitest';
import { AgentProvDB } from '../src/db.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('AgentProvDB', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-prov-test-'));
    tmpDirs.push(d);
    return d;
  }

  afterEach(() => {
    for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
    tmpDirs.length = 0;
  });

  it('creates DB and tables', () => {
    const dir = makeTmpDir();
    const db = new AgentProvDB(dir);
    expect(fs.existsSync(path.join(dir, '.agent-prov', 'provenance.db'))).toBe(true);
    db.close();
  });

  it('inserts and retrieves commits', () => {
    const dir = makeTmpDir();
    const db = new AgentProvDB(dir);
    db.insertCommit({
      hash: 'abc123',
      timestamp: '2026-01-01T00:00:00Z',
      model: 'claude',
      verification: 'tested',
      test_coverage_delta: 5.2,
      files_changed: 'src/index.ts',
      ai_confidence: 0.9,
    });
    const commits = db.getCommits();
    expect(commits).toHaveLength(1);
    expect(commits[0].model).toBe('claude');
    expect(commits[0].verification).toBe('tested');
    db.close();
  });

  it('filters by unreviewed', () => {
    const dir = makeTmpDir();
    const db = new AgentProvDB(dir);
    db.insertCommit({ hash: 'a1', timestamp: '2026-01-01T00:00:00Z', model: 'gpt', verification: 'unverified', test_coverage_delta: null, files_changed: '', ai_confidence: 0.8 });
    db.insertCommit({ hash: 'a2', timestamp: '2026-01-01T00:00:00Z', model: 'claude', verification: 'tested', test_coverage_delta: null, files_changed: '', ai_confidence: 0.9 });
    expect(db.getCommits({ unreviewed: true })).toHaveLength(1);
    expect(db.getCommits({ aiGenerated: true })).toHaveLength(2);
    db.close();
  });

  it('inserts and retrieves scans', () => {
    const dir = makeTmpDir();
    const db = new AgentProvDB(dir);
    db.insertScan('src/foo.ts', 0.85, { verboseNames: 0.9 }, 'abc123');
    const scans = db.getScans('src/foo.ts');
    expect(scans).toHaveLength(1);
    expect(scans[0].ai_score).toBe(0.85);
    db.close();
  });

  it('returns correct stats', () => {
    const dir = makeTmpDir();
    const db = new AgentProvDB(dir);
    db.insertCommit({ hash: 'b1', timestamp: '2026-01-01T00:00:00Z', model: 'claude', verification: 'unverified', test_coverage_delta: null, files_changed: '', ai_confidence: 0.9 });
    db.insertCommit({ hash: 'b2', timestamp: '2026-01-01T00:00:00Z', model: 'gpt', verification: 'tested', test_coverage_delta: null, files_changed: '', ai_confidence: 0.3 });
    const stats = db.getStats();
    expect(stats.totalCommits).toBe(2);
    expect(stats.aiCommits).toBe(1);
    expect(stats.unreviewed).toBe(1);
    expect(stats.models).toContain('claude');
    expect(stats.models).toContain('gpt');
    db.close();
  });
});
