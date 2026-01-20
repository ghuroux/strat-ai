/**
 * Takealot Site Adapter
 */

import { SiteAdapter, type SearchOptions } from './base.js';
import type { Product, SiteId, SiteSelectors } from '../types.js';
import takealotSelectors from '../selectors/takealot.json' with { type: 'json' };

export class TakealotAdapter extends SiteAdapter {
  readonly siteId: SiteId = 'takealot';
  readonly baseUrl = 'https://www.takealot.com';
  readonly selectors: SiteSelectors = takealotSelectors as SiteSelectors;

  async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const maxResults = options?.maxResults ?? 10;
    const maxPrice = options?.maxPrice;

    // Navigate to search results directly
    const searchUrl = `${this.baseUrl}/all?qsearch=${encodeURIComponent(query)}`;
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
        // Extract product name
        const nameEl = await card.$(this.selectors.productName);
        const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';
        if (!name) continue;

        // Extract price
        const priceEl = await card.$(this.selectors.productPrice);
        const priceText = priceEl ? (await priceEl.textContent()) || '' : '';
        const price = this.parsePrice(priceText);
        if (price === 0) continue;

        // Extract product link
        const linkEl = await card.$(this.selectors.productLink);
        const href = linkEl ? await linkEl.getAttribute('href') : null;
        if (!href) continue;
        const productUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

        // Extract ID from URL
        const idMatch = productUrl.match(/PLID(\d+)/);
        const id = idMatch ? idMatch[1] : productUrl.split('/').pop() || '';

        // Extract image
        const imageEl = await card.$(this.selectors.productImage);
        const imageUrl = imageEl ? await imageEl.getAttribute('src') || await imageEl.getAttribute('data-src') : undefined;

        // Extract rating
        const ratingEl = await card.$(this.selectors.productRating || '');
        const ratingText = ratingEl ? (await ratingEl.textContent()) || '' : '';
        const rating = this.parseRating(ratingText);

        // Extract review count
        const reviewEl = await card.$(this.selectors.productReviewCount || '');
        const reviewText = reviewEl ? (await reviewEl.textContent()) || '' : '';
        const reviewCount = this.parseReviewCount(reviewText);

        products.push({
          id,
          name,
          price,
          currency: 'ZAR',
          rating: rating || undefined,
          reviewCount: reviewCount || undefined,
          imageUrl: imageUrl || undefined,
          productUrl,
          site: this.siteId,
          inStock: true // Takealot typically only shows in-stock items
        });
      } catch (e) {
        console.error('[TakealotAdapter] Error extracting product:', e);
        continue;
      }
    }

    return products;
  }

  async getProduct(productUrl: string): Promise<Product> {
    await this.page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();

    // Extract product details from product page
    const name = await this.safeGetText('h1, .product-title, [data-ref="product-title"]');
    const priceText = await this.safeGetText('.buybox-module_price, [data-ref="price"], .price');
    const price = this.parsePrice(priceText);

    const imageUrl = await this.safeGetAttribute('.gallery-module_image img, .product-image img', 'src');
    const ratingText = await this.safeGetText('.rating, [data-ref="rating"]');
    const rating = this.parseRating(ratingText);
    const reviewText = await this.safeGetText('.review-count, [data-ref="review-count"]');
    const reviewCount = this.parseReviewCount(reviewText);

    // Check stock status
    const addToCartBtn = await this.page.$(this.selectors.addToCart);
    const inStock = addToCartBtn !== null;

    // Extract ID from URL
    const idMatch = productUrl.match(/PLID(\d+)/);
    const id = idMatch ? idMatch[1] : productUrl.split('/').pop() || '';

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
      console.error('[TakealotAdapter] Add to cart button not found');
      return false;
    }

    await addToCartBtn.click();

    // Wait for cart to update
    await this.page.waitForTimeout(2000);

    // Verify item was added (check cart count or success message)
    const cartCount = await this.safeGetText(this.selectors.cartCount || '');
    return cartCount !== '' && cartCount !== '0';
  }

  async getCheckoutPreview(): Promise<{
    items: Array<{ name: string; price: number; quantity: number }>;
    subtotal: number;
    shipping: number;
    total: number;
  }> {
    // Navigate to cart
    await this.page.goto(`${this.baseUrl}/cart`, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();

    // Extract cart items
    const items: Array<{ name: string; price: number; quantity: number }> = [];
    const cartItems = await this.page.$$('.cart-item, [data-ref="cart-item"]');

    for (const item of cartItems) {
      const name = await item.$eval('.product-title, [data-ref="product-title"]', el => el.textContent?.trim() || '').catch(() => '');
      const priceText = await item.$eval('.price, [data-ref="price"]', el => el.textContent || '').catch(() => '');
      const qtyText = await item.$eval('input[type="number"], .quantity', el => (el as HTMLInputElement).value || el.textContent || '1').catch(() => '1');

      items.push({
        name,
        price: this.parsePrice(priceText),
        quantity: parseInt(qtyText, 10) || 1
      });
    }

    // Extract totals
    const subtotalText = await this.safeGetText('.subtotal, [data-ref="subtotal"]');
    const shippingText = await this.safeGetText('.shipping, [data-ref="shipping"]');
    const totalText = await this.safeGetText('.total, [data-ref="total"]');

    return {
      items,
      subtotal: this.parsePrice(subtotalText),
      shipping: this.parsePrice(shippingText),
      total: this.parsePrice(totalText)
    };
  }

  async isAuthenticated(): Promise<boolean> {
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });

    // Check for account indicator
    const accountMenu = await this.page.$(this.selectors.loginIndicator || '');
    if (!accountMenu) return false;

    const text = await accountMenu.textContent();
    // If it shows "Login" or "Sign in", user is not authenticated
    const notLoggedIn = text?.toLowerCase().includes('login') ||
                        text?.toLowerCase().includes('sign in') ||
                        text?.toLowerCase().includes('register');

    return !notLoggedIn;
  }
}
