/**
 * Base Site Adapter - Abstract class for retailer implementations
 */

import type { Page } from 'playwright';
import type { Product, SiteId, SiteSelectors, PurchaseResult, ThreeDSecureInfo } from '../types.js';

export interface SearchOptions {
  maxPrice?: number;
  maxResults?: number;
}

export interface AdapterContext {
  page: Page;
  sessionId: string;
}

export abstract class SiteAdapter {
  abstract readonly siteId: SiteId;
  abstract readonly baseUrl: string;
  abstract readonly selectors: SiteSelectors;

  protected context: AdapterContext;

  constructor(context: AdapterContext) {
    this.context = context;
  }

  get page(): Page {
    return this.context.page;
  }

  /**
   * Navigate to the site's homepage
   */
  async navigateToHome(): Promise<void> {
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Search for products
   */
  abstract search(query: string, options?: SearchOptions): Promise<Product[]>;

  /**
   * Get detailed product information from a product page
   */
  abstract getProduct(productUrl: string): Promise<Product>;

  /**
   * Add a product to the cart
   */
  abstract addToCart(productUrl: string, quantity?: number): Promise<boolean>;

  /**
   * Get checkout preview (without completing purchase)
   */
  abstract getCheckoutPreview(): Promise<{
    items: Array<{ name: string; price: number; quantity: number }>;
    subtotal: number;
    shipping: number;
    total: number;
  }>;

  /**
   * Check if the user is authenticated
   */
  abstract isAuthenticated(): Promise<boolean>;

  /**
   * Login to the site using stored credentials
   * Returns true if login was successful
   */
  abstract login(): Promise<boolean>;

  /**
   * Execute a purchase for a product
   * Handles the full flow: add to cart → checkout → place order → wait for confirmation
   */
  abstract purchase(productUrl: string, expectedPrice?: number): Promise<PurchaseResult>;

  /**
   * Detect if 3D Secure verification is present
   * This may appear as an iframe or redirect to bank's page
   */
  abstract detect3DSecure(): Promise<ThreeDSecureInfo>;

  /**
   * Wait for order confirmation after placing order
   * Handles 3D Secure flow if detected
   */
  abstract waitForOrderConfirmation(timeout?: number): Promise<{ orderId?: string; success: boolean }>;

  /**
   * Get credentials from environment variables
   * Returns null if credentials are not configured
   */
  protected getCredentials(): { email: string; password: string } | null {
    const siteKey = this.siteId.toUpperCase();
    const email = process.env[`${siteKey}_EMAIL`];
    const password = process.env[`${siteKey}_PASSWORD`];

    if (!email || !password) {
      return null;
    }

    return { email, password };
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(): Promise<string> {
    const buffer = await this.page.screenshot({ type: 'png', fullPage: false });
    return buffer.toString('base64');
  }

  /**
   * Wait for page to be ready
   */
  protected async waitForPageReady(timeout = 10000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Safe text extraction - returns empty string if element not found
   */
  protected async safeGetText(selector: string): Promise<string> {
    try {
      const element = await this.page.$(selector);
      if (!element) return '';
      return (await element.textContent())?.trim() || '';
    } catch {
      return '';
    }
  }

  /**
   * Safe attribute extraction
   */
  protected async safeGetAttribute(selector: string, attribute: string): Promise<string> {
    try {
      const element = await this.page.$(selector);
      if (!element) return '';
      return (await element.getAttribute(attribute)) || '';
    } catch {
      return '';
    }
  }

  /**
   * Parse price string to number (handles R, $, commas, etc.)
   * Supports both formats: "R 1,234.56" (thousands comma) and "R 1.234,56" (decimal comma)
   */
  protected parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    // Remove currency symbols and spaces first
    let cleaned = priceStr.replace(/[R$\s]/g, '').trim();

    // Detect format: If comma appears after period OR comma is followed by exactly 2 digits at end,
    // it's likely a decimal comma (South African/European format)
    // e.g., "99,00" or "1.234,56" -> decimal comma
    // e.g., "1,234.56" or "1,234" -> thousands comma
    if (/,\d{2}$/.test(cleaned) && !/\.\d{2}$/.test(cleaned)) {
      // Decimal comma format: remove thousands separator (period), replace decimal comma with period
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard format: remove thousands separator (comma)
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse rating string to number
   */
  protected parseRating(ratingStr: string): number {
    if (!ratingStr) return 0;
    // Extract first number (handles "4.5 out of 5", "4.5/5", "4.5 stars", etc.)
    const match = ratingStr.match(/(\d+\.?\d*)/);
    if (!match) return 0;
    const parsed = parseFloat(match[1]);
    return isNaN(parsed) ? 0 : Math.min(parsed, 5);
  }

  /**
   * Parse review count string to number
   */
  protected parseReviewCount(countStr: string): number {
    if (!countStr) return 0;
    // Extract numbers, handle "1,234 reviews", "(1234)", "1.2k", etc.
    const cleaned = countStr.replace(/[(),\s]/g, '').toLowerCase();
    if (cleaned.includes('k')) {
      const num = parseFloat(cleaned.replace('k', ''));
      return isNaN(num) ? 0 : Math.round(num * 1000);
    }
    const match = cleaned.match(/(\d+)/);
    if (!match) return 0;
    return parseInt(match[1], 10);
  }

  /**
   * Download image and convert to base64
   */
  protected async getImageBase64(imageUrl: string): Promise<string | undefined> {
    if (!imageUrl) return undefined;
    try {
      // Handle relative URLs
      const fullUrl = imageUrl.startsWith('http')
        ? imageUrl
        : new URL(imageUrl, this.baseUrl).href;

      const response = await this.page.context().request.get(fullUrl);
      if (!response.ok()) return undefined;

      const buffer = await response.body();
      return buffer.toString('base64');
    } catch {
      return undefined;
    }
  }
}
