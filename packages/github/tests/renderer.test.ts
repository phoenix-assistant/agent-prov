import { describe, it, expect } from 'vitest';
import { renderPRComment } from '../src/renderer.js';

describe('PR Comment Renderer', () => {
  it('renders a comment with file data', () => {
    const comment = renderPRComment({
      files: [
        { path: 'src/index.ts', aiGeneratedPct: 85, reviewDepth: 'none', linesChanged: 42 },
        { path: 'src/utils.ts', aiGeneratedPct: 15, reviewDepth: 'reviewed', linesChanged: 10 },
      ],
      totalFiles: 2,
      avgAiPct: 50,
      commitHash: 'abc12345def67890',
    });

    expect(comment).toContain('Agent Provenance Report');
    expect(comment).toContain('abc12345');
    expect(comment).toContain('src/index.ts');
    expect(comment).toContain('85%');
    expect(comment).toContain('🤖');
    expect(comment).toContain('👤');
  });

  it('handles empty file list', () => {
    const comment = renderPRComment({
      files: [],
      totalFiles: 0,
      avgAiPct: 0,
      commitHash: 'deadbeef',
    });

    expect(comment).toContain('No supported source files');
  });
});
