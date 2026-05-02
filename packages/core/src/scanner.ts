import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { ASTParser } from './ast-parser.js';
import { AIClassifier, type ClassificationResult } from './classifier.js';
import type { ASTFingerprint } from './ast-parser.js';

export interface ScanResult {
  filePath: string;
  language: string | null;
  classification: ClassificationResult;
  fingerprint: ASTFingerprint | null;
  linesOfCode: number;
}

const SUPPORTED_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.py']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.agent-prov', '__pycache__', '.turbo']);

export async function scanFile(
  filePath: string,
  parser?: ASTParser,
  classifier?: AIClassifier,
): Promise<ScanResult> {
  const p = parser ?? new ASTParser();
  const c = classifier ?? new AIClassifier(p);

  const code = await readFile(filePath, 'utf-8');
  const ext = extname(filePath);
  const lang = p.resolveLanguage(ext) ?? null;

  let fingerprint: ASTFingerprint | null = null;
  if (lang) {
    try {
      fingerprint = await p.fingerprint(code, lang);
    } catch {
      // tree-sitter might not have WASM for this lang
    }
  }

  const classification = await c.classify(code, lang ?? 'javascript');
  const linesOfCode = code.split('\n').filter(l => l.trim().length > 0).length;

  return {
    filePath,
    language: lang,
    classification,
    fingerprint,
    linesOfCode,
  };
}

export async function scanDirectory(
  dirPath: string,
  parser?: ASTParser,
  classifier?: AIClassifier,
): Promise<ScanResult[]> {
  const p = parser ?? new ASTParser();
  const c = classifier ?? new AIClassifier(p);
  const results: ScanResult[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && SUPPORTED_EXTS.has(extname(entry.name))) {
        try {
          const result = await scanFile(fullPath, p, c);
          result.filePath = relative(dirPath, fullPath);
          results.push(result);
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  }

  await walk(dirPath);
  return results;
}
