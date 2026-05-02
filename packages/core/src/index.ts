/**
 * @phoenixaihub/agent-prov-core
 * Git-native provenance layer for AI-generated code
 */

export { ProvenanceStore, type ProvenanceRecord, type QueryFilter } from './storage.js';
export { ASTParser, type ASTFingerprint } from './ast-parser.js';
export { AIClassifier, type ClassificationResult, type StyleMetrics } from './classifier.js';
export { installHooks, generatePreCommitHook, generatePostCommitHook } from './hooks.js';
export { QueryEngine } from './query-engine.js';
export { scanFile, scanDirectory, type ScanResult } from './scanner.js';
