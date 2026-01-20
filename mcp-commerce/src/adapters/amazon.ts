/**
 * Amazon.co.za Site Adapter
 */

import { SiteAdapter, type SearchOptions } from './base.js';
import type { Product, SiteId, SiteSelectors } from '../types.js';
import amazonSelectors from '../selectors/amazon.json' with { type: 'json' };

export class AmazonAdapter extends SiteAdapter {
  readonly siteId: SiteId = 'amazon';
  readonly baseUrl = 'https://www.amazon.co.za';
  readonly selectors: SiteSelectors = amazonSelectors as SiteSelectors;

  async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const maxResults = options?.maxResults ?? 10;
    const maxPrice = options?.maxPrice;

    // Navigate to search results directly
    const searchUrl = `${this.baseUrl}/s?k=${encodeURIComponent(query)}`;
    await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Wait for products to load
    await this.page.waitForSelector(this.selectors.productCard, { timeout: 15000 }).catch(() => null);

    // Extract products
    const products = await this.extractProducts(maxResults);

    // Filter by max price if specified
    if (maxPrice) {
      return products.filter(p => p.price <= maxPrice);
    }

    return products;
  }

  private async extractProducts(maxResults: number): Promise<Product[]> {
    const products: Product[] = [];

    const productCards = await this.page.$$(this.selectors.productCard);
    const cardsToProcess = productCards.slice(0, maxResults);

    for (const card of cardsToProcess) {
      try {
        // Skip sponsored/ad cards without ASIN
        const asin = await card.getAttribute('data-asin');
        if (!asin) continue;

        // Extract product name
        const nameEl = await card.$(this.selectors.productName);
        const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';
        if (!name) continue;

        // Extract price - Amazon uses .a-offscreen for the actual price
        let price = 0;
        const priceEl = await card.$('.a-price .a-offscreen');
        if (priceEl) {
          const priceText = await priceEl.textContent() || '';
          price = this.parsePrice(priceText);
        }
        if (price === 0) {
          // Try alternative price selector
          const altPriceEl = await card.$('.a-price-whole');
          if (altPriceEl) {
            const priceText = await altPriceEl.textContent() || '';
            price = this.parsePrice(priceText);
          }
        }
        if (price === 0) continue; // Skip items without price

        // Extract product link
        const linkEl = await card.$('h2 a, a.a-link-normal.s-no-outline');
        const href = linkEl ? await linkEl.getAttribute('href') : null;
        if (!href) continue;
        const productUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

        // Extract image
        const imageEl = await card.$(this.selectors.productImage);
        const imageUrl = imageEl ? await imageEl.getAttribute('src') : undefined;

        // Extract rating
        const ratingEl = await card.$('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt');
        const ratingText = ratingEl ? (await ratingEl.textContent()) || '' : '';
        const rating = this.parseRating(ratingText);

        // Extract review count
        const reviewEl = await card.$('.a-size-base.s-underline-text, span[aria-label*="reviews"]');
        const reviewText = reviewEl ? (await reviewEl.textContent()) || '' : '';
        const reviewCount = this.parseReviewCount(reviewText);

        products.push({
          id: asin,
          name,
          price,
          currency: 'ZAR',
          rating: rating || undefined,
          reviewCount: reviewCount || undefined,
          imageUrl: imageUrl || undefined,
          productUrl,
          site: this.siteId,
          inStock: true // Search results typically show in-stock items
        });
      } catch (e) {
        console.error('[AmazonAdapter] Error extracting product:', e);
        continue;
      }
    }

    return products;
  }

  async getProduct(productUrl: string): Promise<Product> {
    await this.page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();

    // Extract ASIN from URL or page
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]+)/i) ||
                      productUrl.match(/\/product\/([A-Z0-9]+)/i);
    const id = asinMatch ? asinMatch[1] : '';

    // Extract product details
    const name = await this.safeGetText('#productTitle, #title');

    // Price extraction - Amazon has complex price structures
    let priceText = await this.safeGetText('.a-price .a-offscreen');
    if (!priceText) {
      priceText = await this.safeGetText('#priceblock_ourprice, #priceblock_dealprice, .a-price-whole');
    }
    const price = this.parsePrice(priceText);

    const imageUrl = await this.safeGetAttribute('#landingImage, #imgBlkFront', 'src');

    // Rating
    const ratingText = await this.safeGetText('#acrPopover .a-icon-alt, .a-icon-star .a-icon-alt');
    const rating = this.parseRating(ratingText);

    // Review count
    const reviewText = await this.safeGetText('#acrCustomerReviewText');
    const reviewCount = this.parseReviewCount(reviewText);

    // Check stock status
    const availability = await this.safeGetText('#availability span');
    const inStock = !availability.toLowerCase().includes('unavailable') &&
                    !availability.toLowerCase().includes('out of stock');

    return {
      id,
      name,
      price,
      currency: 'ZAR',
      rating: rating || undefined,
      reviewCount: reviewCount || undefined,
      imageUrl: imageUrl || undefined,
      productUrl,
      site: this.siteId,
      inStock
    };
  }

  async addToCart(productUrl: string, quantity = 1): Promise<boolean> {
    await this.page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();

    // Find and click add to cart button
    const addToCartBtn = await this.page.$(this.selectors.addToCart);
    if (!addToCartBtn) {
      console.error('[AmazonAdapter] Add to cart button not found');
      return false;
    }

    await addToCartBtn.click();

    // Wait for cart update or redirect to cart page
    await this.page.waitForTimeout(3000);

    // Check for success - either on cart page or showing confirmation
    const cartConfirmation = await this.page.$('#sw-atc-confirmation, #hlb-subcart, #nav-cart-count');
    return cartConfirmation !== null;
  }

  async getCheckoutPreview(): Promise<{
    items: Array<{ name: string; price: number; quantity: number }>;
    subtotal: number;
    shipping: number;
    total: number;
  }> {
    // Navigate to cart
    await this.page.goto(`${this.baseUrl}/gp/cart/view.html`, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();

    // Extract cart items
    const items: Array<{ name: string; price: number; quantity: number }> = [];
    const cartItems = await this.page.$$('.sc-list-item, [data-asin]');

    for (const item of cartItems) {
      const asin = await item.getAttribute('data-asin');
      if (!asin) continue;

      const name = await item.$eval('.sc-product-title, .a-truncate-cut', el => el.textContent?.trim() || '').catch(() => '');
      const priceText = await item.$eval('.sc-price, .a-price .a-offscreen', el => el.textContent || '').catch(() => '');
      const qtyText = await item.$eval('.a-dropdown-prompt, input[name="quantity"]', el => (el as HTMLInputElement).value || el.textContent || '1').catch(() => '1');

      if (name) {
        items.push({
          name,
          price: this.parsePrice(priceText),
          quantity: parseInt(qtyText, 10) || 1
        });
      }
    }

    // Extract totals
    const subtotalText = await this.safeGetText('#sc-subtotal-amount-activecart .a-price .a-offscreen, #sc-subtotal-amount-buybox');
    const shippingText = await this.safeGetText('.shipping-cost, #shipping-cost');
    const totalText = await this.safeGetText('.grand-total-price, #sc-subtotal-amount-activecart');

    const subtotal = this.parsePrice(subtotalText);

    return {
      items,
      subtotal,
      shipping: this.parsePrice(shippingText),
      total: this.parsePrice(totalText) || subtotal
    };
  }

  async isAuthenticated(): Promise<boolean> {
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });

    // Check for personalized greeting
    const accountText = await this.safeGetText('#nav-link-accountList-nav-line-1');

    // If it shows "Hello, Sign in" user is not authenticated
    const notLoggedIn = accountText.toLowerCase().includes('sign in') ||
                        accountText.toLowerCase().includes('hello, sign in');

    return !notLoggedIn;
  }
}
