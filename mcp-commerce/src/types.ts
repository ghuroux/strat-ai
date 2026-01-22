/**
 * MCP Commerce Server - Type Definitions
 */

// Product types
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  imageBase64?: string;
  productUrl: string;
  site: SiteId;
  inStock: boolean;
  seller?: string;
}

export type SiteId = 'takealot' | 'amazon';

export interface SearchRequest {
  query: string;
  sites: SiteId[];
  maxPrice?: number;
  sessionId?: string;
}

export interface SearchResult {
  site: SiteId;
  products: Product[];
  screenshot?: string;
  error?: string;
  searchUrl: string;
}

export interface SearchResponse {
  results: SearchResult[];
  sessionId: string;
}

export interface ProductRequest {
  productUrl: string;
  site: SiteId;
  sessionId?: string;
}

export interface ProductResponse {
  product: Product;
  screenshot?: string;
  sessionId: string;
}

export interface CartRequest {
  productUrl: string;
  site: SiteId;
  quantity?: number;
  sessionId: string;
}

export interface CartResponse {
  success: boolean;
  cartTotal?: number;
  itemCount?: number;
  screenshot?: string;
  error?: string;
}

export interface CheckoutRequest {
  site: SiteId;
  sessionId: string;
  useSavedPayment: boolean;
}

export interface CheckoutPreview {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  savedPaymentAvailable: boolean;
  screenshot?: string;
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CheckoutConfirmRequest {
  site: SiteId;
  sessionId: string;
  confirmPurchase: true;
}

export interface OrderConfirmation {
  success: boolean;
  orderId?: string;
  estimatedDelivery?: string;
  total: number;
  currency: string;
  screenshot?: string;
  error?: string;
}

// Session types
export interface BrowserSession {
  id: string;
  site: SiteId;
  context: import('playwright').BrowserContext;
  page: import('playwright').Page;
  createdAt: Date;
  lastAccessedAt: Date;
  isAuthenticated: boolean;
}

export interface SessionInfo {
  id: string;
  site: SiteId;
  createdAt: string;
  lastAccessedAt: string;
  isAuthenticated: boolean;
}

// Smoke test types
export interface SmokeTestResult {
  site: SiteId;
  test: string;
  passed: boolean;
  error?: string;
  screenshot?: string;
  duration: number;
}

export interface SmokeTestReport {
  timestamp: string;
  passed: boolean;
  results: SmokeTestResult[];
}

// Selector configuration
export interface SiteSelectors {
  searchInput: string;
  searchButton: string;
  searchSubmit?: string;
  productCard: string;
  productName: string;
  productPrice: string;
  productImage: string;
  productLink: string;
  productRating?: string;
  productReviewCount?: string;
  addToCart: string;
  cartIcon?: string;
  cartCount?: string;
  checkoutButton?: string;
  savedPaymentOption?: string;
  confirmPurchase?: string;
  orderConfirmation?: string;
  loginIndicator?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  uptime: number;
  activeSessions: number;
}

// ============================================================================
// Purchase Types - For /buy endpoint and purchase flow
// ============================================================================

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

export type PurchaseStatus =
  | 'authenticating'
  | 'adding_to_cart'
  | 'checkout'
  | 'awaiting_payment'
  | 'complete'
  | 'failed';

export interface PurchaseResult {
  success: boolean;
  orderId?: string;
  orderUrl?: string;
  estimatedDelivery?: string;
  total: number;
  currency: string;
  error?: string;
  errorCode?: PurchaseErrorCode;
  newPrice?: number;
  status: PurchaseStatus;
}

export interface BuyRequest {
  merchant: SiteId;
  productUrl: string;
  expectedPrice?: number; // For price change detection
}

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

export interface ThreeDSecureInfo {
  detected: boolean;
  type?: 'iframe' | 'redirect' | 'unknown';
}

// ============================================================================
// Agentic Commerce Types - For streaming purchase flow
// ============================================================================

export interface AgenticBuyRequest {
  merchant: SiteId;
  productUrl: string;
  productName: string;
  expectedPrice?: number;
  currency?: string;
}

export interface AgenticBuyConfirmRequest {
  sessionId: string;
  merchant: SiteId;
}

export interface AgenticProgressEvent {
  status: PurchaseStatus;
  step: string;
  screenshotBase64?: string;
  iteration?: number;
  checkoutTotal?: number;
}

export interface AgenticResultEvent {
  success: boolean;
  status: PurchaseStatus;
  orderId?: string;
  orderUrl?: string;
  total?: number;
  error?: string;
  errorCode?: PurchaseErrorCode;
  newPrice?: number;
  screenshotBase64?: string;
  sessionId?: string;
}
