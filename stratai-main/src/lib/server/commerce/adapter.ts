/**
 * Commerce Adapter - HTTP client for MCP Commerce Server
 */

import type {
  CommerceSiteId,
  CommerceProduct,
  CommerceSearchResponse,
  CommerceCheckoutPreview,
  CommerceOrderConfirmation
} from '$lib/types/commerce';

const MCP_COMMERCE_URL = process.env.MCP_COMMERCE_URL || 'http://localhost:9223';
const REQUEST_TIMEOUT = 35000; // 35 seconds (slightly more than server's 30s timeout)

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make a request to the MCP Commerce server
 */
async function mcpRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${MCP_COMMERCE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json() as ApiResponse<T>;

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Request failed with status ${response.status}`);
    }

    return result.data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Commerce request timed out');
    }
    throw error;
  }
}

/**
 * Search for products across multiple sites
 */
export async function searchProducts(
  query: string,
  sites: CommerceSiteId[],
  options?: {
    maxPrice?: number;
    sessionId?: string;
  }
): Promise<CommerceSearchResponse> {
  return mcpRequest<CommerceSearchResponse>('/tools/search', {
    query,
    sites,
    maxPrice: options?.maxPrice,
    sessionId: options?.sessionId
  });
}

/**
 * Get detailed product information
 */
export async function getProduct(
  productUrl: string,
  site: CommerceSiteId,
  sessionId?: string
): Promise<{ product: CommerceProduct; screenshot?: string; sessionId: string }> {
  return mcpRequest('/tools/product', {
    productUrl,
    site,
    sessionId
  });
}

/**
 * Add a product to the cart
 */
export async function addToCart(
  productUrl: string,
  site: CommerceSiteId,
  sessionId: string,
  quantity?: number
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  return mcpRequest('/tools/cart', {
    productUrl,
    site,
    sessionId,
    quantity
  });
}

/**
 * Get checkout preview
 */
export async function getCheckoutPreview(
  site: CommerceSiteId,
  sessionId: string
): Promise<CommerceCheckoutPreview> {
  return mcpRequest<CommerceCheckoutPreview>('/tools/checkout', {
    site,
    sessionId,
    useSavedPayment: true
  });
}

/**
 * Confirm purchase (DEMO MODE - does not actually purchase)
 */
export async function confirmPurchase(
  site: CommerceSiteId,
  sessionId: string
): Promise<CommerceOrderConfirmation> {
  return mcpRequest<CommerceOrderConfirmation>('/tools/checkout/confirm', {
    site,
    sessionId,
    confirmPurchase: true
  });
}

/**
 * Check if MCP Commerce server is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MCP_COMMERCE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json() as { status: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}
