/**
 * Takealot Smoke Tests
 */

import type { Page } from 'playwright';
import type { SmokeTestResult } from '../../types.js';
import takealotSelectors from '../../selectors/takealot.json' with { type: 'json' };

const BASE_URL = 'https://www.takealot.com';

export async function runTakealotTests(page: Page): Promise<SmokeTestResult[]> {
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
      site: 'takealot',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'takealot',
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
    if (!page.url().includes('takealot.com')) {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    }

    // Try to find search input using our selectors
    const searchInput = await page.$(takealotSelectors.searchInput);
    if (!searchInput) {
      throw new Error(`Search input not found with selector: ${takealotSelectors.searchInput}`);
    }

    // Check if it's visible
    const isVisible = await searchInput.isVisible();
    if (!isVisible) {
      throw new Error('Search input found but not visible');
    }

    return {
      site: 'takealot',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'takealot',
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
    const searchUrl = `${BASE_URL}/all?qsearch=laptop`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for product cards to appear
    await page.waitForSelector(takealotSelectors.productCard, { timeout: 10000 });

    // Count product cards
    const productCards = await page.$$(takealotSelectors.productCard);
    if (productCards.length === 0) {
      throw new Error(`No product cards found with selector: ${takealotSelectors.productCard}`);
    }

    // Try to extract at least one product name
    const firstCard = productCards[0];
    const nameEl = await firstCard.$(takealotSelectors.productName);
    if (!nameEl) {
      throw new Error(`Product name not found with selector: ${takealotSelectors.productName}`);
    }

    const name = await nameEl.textContent();
    if (!name || name.trim().length === 0) {
      throw new Error('Product name element found but empty');
    }

    return {
      site: 'takealot',
      test,
      passed: true,
      duration: Date.now() - start
    };
  } catch (error) {
    const screenshot = await captureScreenshot(page);
    return {
      site: 'takealot',
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
