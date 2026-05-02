import { describe, it, expect } from 'vitest';
import { analyzeSource } from '../src/detector/ai-patterns.js';

describe('analyzeSource', () => {
  it('scores low for simple human code', () => {
    const code = `const x = 1;\nconst y = 2;\nconsole.log(x + y);\n`;
    const result = analyzeSource(code);
    expect(result.overallScore).toBeLessThan(0.3);
  });

  it('detects verbose variable names', () => {
    const code = `
const userAuthenticationTokenValidationResult = true;
const databaseConnectionPoolManagerInstance = null;
const httpRequestResponseHeaderConfiguration = {};
let applicationStateManagementContextProvider = 'test';
function handleUserInputValidationAndSanitization() {}
    `;
    const result = analyzeSource(code);
    expect(result.verboseNames).toBeGreaterThan(0.3);
  });

  it('detects repetitive error handling', () => {
    const code = Array(20).fill('').map((_, i) => `
try {
  await step${i}();
} catch (error) {
  throw new Error("Step ${i} failed");
}
`).join('\n');
    const result = analyzeSource(code);
    expect(result.repetitiveErrorHandling).toBeGreaterThan(0.5);
  });

  it('detects high comment density', () => {
    const lines = [];
    for (let i = 0; i < 20; i++) {
      lines.push(`// This function handles step ${i}`);
      lines.push(`const x${i} = ${i};`);
    }
    const result = analyzeSource(lines.join('\n'));
    expect(result.commentDensity).toBeGreaterThan(0.3);
  });

  it('returns zero for empty content', () => {
    const result = analyzeSource('');
    expect(result.overallScore).toBe(0);
  });

  it('handles single line files', () => {
    const result = analyzeSource('x = 1');
    expect(result.overallScore).toBe(0);
  });
});
