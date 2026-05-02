import fs from 'node:fs';

export interface AiSignals {
  verboseNames: number;
  repetitiveErrorHandling: number;
  importClustering: number;
  commentDensity: number;
  overallScore: number;
}

// Heuristic AI code detector — no tree-sitter dependency for portability
// Uses pattern matching on source text

export function analyzeFile(filePath: string): AiSignals {
  const content = fs.readFileSync(filePath, 'utf-8');
  return analyzeSource(content, filePath);
}

export function analyzeSource(content: string, filePath?: string): AiSignals {
  const lines = content.split('\n');
  if (lines.length < 3) return { verboseNames: 0, repetitiveErrorHandling: 0, importClustering: 0, commentDensity: 0, overallScore: 0 };

  const verboseNames = scoreVerboseNames(content);
  const repetitiveErrorHandling = scoreRepetitiveErrors(content);
  const importClustering = scoreImportClustering(lines);
  const commentDensity = scoreCommentDensity(lines);

  const overallScore = Math.min(1, (
    verboseNames * 0.25 +
    repetitiveErrorHandling * 0.30 +
    importClustering * 0.15 +
    commentDensity * 0.30
  ));

  return { verboseNames, repetitiveErrorHandling, importClustering, commentDensity, overallScore };
}

function scoreVerboseNames(content: string): number {
  // AI tends to use very descriptive variable names
  const identifiers = content.match(/(?:const|let|var|function)\s+([a-zA-Z_]\w*)/g) ?? [];
  if (identifiers.length === 0) return 0;
  const longNames = identifiers.filter(id => {
    const name = id.replace(/^(?:const|let|var|function)\s+/, '');
    return name.length > 25 || (name.match(/_/g)?.length ?? 0) > 3 || countCamelSegments(name) > 4;
  });
  return Math.min(1, longNames.length / Math.max(identifiers.length, 1) * 3);
}

function countCamelSegments(name: string): number {
  return name.split(/(?=[A-Z])/).length;
}

function scoreRepetitiveErrors(content: string): number {
  // AI code often has repetitive try/catch or if-error patterns
  const tryCatches = (content.match(/try\s*\{/g) ?? []).length;
  const ifErrors = (content.match(/if\s*\(\s*(?:err|error|e)\s*\)/g) ?? []).length;
  const throwNews = (content.match(/throw new (?:Error|TypeError|RangeError)/g) ?? []).length;
  const lines = content.split('\n').length;
  const ratio = (tryCatches + ifErrors + throwNews) / Math.max(lines, 1);
  return Math.min(1, ratio * 20);
}

function scoreImportClustering(lines: string[]): number {
  // AI tends to dump all imports at the top in alphabetical order
  const importLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^(?:import |const .+ = require|from )/)) {
      importLines.push(i);
    }
  }
  if (importLines.length < 5) return 0;

  // Check if imports are perfectly clustered (no gaps) and sorted
  let clustered = true;
  for (let i = 1; i < importLines.length; i++) {
    if (importLines[i] - importLines[i - 1] > 2) { clustered = false; break; }
  }

  // Check alphabetical
  const importTexts = importLines.map(i => lines[i]);
  const sorted = [...importTexts].sort();
  const isSorted = importTexts.every((v, i) => v === sorted[i]);

  if (clustered && isSorted && importLines.length >= 8) return 1;
  if (clustered && isSorted) return 0.7;
  if (clustered) return 0.3;
  return 0;
}

function scoreCommentDensity(lines: string[]): number {
  // AI tends to over-comment with explanatory comments
  const codeLines = lines.filter(l => l.trim().length > 0);
  if (codeLines.length === 0) return 0;
  const commentLines = codeLines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('*'));
  const ratio = commentLines.length / codeLines.length;
  // High comment density (>30%) suggests AI
  if (ratio > 0.4) return 1;
  if (ratio > 0.3) return 0.7;
  if (ratio > 0.2) return 0.4;
  return 0;
}
