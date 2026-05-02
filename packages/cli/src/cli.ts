#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { queryCommand } from './commands/query.js';
import { reportCommand } from './commands/report.js';
import { badgeCommand } from './commands/badge.js';

const program = new Command();

program
  .name('agent-prov')
  .description('Git-native provenance layer for AI-generated code')
  .version('0.1.0');

program.addCommand(initCommand());
program.addCommand(scanCommand());
program.addCommand(queryCommand());
program.addCommand(reportCommand());
program.addCommand(badgeCommand());

program.parse();
