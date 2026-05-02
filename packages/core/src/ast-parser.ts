import Parser from 'web-tree-sitter';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ASTFingerprint {
  hash: string;
  nodeCount: number;
  maxDepth: number;
  depthDistribution: number[]; // count of nodes at each depth
  subtreeHashes: string[];     // hashes of top-level subtrees
}

const LANG_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
};

let parserReady = false;

export class ASTParser {
  private parsers = new Map<string, Parser>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!parserReady) {
      await Parser.init();
      parserReady = true;
    }
    this.initialized = true;
  }

  private async getParser(lang: string): Promise<Parser> {
    if (this.parsers.has(lang)) return this.parsers.get(lang)!;

    const parser = new Parser();
    // Resolve WASM from tree-sitter-wasms package
    let wasmPath: string;
    try {
      const wasmModule = `tree-sitter-wasms/out/tree-sitter-${lang}.wasm`;
      wasmPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', wasmModule);
    } catch {
      // Fallback: try require.resolve-style
      wasmPath = resolve(process.cwd(), 'node_modules', `tree-sitter-wasms/out/tree-sitter-${lang}.wasm`);
    }

    const wasmBuf = await readFile(wasmPath);
    const language = await Parser.Language.load(wasmBuf);
    parser.setLanguage(language);
    this.parsers.set(lang, parser);
    return parser;
  }

  resolveLanguage(ext: string): string | undefined {
    return LANG_MAP[ext];
  }

  async parse(code: string, language: string): Promise<Parser.Tree> {
    await this.init();
    const parser = await this.getParser(language);
    return parser.parse(code);
  }

  async fingerprint(code: string, language: string): Promise<ASTFingerprint> {
    const tree = await this.parse(code, language);
    const root = tree.rootNode;

    let nodeCount = 0;
    let maxDepth = 0;
    const depthDistribution: number[] = [];
    const subtreeHashes: string[] = [];

    // BFS to compute depth distribution
    const queue: Array<{ node: Parser.SyntaxNode; depth: number }> = [{ node: root, depth: 0 }];
    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;
      nodeCount++;
      if (depth > maxDepth) maxDepth = depth;
      while (depthDistribution.length <= depth) depthDistribution.push(0);
      depthDistribution[depth]++;
      for (let i = 0; i < node.childCount; i++) {
        queue.push({ node: node.child(i)!, depth: depth + 1 });
      }
    }

    // Top-level subtree hashes
    for (let i = 0; i < root.childCount; i++) {
      const child = root.child(i)!;
      const h = createHash('sha256').update(child.toString()).digest('hex').slice(0, 16);
      subtreeHashes.push(h);
    }

    const fullHash = createHash('sha256')
      .update(JSON.stringify({ depthDistribution, subtreeHashes }))
      .digest('hex')
      .slice(0, 32);

    tree.delete();
    return { hash: fullHash, nodeCount, maxDepth, depthDistribution, subtreeHashes };
  }

  /**
   * Extract all identifiers from code for stylometric analysis
   */
  async extractIdentifiers(code: string, language: string): Promise<string[]> {
    const tree = await this.parse(code, language);
    const identifiers: string[] = [];

    const walk = (node: Parser.SyntaxNode) => {
      if (node.type === 'identifier' || node.type === 'property_identifier') {
        identifiers.push(node.text);
      }
      for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i)!);
      }
    };
    walk(tree.rootNode);
    tree.delete();
    return identifiers;
  }

  /**
   * Get AST subtree depth distribution (for classifier)
   */
  async getSubtreeDepths(code: string, language: string): Promise<number[]> {
    const tree = await this.parse(code, language);
    const depths: number[] = [];

    const measureDepth = (node: Parser.SyntaxNode): number => {
      let max = 0;
      for (let i = 0; i < node.childCount; i++) {
        max = Math.max(max, measureDepth(node.child(i)!));
      }
      return max + 1;
    };

    for (let i = 0; i < tree.rootNode.childCount; i++) {
      depths.push(measureDepth(tree.rootNode.child(i)!));
    }
    tree.delete();
    return depths;
  }
}
