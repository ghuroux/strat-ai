/**
 * Amazon.co.za Smoke Tests
 */

import type { Page } from 'playwright';
import type { SmokeTestResult } from '../../types.js';
import amazonSelectors from '../../selectors/amazon.json' with { type: 'json' };

const BASE_URL = 'https://www.amazon.co.za';

export async function runAmazonTests(page: Page): Promise<SmokeTestResult[]> {
  const results: SmokeTestResult[] = [];

  // Test 1: Homepage loads
  results.push(await testHomepageLoads(page));

  // Test 2: Search input visible
  results.push(await testSearchInputVisible(page));

  // Test 3: Search returns results
  results.push(await testSearchReturnsResults(page));

  return results;
}

async function testHomepageLoads(page: Page): Promise<SmokeTestResult> {
  const start = Date.now();
  const test = 'homepage_loads';

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Check that the page loaded by looking for a key element
    const title = await page.title();
    if (!title || title.toLowerCase().includes('error')) {
      throw new Error(`Unexpected page title: ${title}`);
    }

    return {
      site: 'amazon',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'amazon',
      test,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshot,
      duration: Date.now() - start
    };
  }
}

async function testSearchInputVisible(page: Page): Promise<SmokeTestResult> {
  const start = Date.now();
  const test = 'search_input_visible';

  try {
    // Ensure we're on the homepage
    if (!page.url().includes('amazon.co.za')) {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    }

    // Try to find search input using our selectors
    const searchInput = await page.$(amazonSelectors.searchInput);
    if (!searchInput) {
      throw new Error(`Search input not found with selector: ${amazonSelectors.searchInput}`);
    }

    // Check if it's visible
    const isVisible = await searchInput.isVisible();
    if (!isVisible) {
      throw new Error('Search input found but not visible');
    }

    return {
      site: 'amazon',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'amazon',
      test,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshot,
      duration: Date.now() - start
    };
  }
}

async function testSearchReturnsResults(page: Page): Promise<SmokeTestResult> {
  const start = Date.now();
  const test = 'search_returns_results';

  try {
    // Navigate to search results page directly
    const searchUrl = `${BASE_URL}/s?k=laptop`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for product cards to appear
    await page.waitForSelector(amazonSelectors.productCard, { timeout: 10000 });

    // Count product cards
    const productCards = await page.$$(amazonSelectors.productCard);
    if (productCards.length === 0) {
      throw new Error(`No product cards found with selector: ${amazonSelectors.productCard}`);
    }

    // Filter to only cards with ASIN (real products, not ads)
    let validProducts = 0;
    for (const card of productCards) {
      const asin = await card.getAttribute('data-asin');
      if (asin && asin.length > 0) {
        validProducts++;
        if (validProducts >= 1) break; // Found at least one valid product
      }
    }

    if (validProducts === 0) {
      throw new Error('No valid product cards found (missing data-asin)');
    }

    return {
      site: 'amazon',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'amazon',
      test,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshot,
      duration: Date.now() - start
    };
  }
}

async function captureScreenshot(page: Page): Promise<string | undefined> {
  try {
    const buffer = await page.screenshot({ type: 'png' });
    return buffer.toString('base64');
  } catch {
    return undefined;
  }
}
