#!/usr/bin/env node
/**
 * Comprehensive Coverage Report Generator
 * 
 * This script generates a comprehensive coverage report for all languages
 * after translation work is complete. It provides detailed statistics and
 * identifies any remaining gaps.
 * 
 * Requirements: 1.2, 6.1, 7.4
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASELINE_REPORT_PATH = path.join(__dirname, '../i18n-baseline-report.json');
const METADATA_REPORT_PATH = path.join(__dirname, '../i18n-metadata-report.json');
const OUTPUT_PATH = path.join(__dirname, '../i18n-final-coverage-report.md');
const TARGET_LANGUAGES = ['zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;

interface CoverageData {
  locale: string;
  translated: number;
  total: number;
  percent: number;
  missing: number;
}

interface MetadataReport {
  timestamp: string;
  summary: {
    totalFiles: number;
    validFiles: number;
    canonicalGames: number;
    errorCount: number;
  };
  errors: ValidationIssue[];
  coverage: {
    [key: string]: {
      total: number;
      percentage: number;
      missing: string[];
    };
  };
}

interface ValidationIssue {
  filename: string;
  locale: string;
  issues: string[];
}

/**
 * Load reports
 */
async function loadReports() {
  const metadataContent = await fs.readFile(METADATA_REPORT_PATH, 'utf-8');
  const metadataReport: MetadataReport = JSON.parse(metadataContent);
  
  // Transform coverage data to array format
  const coverageArray: CoverageData[] = TARGET_LANGUAGES.map(locale => {
    const langCoverage = metadataReport.coverage[locale];
    return {
      locale,
      translated: langCoverage.total,
      total: metadataReport.summary.canonicalGames,
      percent: langCoverage.percentage,
      missing: langCoverage.missing.length,
    };
  });
  
  return {
    metadata: metadataReport,
    coverage: coverageArray,
  };
}

/**
 * Calculate coverage statistics
 */
function calculateCoverageStats(coverage: CoverageData[]) {
  const totalGames = coverage[0]?.total || 0;
  const totalPossibleTranslations = totalGames * TARGET_LANGUAGES.length;
  const totalActualTranslations = coverage.reduce((sum, c) => sum + c.translated, 0);
  const overallPercent = totalPossibleTranslations > 0
    ? Math.round((totalActualTranslations / totalPossibleTranslations) * 100 * 100) / 100
    : 0;

  return {
    totalGames,
    totalPossibleTranslations,
    totalActualTranslations,
    overallPercent,
  };
}

/**
 * Generate progress bar
 */
function generateProgressBar(percent: number, width: number = 40): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

/**
 * Generate markdown report
 */
async function generateMarkdownReport(reports: any) {
  const { metadata, coverage } = reports;
  const stats = calculateCoverageStats(coverage);
  const issues: ValidationIssue[] = metadata.errors || [];

  let md = '# I18n Final Coverage Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // Executive Summary
  md += '## Executive Summary\n\n';
  md += `- **Total Canonical Games:** ${stats.totalGames}\n`;
  md += `- **Target Languages:** ${TARGET_LANGUAGES.length} (${TARGET_LANGUAGES.join(', ')})\n`;
  md += `- **Total Possible Translations:** ${stats.totalPossibleTranslations}\n`;
  md += `- **Total Actual Translations:** ${stats.totalActualTranslations}\n`;
  md += `- **Overall Coverage:** ${stats.overallPercent}%\n`;
  md += `- **Validation Issues:** ${issues.length}\n\n`;

  // Overall Status
  md += '## Overall Status\n\n';
  if (stats.overallPercent === 100 && issues.length === 0) {
    md += '✅ **COMPLETE** - All translations are complete with no validation issues!\n\n';
  } else if (stats.overallPercent === 100) {
    md += '⚠️ **COMPLETE WITH ISSUES** - All translations exist but there are validation issues to resolve.\n\n';
  } else if (stats.overallPercent >= 90) {
    md += '🔄 **NEARLY COMPLETE** - Most translations are done, final push needed.\n\n';
  } else if (stats.overallPercent >= 50) {
    md += '🔄 **IN PROGRESS** - Significant progress made, continue translation work.\n\n';
  } else {
    md += '🚧 **EARLY STAGE** - Translation work is in early stages.\n\n';
  }

  // Coverage by Language
  md += '## Coverage by Language\n\n';
  md += '| Language | Translated | Total | Coverage | Progress |\n';
  md += '|----------|------------|-------|----------|----------|\n';

  for (const lang of coverage) {
    const progressBar = generateProgressBar(lang.percent, 20);
    md += `| ${lang.locale.toUpperCase()} | ${lang.translated} | ${lang.total} | ${lang.percent}% | ${progressBar} |\n`;
  }
  md += '\n';

  // Detailed Language Breakdown
  md += '## Detailed Language Breakdown\n\n';

  for (const lang of coverage) {
    md += `### ${lang.locale.toUpperCase()}\n\n`;
    md += `- **Translated:** ${lang.translated}/${lang.total}\n`;
    md += `- **Coverage:** ${lang.percent}%\n`;
    md += `- **Missing:** ${lang.missing}\n`;
    
    if (lang.percent === 100) {
      md += `- **Status:** ✅ Complete\n\n`;
    } else if (lang.percent >= 90) {
      md += `- **Status:** 🔄 Nearly Complete (${lang.missing} remaining)\n\n`;
    } else if (lang.percent >= 50) {
      md += `- **Status:** 🔄 In Progress (${lang.missing} remaining)\n\n`;
    } else {
      md += `- **Status:** 🚧 Early Stage (${lang.missing} remaining)\n\n`;
    }
  }

  // Validation Issues
  md += '## Validation Issues\n\n';
  if (issues.length === 0) {
    md += '✅ No validation issues found!\n\n';
  } else {
    md += `⚠️ Found ${issues.length} validation issues:\n\n`;
    
    // Group by language
    const issuesByLang = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issuesByLang.has(issue.locale)) {
        issuesByLang.set(issue.locale, []);
      }
      issuesByLang.get(issue.locale)!.push(issue);
    }

    for (const [locale, localeIssues] of issuesByLang) {
      md += `### ${locale.toUpperCase()} (${localeIssues.length} issues)\n\n`;
      
      // Show first 10 issues
      const displayIssues = localeIssues.slice(0, 10);
      for (const issue of displayIssues) {
        md += `- **${issue.filename}**\n`;
        for (const issueDetail of issue.issues) {
          md += `  - ${issueDetail}\n`;
        }
      }
      
      if (localeIssues.length > 10) {
        md += `\n_... and ${localeIssues.length - 10} more issues_\n`;
      }
      md += '\n';
    }
  }

  // Recommendations
  md += '## Recommendations\n\n';
  
  if (stats.overallPercent === 100 && issues.length === 0) {
    md += '✅ **All Done!** The i18n content work is complete.\n\n';
    md += '**Next Steps:**\n';
    md += '1. Deploy the translations to production\n';
    md += '2. Monitor user feedback\n';
    md += '3. Set up maintenance workflow for new games\n\n';
  } else {
    if (stats.overallPercent < 100) {
      md += '### Complete Missing Translations\n\n';
      
      const incompleteLangs = coverage.filter((c: CoverageData) => c.percent < 100);
      if (incompleteLangs.length > 0) {
        md += 'Focus on completing these languages:\n\n';
        for (const lang of incompleteLangs) {
          md += `- **${lang.locale.toUpperCase()}**: ${lang.missing} games remaining\n`;
        }
        md += '\n';
      }
    }

    if (issues.length > 0) {
      md += '### Fix Validation Issues\n\n';
      md += 'Address validation issues before deployment:\n\n';
      md += '1. Run `npm run validate:batch` to see detailed errors\n';
      md += '2. Fix structural mismatches\n';
      md += '3. Complete missing frontmatter fields\n';
      md += '4. Re-validate until all checks pass\n\n';
    }
  }

  // Maintenance
  md += '## Maintenance Guidelines\n\n';
  md += '### Adding New Games\n\n';
  md += '1. Add the English canonical game first\n';
  md += '2. Run `npm run generate:stubs` to create translation stubs\n';
  md += '3. Complete translations for all languages\n';
  md += '4. Validate with `npm run validate:batch`\n\n';

  md += '### Updating Existing Games\n\n';
  md += '1. Update the English canonical game\n';
  md += '2. Update all language variants to match structure\n';
  md += '3. Run structure validation to ensure alignment\n';
  md += '4. Commit all changes together\n\n';

  md += '### Regular Audits\n\n';
  md += '1. Run `npm run baseline:i18n` monthly\n';
  md += '2. Review coverage reports\n';
  md += '3. Address any gaps or issues\n';
  md += '4. Keep translations up to date\n\n';

  // Appendix
  md += '## Appendix\n\n';
  md += '### Related Documents\n\n';
  md += '- [Requirements](requirements.md)\n';
  md += '- [Design](design.md)\n';
  md += '- [Tasks](tasks.md)\n';
  md += '- [Batch Validation Guide](BATCH-VALIDATION-GUIDE.md)\n';
  md += '- [Translation Standards](translation-standards.md)\n\n';

  md += '### Report Files\n\n';
  md += '- Baseline Report: `i18n-baseline-report.json`\n';
  md += '- Metadata Report: `i18n-metadata-report.json`\n';
  md += '- Structure Report: `i18n-structure-report.json`\n';
  md += '- Coverage Report: `i18n-final-coverage-report.md` (this file)\n\n';

  md += '---\n\n';
  md += `*Report generated by \`scripts/generate-coverage-report.mts\` on ${new Date().toISOString()}*\n`;

  return md;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Generating Final Coverage Report                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Load reports
    console.log('Loading validation reports...');
    const reports = await loadReports();

    // Generate markdown report
    console.log('Generating comprehensive report...');
    const markdown = await generateMarkdownReport(reports);

    // Write report
    await fs.writeFile(OUTPUT_PATH, markdown, 'utf-8');
    console.log(`\n✅ Report generated: ${OUTPUT_PATH}\n`);

    // Display summary
    const { coverage } = reports;
    const stats = calculateCoverageStats(coverage);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Games: ${stats.totalGames}`);
    console.log(`Overall Coverage: ${stats.overallPercent}%`);
    console.log(`Translations: ${stats.totalActualTranslations}/${stats.totalPossibleTranslations}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Coverage by Language:');
    for (const lang of coverage) {
      const bar = generateProgressBar(lang.percent, 30);
      console.log(`  ${lang.locale.toUpperCase()}: ${lang.percent}% ${bar}`);
    }
    console.log('\n');

    if (stats.overallPercent === 100) {
      console.log('🎉 All translations complete!\n');
    } else {
      console.log(`🔄 ${100 - stats.overallPercent}% remaining\n`);
    }

  } catch (error) {
    console.error('Error generating coverage report:', error);
    process.exit(1);
  }
}

main();
