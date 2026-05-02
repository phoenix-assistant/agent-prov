import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export interface CommitRecord {
  hash: string;
  timestamp: string;
  model: string | null;
  verification: 'tested' | 'reviewed' | 'unverified';
  test_coverage_delta: number | null;
  files_changed: string;
  ai_confidence: number | null;
}

export class AgentProvDB {
  private db: Database.Database;

  constructor(repoRoot: string) {
    const dir = path.join(repoRoot, '.agent-prov');
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(path.join(dir, 'provenance.db'));
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commits (
        hash TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        model TEXT,
        verification TEXT NOT NULL DEFAULT 'unverified',
        test_coverage_delta REAL,
        files_changed TEXT NOT NULL DEFAULT '[]',
        ai_confidence REAL
      );
      CREATE TABLE IF NOT EXISTS file_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filepath TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        ai_score REAL NOT NULL,
        signals TEXT NOT NULL DEFAULT '{}',
        commit_hash TEXT
      );
    `);
  }

  insertCommit(record: CommitRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO commits (hash, timestamp, model, verification, test_coverage_delta, files_changed, ai_confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(record.hash, record.timestamp, record.model, record.verification, record.test_coverage_delta, record.files_changed, record.ai_confidence);
  }

  insertScan(filepath: string, aiScore: number, signals: object, commitHash?: string): void {
    this.db.prepare(`
      INSERT INTO file_scans (filepath, scanned_at, ai_score, signals, commit_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(filepath, new Date().toISOString(), aiScore, JSON.stringify(signals), commitHash ?? null);
  }

  getCommits(filter?: { model?: string; unreviewed?: boolean; aiGenerated?: boolean }): CommitRecord[] {
    let sql = 'SELECT * FROM commits WHERE 1=1';
    const params: unknown[] = [];
    if (filter?.model) { sql += ' AND model = ?'; params.push(filter.model); }
    if (filter?.unreviewed) { sql += " AND verification = 'unverified'"; }
    if (filter?.aiGenerated) { sql += ' AND ai_confidence > 0.5'; }
    sql += ' ORDER BY timestamp DESC';
    return this.db.prepare(sql).all(...params) as CommitRecord[];
  }

  getScans(filepath?: string): Array<{ filepath: string; ai_score: number; signals: string; scanned_at: string }> {
    if (filepath) {
      return this.db.prepare('SELECT * FROM file_scans WHERE filepath = ? ORDER BY scanned_at DESC').all(filepath) as any[];
    }
    return this.db.prepare('SELECT * FROM file_scans ORDER BY scanned_at DESC').all() as any[];
  }

  getStats(): { totalCommits: number; aiCommits: number; unreviewed: number; models: string[] } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM commits').get() as any).c;
    const ai = (this.db.prepare('SELECT COUNT(*) as c FROM commits WHERE ai_confidence > 0.5').get() as any).c;
    const unrev = (this.db.prepare("SELECT COUNT(*) as c FROM commits WHERE verification = 'unverified'").get() as any).c;
    const models = (this.db.prepare('SELECT DISTINCT model FROM commits WHERE model IS NOT NULL').all() as any[]).map(r => r.model);
    return { totalCommits: total, aiCommits: ai, unreviewed: unrev, models };
  }

  close(): void {
    this.db.close();
  }
}
