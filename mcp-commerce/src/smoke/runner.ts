/**
 * Smoke Test Runner - Pre-demo validation of CSS selectors
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { runTakealotTests } from './tests/takealot.js';
import { runAmazonTests } from './tests/amazon.js';
import type { SmokeTestResult, SmokeTestReport, SiteId } from '../types.js';

const HEADLESS = process.env.MCP_HEADLESS !== 'false';

interface SmokeTestOptions {
  sites?: SiteId[];
  verbose?: boolean;
}

export async function runSmokeTests(options: SmokeTestOptions = {}): Promise<SmokeTestReport> {
  const sites = options.sites || ['takealot', 'amazon'];
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log('[Smoke] Starting smoke tests...');
    console.log(`[Smoke] Sites: ${sites.join(', ')}`);
    console.log(`[Smoke] Headless: ${HEADLESS}`);
  }

  let browser: Browser | null = null;
  const allResults: SmokeTestResult[] = [];

  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    // Run tests for each site
    for (const site of sites) {
      if (verbose) console.log(`\n[Smoke] Testing ${site}...`);

      let context: BrowserContext | null = null;
      let page: Page | null = null;

      try {
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        page = await context.newPage();

        let results: SmokeTestResult[];
        if (site === 'takealot') {
          results = await runTakealotTests(page);
        } else if (site === 'amazon') {
          results = await runAmazonTests(page);
        } else {
          results = [];
        }

        // Log results
        for (const result of results) {
          if (verbose) {
            const status = result.passed ? '✓' : '✗';
            console.log(`  ${status} ${result.test} (${result.duration}ms)`);
            if (!result.passed && result.error) {
              console.log(`    Error: ${result.error}`);
            }
          }
        }

        allResults.push(...results);
      } catch (error) {
        console.error(`[Smoke] Error running ${site} tests:`, error);
        allResults.push({
          site,
          test: 'test_execution',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        });
      } finally {
        if (context) await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  const passed = allResults.every(r => r.passed);
  const report: SmokeTestReport = {
    timestamp: new Date().toISOString(),
    passed,
    results: allResults
  };

  if (verbose) {
    console.log('\n[Smoke] =====================================');
    console.log(`[Smoke] Overall: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`[Smoke] Total tests: ${allResults.length}`);
    console.log(`[Smoke] Passed: ${allResults.filter(r => r.passed).length}`);
    console.log(`[Smoke] Failed: ${allResults.filter(r => !r.passed).length}`);

    if (!passed) {
      console.log('\n[Smoke] Failed tests:');
      for (const result of allResults.filter(r => !r.passed)) {
        console.log(`  - ${result.site}/${result.test}: ${result.error}`);
      }
    }
  }

  return report;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sites: SiteId[] = [];

  if (args.includes('--takealot')) sites.push('takealot');
  if (args.includes('--amazon')) sites.push('amazon');

  runSmokeTests({ sites: sites.length > 0 ? sites : undefined })
    .then(report => {
      process.exit(report.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('[Smoke] Fatal error:', error);
      process.exit(1);
    });
}
