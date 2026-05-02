import { describe, it, expect } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { scanCommand } from '../src/commands/scan.js';
import { queryCommand } from '../src/commands/query.js';
import { reportCommand } from '../src/commands/report.js';
import { badgeCommand } from '../src/commands/badge.js';

describe('CLI', () => {
  it('all commands are functions returning Command objects', () => {
    const commands = [initCommand, scanCommand, queryCommand, reportCommand, badgeCommand];
    for (const cmd of commands) {
      expect(typeof cmd).toBe('function');
      const result = cmd();
      expect(result).toBeDefined();
      expect(result.name()).toBeTruthy();
    }
  });
});
