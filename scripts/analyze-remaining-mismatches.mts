import fs from 'fs';

const report = JSON.parse(fs.readFileSync('i18n-structure-report.json', 'utf8'));

const byLocale: Record<string, number> = {};
report.mismatches.forEach((m: any) => {
  if (!byLocale[m.locale]) byLocale[m.locale] = 0;
  byLocale[m.locale]++;
});

console.log('Remaining mismatches by locale:');
console.log('================================');
Object.entries(byLocale).sort((a, b) => b[1] - a[1]).forEach(([locale, count]) => {
  console.log(`${locale}: ${count}`);
});
console.log('================================');
console.log(`Total: ${report.summary.mismatchCount}`);
