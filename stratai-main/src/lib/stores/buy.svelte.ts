/**
 * Buy Store - State management for agentic buy modal flow
 *
 * Svelte 5 runes-based store for managing the agentic buy modal state.
 * This store handles the flow: confirm → streaming progress → awaiting_payment → success/error
 *
 * The agentic flow uses SSE streaming to show real-time progress with screenshots
 * as Claude AI navigates the checkout process visually.
 */

import type { CommerceProductWithBadges, CommerceOrderConfirmation, PurchaseStatus } from '$lib/types/commerce';

interface BuyState {
  isOpen: boolean;
  product: CommerceProductWithBadges | null;
  status: 'idle' | 'confirm' | 'processing' | 'awaiting_payment' | 'confirming' | 'success' | 'error';
  currentStep: PurchaseStatus | null;
  stepDescription: string | null;
  orderId: string | null;
  orderUrl: string | null;
  estimatedDelivery: string | null;
  total: number | null;
  error: string | null;
  errorCode: string | null;
  newPrice: number | null;
  // Agentic flow state
  sessionId: string | null;
  screenshotBase64: string | null;
  iteration: number;
  checkoutTotal: number | null;
  // EventSource reference for cleanup
  eventSource: EventSource | null;
}

// Create reactive state with Svelte 5 runes
let state = $state<BuyState>({
  isOpen: false,
  product: null,
  status: 'idle',
  currentStep: null,
  stepDescription: null,
  orderId: null,
  orderUrl: null,
  estimatedDelivery: null,
  total: null,
  error: null,
  errorCode: null,
  newPrice: null,
  sessionId: null,
  screenshotBase64: null,
  iteration: 0,
  checkoutTotal: null,
  eventSource: null
});

const MCP_COMMERCE_URL = 'http://localhost:9223';

/**
 * Open buy modal with product
 */
export function openBuyModal(product: CommerceProductWithBadges) {
  state.isOpen = true;
  state.product = product;
  state.status = 'confirm';
  state.currentStep = null;
  state.stepDescription = null;
  state.orderId = null;
  state.orderUrl = null;
  state.estimatedDelivery = null;
  state.total = null;
  state.error = null;
  state.errorCode = null;
  state.newPrice = null;
  state.sessionId = null;
  state.screenshotBase64 = null;
  state.iteration = 0;
  state.checkoutTotal = null;
  state.eventSource = null;
}

/**
 * Start agentic purchase with SSE streaming
 */
export function startAgenticPurchase() {
  if (!state.product) return;

  state.status = 'processing';
  state.currentStep = 'authenticating';
  state.stepDescription = 'Starting purchase...';
  state.error = null;
  state.screenshotBase64 = null;
  state.iteration = 0;

  // Close any existing EventSource
  if (state.eventSource) {
    state.eventSource.close();
  }

  // Create new EventSource for SSE
  // Note: EventSource only supports GET, but we need POST for body
  // So we'll use fetch with readable stream instead
  startStreamingPurchase();
}

/**
 * Internal: Start streaming purchase using fetch
 */
async function startStreamingPurchase() {
  if (!state.product) return;

  try {
    const response = await fetch(`${MCP_COMMERCE_URL}/buy/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: state.product.site,
        productUrl: state.product.productUrl,
        productName: state.product.name,
        expectedPrice: state.product.price,
        currency: state.product.currency
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Connection failed' }));
      setPurchaseError(errorData.error || 'Failed to start purchase');
      return;
    }

    if (!response.body) {
      setPurchaseError('No response body');
      return;
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent && currentData) {
          // End of event, process it
          handleSSEEvent(currentEvent, currentData);
          currentEvent = '';
          currentData = '';
        }
      }
    }

  } catch (err) {
    console.error('[BuyStore] Streaming error:', err);
    setPurchaseError(err instanceof Error ? err.message : 'Connection error');
  }
}

/**
 * Handle SSE event
 */
function handleSSEEvent(event: string, data: string) {
  try {
    const parsed = JSON.parse(data);

    switch (event) {
      case 'progress':
        handleProgressEvent(parsed);
        break;
      case 'result':
        handleResultEvent(parsed);
        break;
      case 'error':
        setPurchaseError(parsed.message || 'Unknown error', parsed.errorCode);
        break;
      default:
        console.log('[BuyStore] Unknown event:', event, parsed);
    }
  } catch (err) {
    console.error('[BuyStore] Error parsing SSE event:', err, data);
  }
}

/**
 * Handle progress event from stream
 */
function handleProgressEvent(progress: {
  status: PurchaseStatus;
  step: string;
  screenshotBase64?: string;
  iteration?: number;
  checkoutTotal?: number;
}) {
  state.currentStep = progress.status;
  state.stepDescription = progress.step;

  if (progress.screenshotBase64) {
    state.screenshotBase64 = progress.screenshotBase64;
  }
  if (progress.iteration !== undefined) {
    state.iteration = progress.iteration;
  }
  if (progress.checkoutTotal !== undefined) {
    state.checkoutTotal = progress.checkoutTotal;
  }
}

/**
 * Handle result event from stream
 */
function handleResultEvent(result: {
  success: boolean;
  status: PurchaseStatus;
  orderId?: string;
  orderUrl?: string;
  total?: number;
  error?: string;
  errorCode?: string;
  newPrice?: number;
  screenshotBase64?: string;
  sessionId?: string;
}) {
  if (result.status === 'awaiting_payment') {
    // Waiting for human confirmation
    state.status = 'awaiting_payment';
    state.currentStep = 'awaiting_payment';
    state.sessionId = result.sessionId || null;
    state.checkoutTotal = result.total || null;
    if (result.screenshotBase64) {
      state.screenshotBase64 = result.screenshotBase64;
    }
  } else if (result.success) {
    // Purchase complete
    state.status = 'success';
    state.currentStep = 'complete';
    state.orderId = result.orderId || null;
    state.orderUrl = result.orderUrl || null;
    state.total = result.total ?? null;
  } else {
    // Purchase failed
    setPurchaseError(result.error || 'Purchase failed', result.errorCode, result.newPrice);
  }
}

/**
 * Confirm and complete payment after human review
 */
export async function confirmPayment() {
  if (!state.sessionId || !state.product) {
    setPurchaseError('No session to confirm');
    return;
  }

  state.status = 'confirming';
  state.stepDescription = 'Completing purchase...';

  try {
    const response = await fetch(`${MCP_COMMERCE_URL}/buy/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sessionId,
        merchant: state.product.site
      })
    });

    const result = await response.json();

    if (result.success && result.data) {
      setPurchaseSuccess({
        orderId: result.data.orderId,
        orderUrl: result.data.orderUrl,
        total: result.data.total
      });
    } else {
      setPurchaseError(result.error || 'Failed to complete purchase', result.errorCode);
    }
  } catch (err) {
    setPurchaseError(err instanceof Error ? err.message : 'Connection error');
  }
}

/**
 * Legacy: Start purchase (non-streaming, for backwards compatibility)
 */
export function startPurchase() {
  state.status = 'processing';
  state.currentStep = 'authenticating';
  state.error = null;
}

/**
 * Update purchase status/step
 */
export function updatePurchaseStatus(step: PurchaseStatus) {
  state.currentStep = step;
}

/**
 * Set success state (purchase complete)
 */
export function setPurchaseSuccess(result: {
  orderId?: string;
  orderUrl?: string;
  estimatedDelivery?: string;
  total?: number;
}) {
  state.status = 'success';
  state.currentStep = 'complete';
  state.orderId = result.orderId || null;
  state.orderUrl = result.orderUrl || null;
  state.estimatedDelivery = result.estimatedDelivery || null;
  state.total = result.total ?? null;
  state.error = null;
}

/**
 * Set error state (purchase failed)
 */
export function setPurchaseError(error: string, errorCode?: string, newPrice?: number) {
  state.status = 'error';
  state.currentStep = 'failed';
  state.error = error;
  state.errorCode = errorCode || null;
  state.newPrice = newPrice ?? null;
}

/**
 * Close buy modal and reset state
 */
export function closeBuyModal() {
  // Close EventSource if open
  if (state.eventSource) {
    state.eventSource.close();
  }

  state.isOpen = false;
  state.product = null;
  state.status = 'idle';
  state.currentStep = null;
  state.stepDescription = null;
  state.orderId = null;
  state.orderUrl = null;
  state.estimatedDelivery = null;
  state.total = null;
  state.error = null;
  state.errorCode = null;
  state.newPrice = null;
  state.sessionId = null;
  state.screenshotBase64 = null;
  state.iteration = 0;
  state.checkoutTotal = null;
  state.eventSource = null;
}

/**
 * Retry purchase (after error)
 */
export function retryPurchase() {
  state.status = 'confirm';
  state.currentStep = null;
  state.stepDescription = null;
  state.error = null;
  state.errorCode = null;
  state.newPrice = null;
  state.screenshotBase64 = null;
  state.iteration = 0;
  state.sessionId = null;
}

/**
 * Get order confirmation for display/chat
 */
export function getOrderConfirmation(): CommerceOrderConfirmation | null {
  if (state.status !== 'success' || !state.product) return null;

  return {
    success: true,
    orderId: state.orderId || undefined,
    estimatedDelivery: state.estimatedDelivery || undefined,
    total: state.total ?? state.product.price,
    currency: state.product.currency
  };
}

// Export state for direct reactive access in components
export { state as buyState };
