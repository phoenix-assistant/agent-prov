import { ASTParser } from './ast-parser.js';

export interface StyleMetrics {
  entropy: number;
  camelCaseRatio: number;
  avgIdentifierLength: number;
  identifierLengthStdDev: number;
  commentDensity: number;
  commentStyleConsistency: number;
  avgSubtreeDepth: number;
  subtreeDepthVariance: number;
  repetitivePatternScore: number;
}

export interface ClassificationResult {
  aiGeneratedPct: number;
  confidence: number;
  metrics: StyleMetrics;
  signals: string[];
}

/**
 * AI-generated code classifier using stylometric heuristics.
 * No LLM calls — pure statistical analysis of code style patterns.
 *
 * Key insight: AI-generated code tends to exhibit:
 * - Higher Shannon entropy in identifier names (more "random" naming)
 * - More consistent camelCase usage (humans mix styles)
 * - More uniform identifier lengths (less variation)
 * - Higher comment density with doc-style comments
 * - More uniform AST subtree depths (templated structure)
 * - More repetitive patterns (similar function shapes)
 */
export class AIClassifier {
  private parser: ASTParser;

  constructor(parser?: ASTParser) {
    this.parser = parser ?? new ASTParser();
  }

  async classify(code: string, language: string): Promise<ClassificationResult> {
    const signals: string[] = [];
    let score = 0;
    let weights = 0;

    // 1. Shannon entropy of identifier names
    let identifiers: string[];
    try {
      identifiers = await this.parser.extractIdentifiers(code, language);
    } catch {
      identifiers = this.extractIdentifiersFallback(code);
    }

    const entropy = this.shannonEntropy(identifiers.join(''));
    const entropyScore = this.entropySignal(entropy);
    score += entropyScore * 0.15;
    weights += 0.15;
    if (entropyScore > 0.6) signals.push(`high_entropy(${entropy.toFixed(2)})`);

    // 2. CamelCase consistency
    const camelCaseRatio = this.camelCaseRatio(identifiers);
    const camelScore = camelCaseRatio > 0.85 ? 0.8 : camelCaseRatio > 0.7 ? 0.5 : 0.2;
    score += camelScore * 0.12;
    weights += 0.12;
    if (camelCaseRatio > 0.85) signals.push(`high_camelcase_consistency(${(camelCaseRatio * 100).toFixed(0)}%)`);

    // 3. Identifier length distribution
    const lengths = identifiers.map(id => id.length);
    const avgLen = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const stdDev = this.stdDev(lengths);
    // AI tends toward uniform, moderate-length identifiers
    const lenScore = (avgLen > 6 && avgLen < 16 && stdDev < 5) ? 0.7 : 0.3;
    score += lenScore * 0.1;
    weights += 0.1;
    if (lenScore > 0.5) signals.push(`uniform_identifier_lengths(avg=${avgLen.toFixed(1)},std=${stdDev.toFixed(1)})`);

    // 4. Comment density and style
    const { density, styleConsistency } = this.analyzeComments(code);
    const commentScore = (density > 0.1 && styleConsistency > 0.7) ? 0.8 :
                          (density > 0.05) ? 0.5 : 0.2;
    score += commentScore * 0.15;
    weights += 0.15;
    if (density > 0.1) signals.push(`high_comment_density(${(density * 100).toFixed(0)}%)`);

    // 5. AST subtree depth distribution
    let subtreeDepths: number[] = [];
    try {
      subtreeDepths = await this.parser.getSubtreeDepths(code, language);
    } catch {
      // fallback: skip this signal
    }
    const avgDepth = subtreeDepths.length > 0 ? subtreeDepths.reduce((a, b) => a + b, 0) / subtreeDepths.length : 0;
    const depthVar = this.variance(subtreeDepths);
    // AI code has more uniform depth (lower variance relative to mean)
    const depthScore = (subtreeDepths.length > 2 && depthVar < avgDepth * 1.5) ? 0.7 : 0.3;
    score += depthScore * 0.15;
    weights += 0.15;
    if (depthScore > 0.5) signals.push(`uniform_ast_depth(var=${depthVar.toFixed(1)})`);

    // 6. Repetitive pattern detection
    const repetitiveScore = this.detectRepetitivePatterns(code);
    score += repetitiveScore * 0.18;
    weights += 0.18;
    if (repetitiveScore > 0.5) signals.push(`repetitive_patterns(${(repetitiveScore * 100).toFixed(0)}%)`);

    // 7. Line length uniformity (AI tends to wrap at consistent widths)
    const lineUniformity = this.lineLengthUniformity(code);
    score += lineUniformity * 0.15;
    weights += 0.15;
    if (lineUniformity > 0.6) signals.push(`uniform_line_lengths`);

    const aiPct = Math.min(100, Math.max(0, (score / weights) * 100));
    const confidence = Math.min(1, identifiers.length / 20) * (signals.length > 2 ? 1 : 0.7);

    return {
      aiGeneratedPct: Math.round(aiPct * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      metrics: {
        entropy,
        camelCaseRatio,
        avgIdentifierLength: avgLen,
        identifierLengthStdDev: stdDev,
        commentDensity: density,
        commentStyleConsistency: styleConsistency,
        avgSubtreeDepth: avgDepth,
        subtreeDepthVariance: depthVar,
        repetitivePatternScore: repetitiveScore,
      },
      signals,
    };
  }

  private shannonEntropy(text: string): number {
    if (text.length === 0) return 0;
    const freq = new Map<string, number>();
    for (const ch of text) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    const len = text.length;
    for (const count of freq.values()) {
      const p = count / len;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private entropySignal(entropy: number): number {
    // AI identifiers typically have entropy 4.0-4.8
    // Human code varies more widely
    if (entropy >= 4.0 && entropy <= 4.8) return 0.8;
    if (entropy >= 3.5 && entropy <= 5.0) return 0.5;
    return 0.2;
  }

  private camelCaseRatio(identifiers: string[]): number {
    if (identifiers.length === 0) return 0;
    const multiWord = identifiers.filter(id => id.length > 3);
    if (multiWord.length === 0) return 0.5;
    const camelCase = multiWord.filter(id => /^[a-z][a-zA-Z0-9]*$/.test(id) && /[A-Z]/.test(id));
    return camelCase.length / multiWord.length;
  }

  private stdDev(nums: number[]): number {
    if (nums.length === 0) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const sq = nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / nums.length;
    return Math.sqrt(sq);
  }

  private variance(nums: number[]): number {
    if (nums.length === 0) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / nums.length;
  }

  private analyzeComments(code: string): { density: number; styleConsistency: number } {
    const lines = code.split('\n');
    const totalLines = lines.length;
    if (totalLines === 0) return { density: 0, styleConsistency: 0 };

    let commentLines = 0;
    let jsdocStyle = 0;
    let slashStyle = 0;
    let hashStyle = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) { slashStyle++; commentLines++; }
      else if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) { jsdocStyle++; commentLines++; }
      else if (trimmed.startsWith('#') && !trimmed.startsWith('#!')) { hashStyle++; commentLines++; }
    }

    const density = commentLines / totalLines;
    const styles = [jsdocStyle, slashStyle, hashStyle].filter(n => n > 0);
    const dominant = Math.max(jsdocStyle, slashStyle, hashStyle);
    const styleConsistency = commentLines > 0 ? dominant / commentLines : 0;

    return { density, styleConsistency };
  }

  private detectRepetitivePatterns(code: string): number {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    if (lines.length < 5) return 0;

    // Normalize: replace identifiers/strings with placeholders
    const normalized = lines.map(l =>
      l.replace(/['"`][^'"`]*['"`]/g, 'STR')
       .replace(/\b\d+\b/g, 'NUM')
       .replace(/\b[a-zA-Z_]\w*\b/g, 'ID')
    );

    // Count duplicate normalized patterns
    const freq = new Map<string, number>();
    for (const line of normalized) {
      freq.set(line, (freq.get(line) ?? 0) + 1);
    }

    let repeated = 0;
    for (const count of freq.values()) {
      if (count > 1) repeated += count;
    }

    return Math.min(1, repeated / lines.length);
  }

  private lineLengthUniformity(code: string): number {
    const lines = code.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 5) return 0.5;
    const lengths = lines.map(l => l.length);
    const cv = this.stdDev(lengths) / (lengths.reduce((a, b) => a + b, 0) / lengths.length);
    // AI tends to have lower coefficient of variation
    return cv < 0.4 ? 0.7 : cv < 0.6 ? 0.5 : 0.3;
  }

  private extractIdentifiersFallback(code: string): string[] {
    const matches = code.match(/\b[a-zA-Z_]\w{2,}\b/g);
    return matches ?? [];
  }
}
