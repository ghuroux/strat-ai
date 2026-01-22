/**
 * Agentic Purchase - AI-driven checkout flow
 *
 * This module orchestrates the full purchase flow:
 * 1. Playwright handles login (credentials never sent to AI)
 * 2. AI visually navigates: add to cart → checkout
 * 3. Human confirms payment (safety stop)
 * 4. AI completes order after confirmation
 *
 * Security Model:
 * - Credentials: Handled by Playwright, never seen by AI
 * - Screenshots: AI only sees visual page state
 * - Payment: Human must confirm before final purchase
 */

import type { Page } from 'playwright';
import { BrowserAgent, type AgentProgress, type AgentResult } from './browser-agent.js';
import type { PurchaseResult, PurchaseStatus } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface AgenticPurchaseOptions {
  productUrl: string;
  productName: string;
  expectedPrice?: number;
  currency?: string;
  stopBeforePayment: boolean; // Safety: pause for human confirmation
}

export interface AgenticPurchaseProgress {
  status: PurchaseStatus;
  step: string;
  screenshotBase64?: string;
  iteration?: number;
  checkoutTotal?: number;
}

export type PurchaseProgressCallback = (progress: AgenticPurchaseProgress) => void;

export interface CheckoutState {
  total?: number;
  screenshotBase64?: string;
  sessionId: string;
  ready: boolean;
}

// ============================================================================
// Agentic Purchase Flow
// ============================================================================

/**
 * Execute agentic purchase flow
 *
 * This function coordinates the entire purchase process using AI vision:
 * 1. Navigate to product page (direct URL)
 * 2. AI adds product to cart (visually finds and clicks button)
 * 3. AI navigates to checkout (visually finds cart/checkout buttons)
 * 4. Stops for human confirmation (safety)
 * 5. After confirmation, AI completes purchase
 */
export async function agenticPurchase(
  page: Page,
  options: AgenticPurchaseOptions,
  onProgress?: PurchaseProgressCallback
): Promise<PurchaseResult> {
  const report = (status: PurchaseStatus, step: string, extra?: Partial<AgenticPurchaseProgress>) => {
    if (onProgress) {
      onProgress({ status, step, ...extra });
    }
  };

  try {
    // Step 1: Navigate to product page
    report('adding_to_cart', 'Navigating to product page');
    console.log(`[AgenticPurchase] Navigating to: ${options.productUrl}`);

    await page.goto(options.productUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('[AgenticPurchase] Network idle timeout, continuing...');
    });

    // Dismiss any initial popups
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);

    // Step 2: AI adds to cart
    report('adding_to_cart', 'Looking for Add to Cart button');

    const addToCartAgent = new BrowserAgent(page, {
      maxIterations: 10,
      onProgress: (p) => {
        report('adding_to_cart', p.step, {
          screenshotBase64: p.screenshotBase64,
          iteration: p.iteration
        });
      }
    });

    const priceContext = options.expectedPrice
      ? `Expected price: ${options.currency || 'R'}${options.expectedPrice}. If the price is significantly different (>10%), return done with { success: false, error: "price_mismatch", currentPrice: X }.`
      : '';

    const addToCartResult = await addToCartAgent.execute(
      `Add the product "${options.productName}" to the cart.

       Steps:
       1. First, verify you're on the product page (look for product name/image)
       2. Find the "Add to Cart", "Buy", or similar button
       3. Click the button
       4. Wait for cart confirmation (popup, badge update, or page change)
       5. Return done with { success: true } when added to cart

       If the product is out of stock, return done with { success: false, error: "out_of_stock" }`,
      priceContext
    );

    if (!addToCartResult.success || addToCartResult.data?.success === false) {
      const errorMsg = addToCartResult.error ||
        (addToCartResult.data?.error as string) ||
        'Failed to add to cart';

      return {
        success: false,
        total: 0,
        currency: options.currency || 'ZAR',
        error: errorMsg,
        errorCode: addToCartResult.data?.error === 'out_of_stock' ? 'OUT_OF_STOCK' :
                   addToCartResult.data?.error === 'price_mismatch' ? 'PRICE_CHANGED' : 'CHECKOUT_FAILED',
        newPrice: addToCartResult.data?.currentPrice as number | undefined,
        status: 'failed'
      };
    }

    console.log('[AgenticPurchase] Added to cart successfully');

    // Step 3: AI navigates to checkout
    report('checkout', 'Navigating to checkout');

    const checkoutAgent = new BrowserAgent(page, {
      maxIterations: 15,
      onProgress: (p) => {
        report('checkout', p.step, {
          screenshotBase64: p.screenshotBase64,
          iteration: p.iteration
        });
      }
    });

    const checkoutResult = await checkoutAgent.execute(
      `Navigate to the checkout page where you can review the order and see payment options.

       Steps:
       1. First, look for a cart icon, "View Cart" link, or cart summary popup
       2. Click to go to the cart page
       3. On the cart page, look for "Checkout", "Proceed to Checkout", or similar button
       4. Click to go to checkout
       5. Stop when you see the checkout page with order summary and payment options
       6. Return done with { success: true, total: X } where X is the order total

       IMPORTANT: Do NOT click any "Place Order" or "Confirm Purchase" buttons - stop at the checkout review page.`
    );

    if (!checkoutResult.success) {
      return {
        success: false,
        total: 0,
        currency: options.currency || 'ZAR',
        error: checkoutResult.error || 'Failed to navigate to checkout',
        errorCode: 'CHECKOUT_FAILED',
        status: 'failed'
      };
    }

    const checkoutTotal = checkoutResult.data?.total as number | undefined;
    const checkoutScreenshot = checkoutResult.screenshotBase64;

    console.log(`[AgenticPurchase] At checkout, total: ${checkoutTotal}`);

    // Step 4: Stop for human confirmation (safety)
    if (options.stopBeforePayment) {
      report('awaiting_payment', 'Ready for payment confirmation', {
        screenshotBase64: checkoutScreenshot,
        checkoutTotal
      });

      return {
        success: true,
        total: checkoutTotal || options.expectedPrice || 0,
        currency: options.currency || 'ZAR',
        status: 'awaiting_payment'
      };
    }

    // Step 5: Complete purchase (only if not stopping for confirmation)
    return await completePurchase(page, onProgress);

  } catch (error) {
    console.error('[AgenticPurchase] Error:', error);
    return {
      success: false,
      total: 0,
      currency: options.currency || 'ZAR',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN',
      status: 'failed'
    };
  }
}

/**
 * Complete the purchase after human confirmation
 *
 * This is called after the user confirms they want to proceed with payment.
 * The AI clicks the final "Place Order" button and waits for confirmation.
 */
export async function completePurchase(
  page: Page,
  onProgress?: PurchaseProgressCallback
): Promise<PurchaseResult> {
  const report = (status: PurchaseStatus, step: string, extra?: Partial<AgenticPurchaseProgress>) => {
    if (onProgress) {
      onProgress({ status, step, ...extra });
    }
  };

  try {
    report('checkout', 'Completing purchase');

    const completeAgent = new BrowserAgent(page, {
      maxIterations: 15,
      onProgress: (p) => {
        report('checkout', p.step, {
          screenshotBase64: p.screenshotBase64,
          iteration: p.iteration
        });
      }
    });

    const result = await completeAgent.execute(
      `Complete the purchase by clicking the final order button.

       Steps:
       1. Find the "Place Order", "Confirm Order", "Complete Purchase", "Pay Now", or similar final button
       2. Click the button to submit the order
       3. Wait for the order confirmation page to load
       4. Look for order number/ID, confirmation message, or "Thank you" text
       5. Return done with { success: true, orderId: "XXX" } where XXX is the order number

       If you see a 3D Secure/bank verification popup:
       - Wait for the user to complete verification
       - Take screenshots periodically to monitor progress
       - Continue when you see the confirmation page

       If payment fails:
       - Return done with { success: false, error: "payment_failed" }`
    );

    if (!result.success || result.data?.success === false) {
      return {
        success: false,
        total: 0,
        currency: 'ZAR',
        error: result.error || (result.data?.error as string) || 'Purchase failed',
        errorCode: 'PAYMENT_DECLINED',
        status: 'failed'
      };
    }

    const orderId = result.data?.orderId as string | undefined;
    const orderUrl = page.url();

    report('complete', 'Order confirmed', {
      screenshotBase64: result.screenshotBase64
    });

    return {
      success: true,
      orderId,
      orderUrl,
      total: (result.data?.total as number) || 0,
      currency: 'ZAR',
      status: 'complete'
    };

  } catch (error) {
    console.error('[AgenticPurchase] Complete error:', error);
    return {
      success: false,
      total: 0,
      currency: 'ZAR',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN',
      status: 'failed'
    };
  }
}

// ============================================================================
// Session State Management
// ============================================================================

/**
 * Store for checkout states awaiting confirmation
 * Key: sessionId, Value: checkout state
 */
const pendingCheckouts = new Map<string, CheckoutState>();

/**
 * Save checkout state for later confirmation
 */
export function saveCheckoutState(sessionId: string, state: Omit<CheckoutState, 'sessionId'>): void {
  pendingCheckouts.set(sessionId, { ...state, sessionId, ready: true });
}

/**
 * Get saved checkout state
 */
export function getCheckoutState(sessionId: string): CheckoutState | undefined {
  return pendingCheckouts.get(sessionId);
}

/**
 * Clear checkout state after completion
 */
export function clearCheckoutState(sessionId: string): void {
  pendingCheckouts.delete(sessionId);
}
