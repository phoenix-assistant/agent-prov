import Database from 'better-sqlite3';
import { join } from 'node:path';

export interface ProvenanceRecord {
  id?: number;
  commit_hash: string;
  file_path: string;
  ai_generated_pct: number;
  model_used: string | null;
  verification_level: 'none' | 'reviewed' | 'tested' | 'verified';
  test_coverage_delta: number | null;
  fingerprint: string | null;
  style_metrics: string | null; // JSON
  created_at?: string;
}

export interface QueryFilter {
  minAiPct?: number;
  maxAiPct?: number;
  verificationLevel?: ProvenanceRecord['verification_level'];
  model?: string;
  filePath?: string;
  commitHash?: string;
  fromDate?: string;
  toDate?: string;
  unreviewed?: boolean;
}

export class ProvenanceStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath ?? join(process.cwd(), '.agent-prov', 'provenance.db');
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS provenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_hash TEXT NOT NULL,
        file_path TEXT NOT NULL,
        ai_generated_pct REAL NOT NULL DEFAULT 0,
        model_used TEXT,
        verification_level TEXT NOT NULL DEFAULT 'none',
        test_coverage_delta REAL,
        fingerprint TEXT,
        style_metrics TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(commit_hash, file_path)
      );
      CREATE INDEX IF NOT EXISTS idx_prov_commit ON provenance(commit_hash);
      CREATE INDEX IF NOT EXISTS idx_prov_file ON provenance(file_path);
      CREATE INDEX IF NOT EXISTS idx_prov_ai_pct ON provenance(ai_generated_pct);
    `);
  }

  insert(record: Omit<ProvenanceRecord, 'id' | 'created_at'>): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO provenance
        (commit_hash, file_path, ai_generated_pct, model_used, verification_level, test_coverage_delta, fingerprint, style_metrics)
      VALUES
        (@commit_hash, @file_path, @ai_generated_pct, @model_used, @verification_level, @test_coverage_delta, @fingerprint, @style_metrics)
    `);
    const result = stmt.run(record);
    return Number(result.lastInsertRowid);
  }

  insertMany(records: Omit<ProvenanceRecord, 'id' | 'created_at'>[]): void {
    const tx = this.db.transaction((recs: typeof records) => {
      for (const r of recs) this.insert(r);
    });
    tx(records);
  }

  query(filter: QueryFilter): ProvenanceRecord[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (filter.minAiPct !== undefined) {
      conditions.push('ai_generated_pct >= @minAiPct');
      params.minAiPct = filter.minAiPct;
    }
    if (filter.maxAiPct !== undefined) {
      conditions.push('ai_generated_pct <= @maxAiPct');
      params.maxAiPct = filter.maxAiPct;
    }
    if (filter.verificationLevel) {
      conditions.push('verification_level = @verificationLevel');
      params.verificationLevel = filter.verificationLevel;
    }
    if (filter.unreviewed) {
      conditions.push("verification_level = 'none'");
    }
    if (filter.model) {
      conditions.push('model_used = @model');
      params.model = filter.model;
    }
    if (filter.filePath) {
      conditions.push('file_path LIKE @filePath');
      params.filePath = `%${filter.filePath}%`;
    }
    if (filter.commitHash) {
      conditions.push('commit_hash = @commitHash');
      params.commitHash = filter.commitHash;
    }
    if (filter.fromDate) {
      conditions.push('created_at >= @fromDate');
      params.fromDate = filter.fromDate;
    }
    if (filter.toDate) {
      conditions.push('created_at <= @toDate');
      params.toDate = filter.toDate;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM provenance ${where} ORDER BY created_at DESC`;
    return this.db.prepare(sql).all(params) as ProvenanceRecord[];
  }

  getByCommit(commitHash: string): ProvenanceRecord[] {
    return this.db.prepare('SELECT * FROM provenance WHERE commit_hash = ?').all(commitHash) as ProvenanceRecord[];
  }

  getByFile(filePath: string): ProvenanceRecord[] {
    return this.db.prepare('SELECT * FROM provenance WHERE file_path = ? ORDER BY created_at DESC').all(filePath) as ProvenanceRecord[];
  }

  getLatestByFile(filePath: string): ProvenanceRecord | undefined {
    return this.db.prepare('SELECT * FROM provenance WHERE file_path = ? ORDER BY created_at DESC LIMIT 1').get(filePath) as ProvenanceRecord | undefined;
  }

  close(): void {
    this.db.close();
  }
}
