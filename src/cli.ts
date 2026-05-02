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

program
  .command('init')
  .description('Install git hooks and initialize provenance tracking')
  .action(initCommand);

program
  .command('scan')
  .description('Scan repo for AI-generated code patterns')
  .option('-p, --path <path>', 'Path to scan', '.')
  .action(scanCommand);

program
  .command('query')
  .description('Query provenance metadata')
  .option('--ai-generated', 'Show only AI-generated files')
  .option('--unreviewed', 'Show only unreviewed commits')
  .option('--model <model>', 'Filter by model')
  .action(queryCommand);

program
  .command('report')
  .description('Generate provenance report')
  .option('-o, --output <file>', 'Output file')
  .action(reportCommand);

program
  .command('badge')
  .description('Generate trust badge for README')
  .option('-o, --output <file>', 'Output file', 'agent-prov-badge.svg')
  .action(badgeCommand);

program.parse();
