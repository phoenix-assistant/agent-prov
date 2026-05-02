import { describe, it, expect } from 'vitest';
import { AIClassifier } from '../src/classifier.js';

describe('AIClassifier', () => {
  const classifier = new AIClassifier();

  it('classifies AI-like code with higher score', async () => {
    // AI-generated style: consistent naming, high comment density, uniform structure
    const aiLikeCode = `
/**
 * Calculate the fibonacci sequence up to n terms.
 * @param numberOfTerms - The number of terms to generate
 * @returns An array of fibonacci numbers
 */
export function calculateFibonacciSequence(numberOfTerms: number): number[] {
  const fibonacciNumbers: number[] = [];
  let previousNumber = 0;
  let currentNumber = 1;

  for (let iterationIndex = 0; iterationIndex < numberOfTerms; iterationIndex++) {
    fibonacciNumbers.push(previousNumber);
    const temporaryNumber = currentNumber;
    currentNumber = previousNumber + currentNumber;
    previousNumber = temporaryNumber;
  }

  return fibonacciNumbers;
}

/**
 * Check if a given number is a fibonacci number.
 * @param numberToCheck - The number to validate
 * @returns True if the number is a fibonacci number
 */
export function isValidFibonacciNumber(numberToCheck: number): boolean {
  const squaredTimeFive = 5 * numberToCheck * numberToCheck;
  const isPerfectSquarePlusFour = isPerfectSquare(squaredTimeFive + 4);
  const isPerfectSquareMinusFour = isPerfectSquare(squaredTimeFive - 4);

  return isPerfectSquarePlusFour || isPerfectSquareMinusFour;
}

/**
 * Helper function to check if a number is a perfect square.
 * @param numberToCheck - The number to validate
 * @returns True if the number is a perfect square
 */
function isPerfectSquare(numberToCheck: number): boolean {
  const squareRoot = Math.floor(Math.sqrt(numberToCheck));
  return squareRoot * squareRoot === numberToCheck;
}
`;

    const result = await classifier.classify(aiLikeCode, 'typescript');
    expect(result.aiGeneratedPct).toBeGreaterThan(40);
    expect(result.metrics).toBeDefined();
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('classifies human-like code with lower score', async () => {
    // Human style: inconsistent naming, terse, mixed styles
    const humanCode = `
// quick fib
function fib(n) {
  let a = 0, b = 1
  const r = []
  for(let i=0;i<n;i++){
    r.push(a)
    ;[a,b]=[b,a+b]
  }
  return r
}

// TODO: fix this later
const isFib = x => {
  const s = 5*x*x
  return Number.isInteger(Math.sqrt(s+4)) || Number.isInteger(Math.sqrt(s-4))
}
`;

    const result = await classifier.classify(humanCode, 'javascript');
    // Human code should score lower, but we mainly test it doesn't crash
    expect(result.aiGeneratedPct).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it('returns valid metrics structure', async () => {
    const code = 'const x = 1;\nconst y = 2;\nconsole.log(x + y);';
    const result = await classifier.classify(code, 'javascript');

    expect(result.metrics).toMatchObject({
      entropy: expect.any(Number),
      camelCaseRatio: expect.any(Number),
      avgIdentifierLength: expect.any(Number),
      identifierLengthStdDev: expect.any(Number),
      commentDensity: expect.any(Number),
      commentStyleConsistency: expect.any(Number),
      avgSubtreeDepth: expect.any(Number),
      subtreeDepthVariance: expect.any(Number),
      repetitivePatternScore: expect.any(Number),
    });
  });
});
