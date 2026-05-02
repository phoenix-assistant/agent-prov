import { ProvenanceStore, type ProvenanceRecord, type QueryFilter } from './storage.js';

export interface QueryResult {
  records: ProvenanceRecord[];
  summary: {
    totalFiles: number;
    avgAiPct: number;
    unreviewedCount: number;
    modelBreakdown: Record<string, number>;
  };
}

export class QueryEngine {
  private store: ProvenanceStore;

  constructor(store: ProvenanceStore) {
    this.store = store;
  }

  query(filter: QueryFilter): QueryResult {
    const records = this.store.query(filter);
    return {
      records,
      summary: this.summarize(records),
    };
  }

  getUnreviewed(minAiPct = 50): QueryResult {
    return this.query({ unreviewed: true, minAiPct });
  }

  getByModel(model: string): QueryResult {
    return this.query({ model });
  }

  getHighAiContent(threshold = 70): QueryResult {
    return this.query({ minAiPct: threshold });
  }

  private summarize(records: ProvenanceRecord[]): QueryResult['summary'] {
    const uniqueFiles = new Set(records.map(r => r.file_path));
    const totalAi = records.reduce((sum, r) => sum + r.ai_generated_pct, 0);
    const unreviewedCount = records.filter(r => r.verification_level === 'none').length;

    const modelBreakdown: Record<string, number> = {};
    for (const r of records) {
      const model = r.model_used ?? 'unknown';
      modelBreakdown[model] = (modelBreakdown[model] ?? 0) + 1;
    }

    return {
      totalFiles: uniqueFiles.size,
      avgAiPct: records.length > 0 ? Math.round((totalAi / records.length) * 10) / 10 : 0,
      unreviewedCount,
      modelBreakdown,
    };
  }
}
