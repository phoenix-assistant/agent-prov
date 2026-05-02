import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { AgentProvDB } from '../db.js';

export async function badgeCommand(opts: { output: string }): Promise<void> {
  let gitRoot: string;
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Error: not a git repository');
    process.exit(1);
  }

  const db = new AgentProvDB(gitRoot);
  const stats = db.getStats();
  db.close();

  const pct = stats.totalCommits > 0
    ? Math.round((1 - stats.unreviewed / stats.totalCommits) * 100)
    : 100;

  const color = pct >= 80 ? '#4c1' : pct >= 50 ? '#dfb317' : '#e05d44';
  const label = 'provenance';
  const value = `${pct}% verified`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a"><rect width="180" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h85v20H0z"/>
    <path fill="${color}" d="M85 0h95v20H85z"/>
    <path fill="url(#b)" d="M0 0h180v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,sans-serif" font-size="11">
    <text x="42" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="42" y="14">${label}</text>
    <text x="132" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="132" y="14">${value}</text>
  </g>
</svg>`;

  fs.writeFileSync(opts.output, svg);
  console.log(`✓ Badge written to ${opts.output}`);
}
