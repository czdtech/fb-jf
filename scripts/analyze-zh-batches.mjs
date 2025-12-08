#!/usr/bin/env node
import fs from 'fs';

const report = JSON.parse(fs.readFileSync('i18n-metadata-report.json', 'utf-8'));
const missing = report.coverage.zh.missing;

// Split into A-M and N-Z batches
const batchAM = missing.filter(slug => slug[0].toLowerCase() <= 'm');
const batchNZ = missing.filter(slug => slug[0].toLowerCase() > 'm');

const output = {
  timestamp: new Date().toISOString(),
  totalMissing: missing.length,
  batches: {
    'batch-1-A-M': {
      count: batchAM.length,
      games: batchAM
    },
    'batch-2-N-Z': {
      count: batchNZ.length,
      games: batchNZ
    }
  }
};

// Write JSON output
fs.writeFileSync('.kiro/specs/full-i18n-content/zh-translation-batches.json', JSON.stringify(output, null, 2));

// Write markdown summary
const markdown = `# ZH Translation Batches

Generated: ${output.timestamp}

## Summary

- **Total missing ZH translations**: ${output.totalMissing} games
- **Batch 1 (A-M)**: ${batchAM.length} games
- **Batch 2 (N-Z)**: ${batchNZ.length} games

## Batch 1: A-M (${batchAM.length} games)

${batchAM.map(slug => `- ${slug}`).join('\n')}

## Batch 2: N-Z (${batchNZ.length} games)

${batchNZ.map(slug => `- ${slug}`).join('\n')}
`;

fs.writeFileSync('.kiro/specs/full-i18n-content/zh-translation-batches.md', markdown);

console.log('✅ Batch analysis complete!');
console.log(`Total missing: ${output.totalMissing}`);
console.log(`Batch 1 (A-M): ${batchAM.length} games`);
console.log(`Batch 2 (N-Z): ${batchNZ.length} games`);
console.log('\nFiles written:');
console.log('  - .kiro/specs/full-i18n-content/zh-translation-batches.json');
console.log('  - .kiro/specs/full-i18n-content/zh-translation-batches.md');
