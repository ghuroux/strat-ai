/**
 * MCP Commerce Server - Entry Point
 *
 * Multi-retailer browser automation server for StratAI
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { getSessionManager } from './session-manager.js';
import { createAdapter } from './adapters/index.js';
import { runSmokeTests } from './smoke/runner.js';
import type {
  ApiResponse,
  HealthResponse,
  SearchRequest,
  SearchResponse,
  SearchResult,
  ProductRequest,
  ProductResponse,
  CartRequest,
  CartResponse,
  CheckoutRequest,
  CheckoutPreview,
  CheckoutConfirmRequest,
  OrderConfirmation,
  SiteId
} from './types.js';

const PORT = Number(process.env.MCP_PORT) || 9223;
const VERSION = '1.0.0';
const startTime = Date.now();
const SEARCH_TIMEOUT = 30000; // 30 seconds per site

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Error handling wrapper
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// Timeout wrapper for operations
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    )
  ]);
}

// ============================================================================
// Health & Status Endpoints
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  const sessionManager = getSessionManager();
  const response: HealthResponse = {
    status: 'ok',
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    activeSessions: sessionManager.activeSessionCount
  };
  res.json(response);
});

app.get('/sessions', (req: Request, res: Response) => {
  const sessionManager = getSessionManager();
  res.json({
    success: true,
    data: sessionManager.listSessions()
  });
});

// ============================================================================
// Search Endpoint - Parallel search across sites
// ============================================================================

app.post('/tools/search', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SearchRequest;

  // Validate request
  if (!body.query || !body.sites || !Array.isArray(body.sites) || body.sites.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: query, sites[]'
    } as ApiResponse<never>);
    return;
  }

  const validSites: SiteId[] = body.sites.filter(s => s === 'takealot' || s === 'amazon');
  if (validSites.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No valid sites specified. Valid options: takealot, amazon'
    } as ApiResponse<never>);
    return;
  }

  const sessionManager = getSessionManager();

  // Search each site in parallel
  const searchPromises = validSites.map(async (site): Promise<SearchResult> => {
    const searchUrl = site === 'takealot'
      ? `https://www.takealot.com/all?qsearch=${encodeURIComponent(body.query)}`
      : `https://www.amazon.co.za/s?k=${encodeURIComponent(body.query)}`;

    try {
      const session = await sessionManager.getSession(site, body.sessionId);
      const adapter = createAdapter(site, { page: session.page, sessionId: session.id });

      const products = await withTimeout(
        adapter.search(body.query, { maxPrice: body.maxPrice, maxResults: 10 }),
        SEARCH_TIMEOUT,
        `${site} search`
      );

      // Take screenshot of results
      const screenshot = await adapter.takeScreenshot();

      return {
        site,
        products,
        screenshot,
        searchUrl
      };
    } catch (error) {
      console.error(`[Search] Error searching ${site}:`, error);

      // Try to get error screenshot
      let screenshot: string | undefined;
      try {
        const session = await sessionManager.getSession(site, body.sessionId);
        screenshot = await sessionManager.takeScreenshot(session.id) || undefined;
      } catch {
        // Ignore screenshot errors
      }

      return {
        site,
        products: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot,
        searchUrl
      };
    }
  });

  const results = await Promise.all(searchPromises);

  // Generate a shared session ID if not provided
  const sessionId = body.sessionId || `search-${Date.now()}`;

  const response: SearchResponse = {
    results,
    sessionId
  };

  res.json({
    success: true,
    data: response
  } as ApiResponse<SearchResponse>);
}));

// ============================================================================
// Product Details Endpoint
// ============================================================================

app.post('/tools/product', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as ProductRequest;

  if (!body.productUrl || !body.site) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: productUrl, site'
    } as ApiResponse<never>);
    return;
  }

  if (body.site !== 'takealot' && body.site !== 'amazon') {
    res.status(400).json({
      success: false,
      error: 'Invalid site. Valid options: takealot, amazon'
    } as ApiResponse<never>);
    return;
  }

  const sessionManager = getSessionManager();

  try {
    const session = await sessionManager.getSession(body.site, body.sessionId);
    const adapter = createAdapter(body.site, { page: session.page, sessionId: session.id });

    const product = await withTimeout(
      adapter.getProduct(body.productUrl),
      SEARCH_TIMEOUT,
      'get product'
    );

    const screenshot = await adapter.takeScreenshot();

    const response: ProductResponse = {
      product,
      screenshot,
      sessionId: session.id
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<ProductResponse>);

  } catch (error) {
    console.error(`[Product] Error getting product:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<never>);
  }
}));

// ============================================================================
// Add to Cart Endpoint
// ============================================================================

app.post('/tools/cart', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CartRequest;

  if (!body.productUrl || !body.site || !body.sessionId) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: productUrl, site, sessionId'
    } as ApiResponse<never>);
    return;
  }

  if (body.site !== 'takealot' && body.site !== 'amazon') {
    res.status(400).json({
      success: false,
      error: 'Invalid site. Valid options: takealot, amazon'
    } as ApiResponse<never>);
    return;
  }

  const sessionManager = getSessionManager();

  try {
    const session = await sessionManager.getSession(body.site, body.sessionId);

    // Check if authenticated
    const adapter = createAdapter(body.site, { page: session.page, sessionId: session.id });
    const isAuth = await adapter.isAuthenticated();

    if (!isAuth) {
      const screenshot = await adapter.takeScreenshot();
      res.status(401).json({
        success: false,
        error: `Not authenticated on ${body.site}. Please log in manually in the browser first.`,
        data: { screenshot }
      } as ApiResponse<{ screenshot: string }>);
      return;
    }

    const success = await withTimeout(
      adapter.addToCart(body.productUrl, body.quantity || 1),
      SEARCH_TIMEOUT,
      'add to cart'
    );

    const screenshot = await adapter.takeScreenshot();

    const response: CartResponse = {
      success,
      screenshot,
      error: success ? undefined : 'Failed to add item to cart'
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<CartResponse>);

  } catch (error) {
    console.error(`[Cart] Error adding to cart:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<never>);
  }
}));

// ============================================================================
// Checkout Preview Endpoint
// ============================================================================

app.post('/tools/checkout', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CheckoutRequest;

  if (!body.site || !body.sessionId) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: site, sessionId'
    } as ApiResponse<never>);
    return;
  }

  if (body.site !== 'takealot' && body.site !== 'amazon') {
    res.status(400).json({
      success: false,
      error: 'Invalid site. Valid options: takealot, amazon'
    } as ApiResponse<never>);
    return;
  }

  const sessionManager = getSessionManager();

  try {
    const session = await sessionManager.getSession(body.site, body.sessionId);
    const adapter = createAdapter(body.site, { page: session.page, sessionId: session.id });

    // Check if authenticated
    const isAuth = await adapter.isAuthenticated();
    if (!isAuth) {
      const screenshot = await adapter.takeScreenshot();
      res.status(401).json({
        success: false,
        error: `Not authenticated on ${body.site}. Please log in manually first.`,
        data: { screenshot }
      } as ApiResponse<{ screenshot: string }>);
      return;
    }

    const preview = await withTimeout(
      adapter.getCheckoutPreview(),
      SEARCH_TIMEOUT,
      'checkout preview'
    );

    const screenshot = await adapter.takeScreenshot();

    // Check for saved payment method (simplified - in real impl would check DOM)
    const savedPaymentAvailable = isAuth; // Assume saved if logged in

    const response: CheckoutPreview = {
      items: preview.items,
      subtotal: preview.subtotal,
      shipping: preview.shipping,
      tax: 0, // Would extract from page
      total: preview.total,
      currency: 'ZAR',
      savedPaymentAvailable,
      screenshot
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<CheckoutPreview>);

  } catch (error) {
    console.error(`[Checkout] Error getting checkout preview:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<never>);
  }
}));

// ============================================================================
// Checkout Confirm Endpoint (Phase 7 - placeholder)
// ============================================================================

app.post('/tools/checkout/confirm', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CheckoutConfirmRequest;

  if (!body.site || !body.sessionId || body.confirmPurchase !== true) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: site, sessionId, confirmPurchase (must be true)'
    } as ApiResponse<never>);
    return;
  }

  // SAFETY: This is a demo - actual purchase confirmation would go here
  // For now, return a simulated success to show the flow works
  console.warn('[Checkout] DEMO MODE - Simulating purchase confirmation');

  const response: OrderConfirmation = {
    success: true,
    orderId: `DEMO-${Date.now()}`,
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total: 0, // Would come from actual checkout
    currency: 'ZAR'
  };

  res.json({
    success: true,
    data: response
  } as ApiResponse<OrderConfirmation>);
}));

// ============================================================================
// Smoke Test Endpoint (Phase 4 - placeholder)
// ============================================================================

app.post('/smoke-test', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { sites?: SiteId[] };

  console.log('[Smoke] Running smoke tests...');
  const report = await runSmokeTests({
    sites: body.sites,
    verbose: true
  });

  res.json({
    success: report.passed,
    data: report
  });
}));

// ============================================================================
// Session Management
// ============================================================================

app.delete('/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const sessionManager = getSessionManager();

  const closed = await sessionManager.closeSession(sessionId);
  if (closed) {
    res.json({ success: true, message: `Session ${sessionId} closed` });
  } else {
    res.status(404).json({ success: false, error: `Session ${sessionId} not found` });
  }
}));

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  } as ApiResponse<never>);
});

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
  const sessionManager = getSessionManager();

  try {
    // Initialize browser
    await sessionManager.initialize();
    console.log('[MCP Commerce] Browser initialized');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`[MCP Commerce] Server running on http://localhost:${PORT}`);
      console.log(`[MCP Commerce] Version ${VERSION}`);
      console.log(`[MCP Commerce] Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[MCP Commerce] Shutting down...');
      await sessionManager.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[MCP Commerce] Received SIGTERM, shutting down...');
      await sessionManager.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('[MCP Commerce] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
