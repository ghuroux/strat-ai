/**
 * Takealot Site Adapter
 */

import { SiteAdapter, type SearchOptions } from './base.js';
import type { Product, SiteId, SiteSelectors, PurchaseResult, ThreeDSecureInfo } from '../types.js';
import takealotSelectors from '../selectors/takealot.json' with { type: 'json' };

const ORDER_CONFIRMATION_TIMEOUT = 180000; // 3 minutes for 3D Secure

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
    console.log('[TakealotAdapter] Checking authentication status...');

    // Check current URL - if already on Takealot, use current page
    const currentUrl = this.page.url();
    const isOnTakealot = currentUrl.includes('takealot.com');

    if (!isOnTakealot) {
      // Navigate to homepage only if not already on Takealot
      console.log('[TakealotAdapter] Not on Takealot, navigating to homepage...');
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`[TakealotAdapter] Already on Takealot: ${currentUrl}`);
    }

    // Dismiss any Chrome dialogs (password manager, restore pages, etc.)
    try {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }

    // Wait for page to fully render
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('[TakealotAdapter] Network idle timeout, continuing...');
    });
    await this.page.waitForTimeout(2000); // Give JS time to render header

    // Navigate to homepage to check header - most reliable indicator
    // Takealot shows "Login | Register" in header when NOT logged in
    // When logged in, shows "Hi [Name]" instead
    console.log('[TakealotAdapter] Navigating to homepage to check header auth state...');
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(2000);

    // MOST RELIABLE CHECK: Look for "Login" link in header
    // If Login is visible in header, user is NOT authenticated
    try {
      // Check for Login link/button in the header area
      const headerLoginSelectors = [
        'header a:has-text("Login")',
        'nav a:has-text("Login")',
        'a:has-text("Login")',
        '[class*="header"] a:has-text("Login")',
        'a[href*="/account/login"]'
      ];

      for (const selector of headerLoginSelectors) {
        try {
          const loginElement = this.page.locator(selector).first();
          const isVisible = await loginElement.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`[TakealotAdapter] Found Login link in header (${selector}) - NOT authenticated`);
            return false;
          }
        } catch (e) {
          // Continue checking
        }
      }

      // Also check for Register link (often next to Login)
      const registerLocator = this.page.locator('a:has-text("Register")').first();
      const registerVisible = await registerLocator.isVisible().catch(() => false);
      if (registerVisible) {
        console.log('[TakealotAdapter] Found Register link in header - NOT authenticated');
        return false;
      }

    } catch (e) {
      console.log('[TakealotAdapter] Error checking header for Login:', e);
    }

    // If no Login/Register found, check for positive auth indicators
    try {
      // Check for "Hi [Name]" pattern in header (logged in state)
      const hiLocator = this.page.locator('text=/Hi \\w/').first();
      const hiVisible = await hiLocator.isVisible().catch(() => false);
      if (hiVisible) {
        console.log('[TakealotAdapter] Found "Hi [Name]" in header - authenticated');
        return true;
      }

      // Check for account menu/dropdown that only appears when logged in
      const accountMenuSelectors = [
        '[data-ref="account-menu"]',
        'text=My Account',
        'text=Logout'
      ];

      for (const selector of accountMenuSelectors) {
        const locator = this.page.locator(selector).first();
        const isVisible = await locator.isVisible().catch(() => false);
        if (isVisible) {
          // Double-check: "My Account" link exists even when logged out
          // So only trust this if Login is NOT visible
          console.log(`[TakealotAdapter] Found account indicator (${selector}) and no Login link - authenticated`);
          return true;
        }
      }
    } catch (e) {
      console.log('[TakealotAdapter] Error checking auth indicators:', e);
    }

    console.log('[TakealotAdapter] Could not confirm authentication - assuming NOT authenticated');
    return false;
  }

  async login(): Promise<boolean> {
    const creds = this.getCredentials();
    if (!creds) {
      console.error('[TakealotAdapter] No credentials configured');
      throw new Error('Takealot credentials not configured. Set TAKEALOT_EMAIL and TAKEALOT_PASSWORD in .env.local');
    }

    console.log(`[TakealotAdapter] Logging in with email: ${creds.email.substring(0, 3)}***`);

    // Navigate to login page
    await this.page.goto('https://www.takealot.com/account/login', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // Take a screenshot of the login page for debugging
    console.log(`[TakealotAdapter] Login page URL: ${this.page.url()}`);

    // Look for email input - try multiple selectors
    const emailSelectors = [
      '[data-ref="email-input"]',
      'input[name="email"]',
      'input[type="email"]',
      '#email'
    ];

    let emailInput = null;
    let foundEmailSelector = '';
    for (const selector of emailSelectors) {
      emailInput = await this.page.$(selector);
      if (emailInput) {
        foundEmailSelector = selector;
        break;
      }
    }

    if (!emailInput) {
      console.error('[TakealotAdapter] Could not find email input. Tried:', emailSelectors.join(', '));
      // Log what inputs are on the page
      const inputs = await this.page.$$('input');
      console.log(`[TakealotAdapter] Found ${inputs.length} input elements on page`);
      for (const input of inputs.slice(0, 5)) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`[TakealotAdapter]   Input: type=${type}, name=${name}, placeholder=${placeholder}`);
      }
      return false;
    }

    console.log(`[TakealotAdapter] Found email input with selector: ${foundEmailSelector}`);

    // Fill email
    await emailInput.fill(creds.email);
    console.log('[TakealotAdapter] Filled email');
    await this.page.waitForTimeout(500);

    // Look for password input
    const passwordSelectors = [
      '[data-ref="password-input"]',
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ];

    let passwordInput = null;
    let foundPasswordSelector = '';
    for (const selector of passwordSelectors) {
      passwordInput = await this.page.$(selector);
      if (passwordInput) {
        foundPasswordSelector = selector;
        break;
      }
    }

    if (!passwordInput) {
      console.error('[TakealotAdapter] Could not find password input. Tried:', passwordSelectors.join(', '));
      return false;
    }

    console.log(`[TakealotAdapter] Found password input with selector: ${foundPasswordSelector}`);

    // Fill password
    await passwordInput.fill(creds.password);
    console.log('[TakealotAdapter] Filled password');
    await this.page.waitForTimeout(500);

    // Click login button - try CSS selectors first, then text matching
    const cssLoginSelectors = [
      '[data-ref="login-submit-button"]',
      'button[type="submit"]'
    ];

    let loginBtn = null;
    let foundLoginSelector = '';
    for (const selector of cssLoginSelectors) {
      loginBtn = await this.page.$(selector);
      if (loginBtn) {
        foundLoginSelector = selector;
        break;
      }
    }

    // If not found, try text-based matching using locator
    if (!loginBtn) {
      const loginLocator = this.page.locator('button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
      const isVisible = await loginLocator.isVisible().catch(() => false);
      if (isVisible) {
        loginBtn = await loginLocator.elementHandle();
        foundLoginSelector = 'text-based locator';
      }
    }

    if (!loginBtn) {
      console.error('[TakealotAdapter] Could not find login button');
      // Log what buttons are on the page
      const buttons = await this.page.$$('button');
      console.log(`[TakealotAdapter] Found ${buttons.length} buttons on page`);
      for (const btn of buttons.slice(0, 5)) {
        const text = await btn.textContent();
        const type = await btn.getAttribute('type');
        console.log(`[TakealotAdapter]   Button: text="${text?.trim()}", type=${type}`);
      }
      return false;
    }

    console.log(`[TakealotAdapter] Found login button with: ${foundLoginSelector}`);
    console.log('[TakealotAdapter] Clicking login button...');
    await loginBtn.click();

    // Wait for navigation away from login page - this is the key!
    console.log('[TakealotAdapter] Waiting for login to complete (URL change)...');
    try {
      // Wait for URL to NOT contain /login anymore (max 15 seconds)
      await this.page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
      console.log('[TakealotAdapter] URL changed - login redirect detected');
    } catch (e) {
      console.log('[TakealotAdapter] Login URL change timeout - checking if still on login page');
    }

    // Wait for the new page to fully load
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('[TakealotAdapter] Network idle timeout after login, continuing...');
    });

    // Additional wait for header to fully render
    await this.page.waitForTimeout(3000);
    console.log(`[TakealotAdapter] After login, URL is: ${this.page.url()}`);

    // Try to dismiss Chrome's password manager dialog using keyboard only
    // DON'T click any buttons on the page as they might interfere
    try {
      console.log('[TakealotAdapter] Attempting to dismiss browser dialogs with keyboard...');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }

    // DO NOT click any buttons after login - they might interfere with the session
    // Just use keyboard to dismiss any browser dialogs
    console.log('[TakealotAdapter] Waiting for page to settle after login...');
    await this.page.waitForTimeout(2000);

    // Verify login was successful
    const isLoggedIn = await this.isAuthenticated();
    console.log(`[TakealotAdapter] Login ${isLoggedIn ? 'successful' : 'failed'}`);

    return isLoggedIn;
  }

  async purchase(productUrl: string, expectedPrice?: number): Promise<PurchaseResult> {
    console.log(`[TakealotAdapter] Starting purchase for: ${productUrl}`);

    try {
      // Step 1: Navigate to product and verify availability
      await this.page.goto(productUrl, { waitUntil: 'domcontentloaded' });

      // Wait for network to be mostly idle (JavaScript to finish rendering)
      console.log('[TakealotAdapter] Waiting for page to render...');
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        console.log('[TakealotAdapter] Network idle timeout, continuing anyway...');
      });

      // Dismiss any Chrome dialogs (like "Restore pages?")
      try {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
      } catch (e) {
        // Ignore
      }

      // Wait for the page content to actually render - look for the product title or price
      console.log('[TakealotAdapter] Waiting for product content to load...');
      await this.page.waitForSelector('h1, .product-title, [data-ref="product-title"]', { timeout: 10000 }).catch(() => {
        console.log('[TakealotAdapter] Product title not found, page may not have loaded');
      });

      // Also wait a moment for the buybox to render (it's often async)
      await this.page.waitForTimeout(1000);

      // Check stock status - use multiple approaches to find Add to Cart / Buy button
      // Takealot uses "Add to Cart" buttons with data-ref="add-to-cart-button"
      // First, wait specifically for the Add to Cart button to appear
      console.log('[TakealotAdapter] Looking for Add to Cart button...');
      let addToCartBtn = await this.page.waitForSelector('[data-ref="add-to-cart-button"]', { timeout: 5000 }).catch(() => null);

      // If not found via waitForSelector, try immediate lookup with multiple selectors
      if (!addToCartBtn) {
        console.log('[TakealotAdapter] waitForSelector failed, trying direct lookup...');
        addToCartBtn = await this.page.$('[data-ref="add-to-cart-button"], [data-ref="buy-button"], button[class*="add-to-cart"], button[class*="buy-button"], .add-to-cart-button, .buy-button, #add-to-cart');
      }

      // If not found, try using locator with text matching (more flexible)
      // Takealot uses "Buy" not "Add to Cart"!
      if (!addToCartBtn) {
        console.log('[TakealotAdapter] Buy button not found via CSS, trying text matching...');
        const buyLocator = this.page.locator('button:has-text("Buy"), button:has-text("Add to Cart"), button:has-text("Add To Cart"), button:has-text("Add to Basket")').first();
        const isVisible = await buyLocator.isVisible().catch(() => false);
        if (isVisible) {
          addToCartBtn = await buyLocator.elementHandle();
          console.log('[TakealotAdapter] Found Buy button via text matching');
        }
      }

      // Try looking for any button with "buy" or "cart" in its class or text
      if (!addToCartBtn) {
        console.log('[TakealotAdapter] Still not found, trying broader search...');
        const buttons = await this.page.$$('button');
        console.log(`[TakealotAdapter] Found ${buttons.length} buttons on product page`);
        for (const btn of buttons) {
          const text = await btn.textContent();
          const className = await btn.getAttribute('class') || '';
          const textLower = text?.toLowerCase() || '';
          const classLower = className.toLowerCase();

          // Log each button for debugging
          if (text?.trim()) {
            console.log(`[TakealotAdapter]   Button: "${text.trim().substring(0, 30)}" class: ${className.substring(0, 50)}`);
          }

          if (textLower === 'buy' ||  // Exact match for "Buy"
              textLower.includes('add to cart') ||
              textLower.includes('add to basket') ||
              classLower.includes('add-to-cart') ||
              classLower.includes('addtocart') ||
              classLower.includes('buy-button') ||
              classLower.includes('buybox')) {
            addToCartBtn = btn;
            console.log(`[TakealotAdapter] Found button via broad search: "${text?.trim()}"`);
            break;
          }
        }
      }

      if (!addToCartBtn) {
        // Log what we can see on the page for debugging
        const pageContent = await this.page.content();
        const hasBuy = pageContent.toLowerCase().includes('>buy<');
        const hasAddToCart = pageContent.toLowerCase().includes('add to cart');
        console.log(`[TakealotAdapter] Page contains "buy" button: ${hasBuy}, "add to cart": ${hasAddToCart}`);
        console.log(`[TakealotAdapter] Current URL: ${this.page.url()}`);

        return {
          success: false,
          total: 0,
          currency: 'ZAR',
          error: 'Product is out of stock or Buy button not found',
          errorCode: 'OUT_OF_STOCK',
          status: 'failed'
        };
      }

      // Check price if expected price provided
      if (expectedPrice !== undefined) {
        const priceText = await this.safeGetText('.buybox-module_price, [data-ref="price"], .price');
        const currentPrice = this.parsePrice(priceText);

        // Allow 1% tolerance for price changes
        const priceDiff = Math.abs(currentPrice - expectedPrice) / expectedPrice;
        if (priceDiff > 0.01) {
          return {
            success: false,
            total: currentPrice,
            currency: 'ZAR',
            error: `Price changed from R${expectedPrice.toFixed(2)} to R${currentPrice.toFixed(2)}`,
            errorCode: 'PRICE_CHANGED',
            newPrice: currentPrice,
            status: 'failed'
          };
        }
      }

      // Step 2: Add to cart
      console.log('[TakealotAdapter] Adding to cart...');
      await addToCartBtn.click();
      await this.page.waitForTimeout(2000);

      // Step 3: Go to cart
      console.log('[TakealotAdapter] Navigating to cart...');
      await this.page.goto(`${this.baseUrl}/cart`, { waitUntil: 'domcontentloaded' });

      // Wait for cart page to render
      console.log('[TakealotAdapter] Waiting for cart to load...');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('[TakealotAdapter] Cart network idle timeout, continuing...');
      });

      // Dismiss any dialogs
      try {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
      } catch (e) {
        // Ignore
      }

      // Step 4: Click checkout button - Takealot uses "Proceed to Checkout"
      console.log('[TakealotAdapter] Looking for checkout button...');

      // First, wait for the checkout button to appear
      let checkoutBtn = await this.page.waitForSelector('[data-ref="checkout-button"], [data-ref="proceed-to-checkout"]', { timeout: 5000 }).catch(() => null);

      // If not found via data-ref, try other CSS selectors
      if (!checkoutBtn) {
        const cssCheckoutSelectors = [
          '.checkout-button',
          'a[href*="checkout"]',
          'button[class*="checkout"]',
          'a[class*="checkout"]'
        ];

        for (const selector of cssCheckoutSelectors) {
          checkoutBtn = await this.page.$(selector);
          if (checkoutBtn) {
            console.log(`[TakealotAdapter] Found checkout via CSS: ${selector}`);
            break;
          }
        }
      }

      // Try text matching using locator - Takealot uses "Proceed to Checkout"
      if (!checkoutBtn) {
        console.log('[TakealotAdapter] Trying text matching for checkout button...');
        const checkoutLocator = this.page.locator('button:has-text("Proceed to Checkout"), a:has-text("Proceed to Checkout"), button:has-text("Checkout"), a:has-text("Checkout")').first();
        if (await checkoutLocator.isVisible().catch(() => false)) {
          checkoutBtn = await checkoutLocator.elementHandle();
          console.log('[TakealotAdapter] Found checkout via text matching');
        }
      }

      if (!checkoutBtn) {
        console.error('[TakealotAdapter] Could not find checkout button');
        // Log what buttons are visible for debugging
        const allButtons = await this.page.$$('button, a[class*="button"]');
        console.log(`[TakealotAdapter] Found ${allButtons.length} button elements on cart page`);
        for (const btn of allButtons.slice(0, 8)) {
          const text = await btn.textContent().catch(() => '');
          if (text?.trim()) {
            console.log(`[TakealotAdapter]   Button: "${text.trim().substring(0, 40)}"`);
          }
        }
        return {
          success: false,
          total: 0,
          currency: 'ZAR',
          error: 'Could not find checkout button',
          errorCode: 'CHECKOUT_FAILED',
          status: 'failed'
        };
      }

      console.log('[TakealotAdapter] Proceeding to checkout...');
      await checkoutBtn.click();
      await this.page.waitForTimeout(3000);
      await this.waitForPageReady();

      // Step 5: Look for "Place Order" / "Confirm Order" button - CSS first, then text
      const cssPlaceOrderSelectors = [
        '[data-ref="place-order-button"]',
        '.place-order-button',
        'button[class*="place-order"]',
        'button[class*="confirm-order"]'
      ];

      let placeOrderBtn = null;
      for (const selector of cssPlaceOrderSelectors) {
        placeOrderBtn = await this.page.$(selector);
        if (placeOrderBtn) break;
      }

      // Try text matching using locator
      if (!placeOrderBtn) {
        const placeOrderLocator = this.page.locator('button:has-text("Place Order"), button:has-text("Confirm Order"), button:has-text("Complete Purchase"), button:has-text("Pay Now")').first();
        if (await placeOrderLocator.isVisible().catch(() => false)) {
          placeOrderBtn = await placeOrderLocator.elementHandle();
        }
      }

      if (!placeOrderBtn) {
        // Try waiting a bit longer - checkout page might still be loading
        await this.page.waitForTimeout(2000);

        // Retry CSS selectors
        for (const selector of cssPlaceOrderSelectors) {
          placeOrderBtn = await this.page.$(selector);
          if (placeOrderBtn) break;
        }

        // Retry text matching
        if (!placeOrderBtn) {
          const placeOrderLocator = this.page.locator('button:has-text("Place Order"), button:has-text("Confirm Order"), button:has-text("Complete Purchase"), button:has-text("Pay Now")').first();
          if (await placeOrderLocator.isVisible().catch(() => false)) {
            placeOrderBtn = await placeOrderLocator.elementHandle();
          }
        }
      }

      if (!placeOrderBtn) {
        console.error('[TakealotAdapter] Could not find place order button');
        return {
          success: false,
          total: 0,
          currency: 'ZAR',
          error: 'Could not find place order button. Check that delivery and payment details are configured.',
          errorCode: 'CHECKOUT_FAILED',
          status: 'failed'
        };
      }

      // Step 6: Click place order
      console.log('[TakealotAdapter] Placing order...');
      await placeOrderBtn.click();

      // Step 7: Wait for order confirmation (handles 3D Secure)
      const confirmation = await this.waitForOrderConfirmation(ORDER_CONFIRMATION_TIMEOUT);

      if (!confirmation.success) {
        return {
          success: false,
          total: 0,
          currency: 'ZAR',
          error: 'Order was not confirmed. Payment may have been declined or 3D Secure timed out.',
          errorCode: 'PAYMENT_DECLINED',
          status: 'failed'
        };
      }

      // Extract total from confirmation page
      const totalText = await this.safeGetText('.order-total, [data-ref="order-total"], .total');
      const total = this.parsePrice(totalText);

      // Extract estimated delivery
      const deliveryText = await this.safeGetText('.delivery-date, [data-ref="delivery-date"], .estimated-delivery');

      console.log(`[TakealotAdapter] Order placed successfully! Order ID: ${confirmation.orderId}`);

      return {
        success: true,
        orderId: confirmation.orderId,
        orderUrl: this.page.url(),
        estimatedDelivery: deliveryText || undefined,
        total,
        currency: 'ZAR',
        status: 'complete'
      };

    } catch (error) {
      console.error('[TakealotAdapter] Purchase error:', error);
      return {
        success: false,
        total: 0,
        currency: 'ZAR',
        error: error instanceof Error ? error.message : 'Unknown error during purchase',
        errorCode: 'UNKNOWN',
        status: 'failed'
      };
    }
  }

  async detect3DSecure(): Promise<ThreeDSecureInfo> {
    // Check for 3D Secure iframe
    const iframes = await this.page.$$('iframe');

    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      const name = await iframe.getAttribute('name');

      // Look for common 3DS indicators
      if (src?.includes('3ds') ||
          src?.includes('acs') ||
          src?.includes('secure') ||
          name?.includes('3ds') ||
          name?.includes('secure')) {
        return { detected: true, type: 'iframe' };
      }
    }

    // Check URL for 3DS redirect
    const currentUrl = this.page.url();
    if (currentUrl.includes('3ds') ||
        currentUrl.includes('/secure/') ||
        currentUrl.includes('authenticate')) {
      return { detected: true, type: 'redirect' };
    }

    // Check for common 3DS modal content
    const threeDsContent = await this.page.$('[class*="3ds"], [class*="secure-payment"], [id*="3ds"]');
    if (threeDsContent) {
      return { detected: true, type: 'unknown' };
    }

    return { detected: false };
  }

  async waitForOrderConfirmation(timeout = ORDER_CONFIRMATION_TIMEOUT): Promise<{ orderId?: string; success: boolean }> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    console.log('[TakealotAdapter] Waiting for order confirmation (may require 3D Secure)...');

    while (Date.now() - startTime < timeout) {
      // Check for 3D Secure
      const threeDs = await this.detect3DSecure();
      if (threeDs.detected) {
        console.log('[TakealotAdapter] 3D Secure detected. Waiting for user to complete verification...');
        await this.page.waitForTimeout(checkInterval);
        continue;
      }

      // Check if we're on order confirmation page
      const currentUrl = this.page.url();

      if (currentUrl.includes('/orders/') ||
          currentUrl.includes('/order-confirmation') ||
          currentUrl.includes('/checkout/complete') ||
          currentUrl.includes('/thank-you')) {

        // Try to extract order ID
        const orderIdSelectors = [
          '[data-ref="order-id"]',
          '.order-id',
          '.order-number',
          'span:has-text("Order")'
        ];

        for (const selector of orderIdSelectors) {
          const el = await this.page.$(selector);
          if (el) {
            const text = await el.textContent();
            // Extract order ID from text (e.g., "Order #12345" or "12345")
            const match = text?.match(/(?:Order\s*#?\s*)?(\d{5,})/i);
            if (match) {
              return { orderId: match[1], success: true };
            }
          }
        }

        // Check URL for order ID
        const urlMatch = currentUrl.match(/orders?[\/=](\d+)/i);
        if (urlMatch) {
          return { orderId: urlMatch[1], success: true };
        }

        // We're on confirmation page but couldn't extract order ID
        return { success: true };
      }

      // Check for error messages
      const errorEl = await this.page.$('.error-message, [class*="error"], [data-ref="error"]');
      if (errorEl) {
        const errorText = await errorEl.textContent();
        if (errorText?.toLowerCase().includes('payment') ||
            errorText?.toLowerCase().includes('declined') ||
            errorText?.toLowerCase().includes('failed')) {
          console.error('[TakealotAdapter] Payment error detected:', errorText);
          return { success: false };
        }
      }

      await this.page.waitForTimeout(checkInterval);
    }

    console.error('[TakealotAdapter] Order confirmation timeout');
    return { success: false };
  }
}
