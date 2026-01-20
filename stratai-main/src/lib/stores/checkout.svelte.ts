/**
 * Checkout Store - State management for commerce checkout flow
 *
 * Svelte 5 runes-based store for managing checkout state
 */

import type { CommerceCheckoutPreview, CommerceOrderConfirmation, CommerceSiteId } from '$lib/types/commerce';

interface CheckoutState {
  isOpen: boolean;
  preview: CommerceCheckoutPreview | null;
  site: CommerceSiteId | null;
  sessionId: string | null;
  isProcessing: boolean;
  confirmation: CommerceOrderConfirmation | null;
  error: string | null;
}

// Create reactive state with Svelte 5 runes
let state = $state<CheckoutState>({
  isOpen: false,
  preview: null,
  site: null,
  sessionId: null,
  isProcessing: false,
  confirmation: null,
  error: null
});

/**
 * Open checkout modal with preview data
 */
export function openCheckout(preview: CommerceCheckoutPreview, site: CommerceSiteId, sessionId: string) {
  state.isOpen = true;
  state.preview = preview;
  state.site = site;
  state.sessionId = sessionId;
  state.confirmation = null;
  state.error = null;
  state.isProcessing = false;
}

/**
 * Close checkout modal and reset state
 */
export function closeCheckout() {
  state.isOpen = false;
  state.preview = null;
  state.site = null;
  state.sessionId = null;
  state.isProcessing = false;
  state.confirmation = null;
  state.error = null;
}

/**
 * Start processing (user confirmed purchase)
 */
export function startProcessing() {
  state.isProcessing = true;
  state.error = null;
}

/**
 * Set confirmation (purchase successful)
 */
export function setConfirmation(confirmation: CommerceOrderConfirmation) {
  state.isProcessing = false;
  state.confirmation = confirmation;
}

/**
 * Set error (purchase failed)
 */
export function setError(error: string) {
  state.isProcessing = false;
  state.error = error;
}

/**
 * Get checkout state for components
 */
export function getCheckoutState() {
  return {
    get isOpen() { return state.isOpen; },
    get preview() { return state.preview; },
    get site() { return state.site; },
    get sessionId() { return state.sessionId; },
    get isProcessing() { return state.isProcessing; },
    get confirmation() { return state.confirmation; },
    get error() { return state.error; },
    get hasConfirmation() { return state.confirmation !== null; }
  };
}

// Export state for direct reactive access in components
export { state as checkoutState };
