import { Command } from 'commander';
import { ProvenanceStore, QueryEngine } from '@phoenixaihub/agent-prov-core';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function badgeCommand(): Command {
  return new Command('badge')
    .description('Generate trust badge SVG')
    .option('-o, --output <path>', 'Output path', 'agent-prov-badge.svg')
    .action(async (opts) => {
      try {
        const dbPath = join(process.cwd(), '.agent-prov', 'provenance.db');
        const store = new ProvenanceStore(dbPath);
        const engine = new QueryEngine(store);

        const all = engine.query({});
        const { avgAiPct, unreviewedCount, totalFiles } = all.summary;

        const reviewedPct = totalFiles > 0
          ? Math.round(((totalFiles - unreviewedCount) / totalFiles) * 100)
          : 100;

        const color = reviewedPct >= 90 ? '#4c1' : reviewedPct >= 70 ? '#dfb317' : '#e05d44';
        const label = `AI: ${avgAiPct}% | Reviewed: ${reviewedPct}%`;

        const svg = generateBadgeSVG('agent-prov', label, color);
        await writeFile(opts.output, svg);
        console.log(`🏷️  Badge saved: ${opts.output}`);

        store.close();
      } catch (err) {
        console.error(`❌ Badge generation failed:`, (err as Error).message);
        process.exit(1);
      }
    });
}

function generateBadgeSVG(leftText: string, rightText: string, color: string): string {
  const leftWidth = leftText.length * 7 + 12;
  const rightWidth = rightText.length * 7 + 12;
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth / 2}" y="14">${leftText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${rightText}</text>
  </g>
</svg>`;
}
