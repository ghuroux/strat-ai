/**
 * Commerce Types - Shared types for commerce tool integration
 */

export type CommerceSiteId = 'takealot' | 'amazon';

export interface CommerceProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  imageBase64?: string;
  productUrl: string;
  site: CommerceSiteId;
  inStock: boolean;
  seller?: string;
}

export interface CommerceSearchResult {
  site: CommerceSiteId;
  products: CommerceProduct[];
  screenshot?: string;
  error?: string;
  searchUrl: string;
}

export interface CommerceSearchResponse {
  results: CommerceSearchResult[];
  sessionId: string;
}

export interface CommerceCheckoutPreview {
  items: CommerceCartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  savedPaymentAvailable: boolean;
  screenshot?: string;
}

export interface CommerceCartItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CommerceOrderConfirmation {
  success: boolean;
  orderId?: string;
  estimatedDelivery?: string;
  total: number;
  currency: string;
  screenshot?: string;
  error?: string;
}

// Badge types for product comparison
export type ProductBadge = 'best_value' | 'cheapest' | 'highest_rated' | 'most_reviews' | 'budget' | 'sweet_spot' | 'premium';

// Price tier for categorizing products by price
export type PriceTier = 'budget' | 'sweet_spot' | 'premium';

export interface CommerceProductWithBadges extends CommerceProduct {
  badges: ProductBadge[];
  priceTier?: PriceTier;
}

// Purchase flow types (mirrors backend)
export type PurchaseStatus =
  | 'authenticating'
  | 'adding_to_cart'
  | 'checkout'
  | 'awaiting_payment'
  | 'complete'
  | 'failed';

export type PurchaseErrorCode =
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'PAYMENT_DECLINED'
  | 'SESSION_EXPIRED'
  | 'NOT_AUTHENTICATED'
  | 'LOGIN_FAILED'
  | 'TIMEOUT'
  | 'CHECKOUT_FAILED'
  | 'UNKNOWN';

export interface BuyResponse {
  success: boolean;
  orderId?: string;
  orderUrl?: string;
  estimatedDelivery?: string;
  total?: number;
  error?: string;
  errorCode?: PurchaseErrorCode;
  newPrice?: number;
  status: PurchaseStatus;
}

// Message commerce content for chat display
export interface CommerceMessageContent {
  type: 'search_results' | 'product_details' | 'checkout_preview' | 'order_confirmation';
  searchResults?: {
    query: string;
    products: CommerceProductWithBadges[];
  };
  productDetails?: CommerceProduct;
  checkoutPreview?: CommerceCheckoutPreview;
  orderConfirmation?: CommerceOrderConfirmation;
}
