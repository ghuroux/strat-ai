/**
 * MCP Commerce Server - Entry Point
 *
 * Multi-retailer browser automation server for StratAI
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (user credentials), then fall back to .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config(); // Also load .env as fallback

// Verify critical env vars on startup
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
console.log(`[MCP Commerce] ANTHROPIC_API_KEY: ${hasAnthropicKey ? 'SET (' + process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...)' : 'NOT SET'}`);

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
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
  SiteId,
  BuyRequest,
  BuyResponse,
  AgenticBuyRequest,
  AgenticBuyConfirmRequest,
  AgenticProgressEvent,
  AgenticResultEvent
} from './types.js';
import {
  agenticPurchase,
  completePurchase,
  saveCheckoutState,
  getCheckoutState,
  clearCheckoutState
} from './agentic-purchase.js';

const PORT = Number(process.env.MCP_PORT) || 9223;
const VERSION = '1.0.0';
const startTime = Date.now();
const SEARCH_TIMEOUT = 30000; // 30 seconds per site

const app = express();
app.use(express.json());

// CORS - Allow StratAI frontend to make requests
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
// Checkout Confirm Endpoint (Phase 7 - placeholder for legacy flow)
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
// Buy Endpoint - Direct purchase flow with auto-login
// ============================================================================

const PURCHASE_TIMEOUT = 300000; // 5 minutes for full purchase flow

app.post('/buy', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as BuyRequest;

  // Validate request
  if (!body.merchant || !body.productUrl) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: merchant, productUrl',
      status: 'failed'
    } as BuyResponse);
    return;
  }

  if (body.merchant !== 'takealot' && body.merchant !== 'amazon') {
    res.status(400).json({
      success: false,
      error: 'Invalid merchant. Valid options: takealot, amazon',
      status: 'failed'
    } as BuyResponse);
    return;
  }

  const sessionManager = getSessionManager();

  try {
    console.log(`[Buy] Starting purchase flow for ${body.merchant}: ${body.productUrl}`);

    // Get or create session
    const session = await sessionManager.getSession(body.merchant);
    const adapter = createAdapter(body.merchant, { page: session.page, sessionId: session.id });

    // Step 1: Check if authenticated, auto-login if not
    let isAuth = await adapter.isAuthenticated();

    if (!isAuth) {
      console.log(`[Buy] Not authenticated on ${body.merchant}, attempting auto-login...`);

      try {
        isAuth = await adapter.login();
        if (isAuth) {
          sessionManager.setAuthenticated(session.id, true);
          console.log(`[Buy] Auto-login successful for ${body.merchant}`);
        }
      } catch (loginError) {
        console.error(`[Buy] Auto-login failed for ${body.merchant}:`, loginError);
        res.status(401).json({
          success: false,
          error: loginError instanceof Error ? loginError.message : 'Login failed',
          errorCode: 'LOGIN_FAILED',
          status: 'failed'
        } as BuyResponse);
        return;
      }

      if (!isAuth) {
        res.status(401).json({
          success: false,
          error: `Failed to authenticate on ${body.merchant}. Check credentials in .env.local`,
          errorCode: 'NOT_AUTHENTICATED',
          status: 'failed'
        } as BuyResponse);
        return;
      }
    }

    // Step 2: Execute purchase
    console.log(`[Buy] Executing purchase for ${body.productUrl}`);

    const result = await withTimeout(
      adapter.purchase(body.productUrl, body.expectedPrice),
      PURCHASE_TIMEOUT,
      'purchase'
    );

    // Return result
    const response: BuyResponse = {
      success: result.success,
      orderId: result.orderId,
      orderUrl: result.orderUrl,
      estimatedDelivery: result.estimatedDelivery,
      total: result.total,
      error: result.error,
      errorCode: result.errorCode,
      newPrice: result.newPrice,
      status: result.status
    };

    if (result.success) {
      console.log(`[Buy] Purchase successful! Order ID: ${result.orderId}`);
      res.json({
        success: true,
        data: response
      } as ApiResponse<BuyResponse>);
    } else {
      console.error(`[Buy] Purchase failed: ${result.error}`);
      res.status(400).json({
        success: false,
        data: response,
        error: result.error
      } as ApiResponse<BuyResponse>);
    }

  } catch (error) {
    console.error('[Buy] Error during purchase:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN',
      status: 'failed'
    } as BuyResponse);
  }
}));

// ============================================================================
// Agentic Buy Endpoint - SSE Streaming with AI Visual Navigation
// ============================================================================

const AGENTIC_PURCHASE_TIMEOUT = 300000; // 5 minutes for full agentic purchase

app.post('/buy/stream', async (req: Request, res: Response) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Helper to send SSE events
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const body = req.body as AgenticBuyRequest;

  // Validate request
  if (!body.merchant || !body.productUrl || !body.productName) {
    sendEvent('error', { message: 'Missing required fields: merchant, productUrl, productName' });
    res.end();
    return;
  }

  if (body.merchant !== 'takealot' && body.merchant !== 'amazon') {
    sendEvent('error', { message: 'Invalid merchant. Valid options: takealot, amazon' });
    res.end();
    return;
  }

  const sessionManager = getSessionManager();

  try {
    console.log(`[Buy/Stream] Starting agentic purchase for ${body.merchant}: ${body.productUrl}`);

    // Get or create session
    sendEvent('progress', { status: 'authenticating', step: 'Getting browser session' } as AgenticProgressEvent);
    const session = await sessionManager.getSession(body.merchant);
    const adapter = createAdapter(body.merchant, { page: session.page, sessionId: session.id });

    // Check authentication and login if needed (Playwright - scripted, NOT AI)
    let isAuth = await adapter.isAuthenticated();

    if (!isAuth) {
      sendEvent('progress', { status: 'authenticating', step: 'Logging in to ' + body.merchant } as AgenticProgressEvent);
      console.log(`[Buy/Stream] Not authenticated on ${body.merchant}, logging in...`);

      try {
        isAuth = await adapter.login();
        if (isAuth) {
          sessionManager.setAuthenticated(session.id, true);
          console.log(`[Buy/Stream] Login successful for ${body.merchant}`);
        }
      } catch (loginError) {
        console.error(`[Buy/Stream] Login failed for ${body.merchant}:`, loginError);
        sendEvent('error', {
          message: loginError instanceof Error ? loginError.message : 'Login failed',
          errorCode: 'LOGIN_FAILED'
        });
        res.end();
        return;
      }

      if (!isAuth) {
        sendEvent('error', {
          message: `Failed to authenticate on ${body.merchant}. Check credentials in .env.local`,
          errorCode: 'NOT_AUTHENTICATED'
        });
        res.end();
        return;
      }
    }

    sendEvent('progress', { status: 'authenticating', step: 'Authenticated' } as AgenticProgressEvent);

    // Execute agentic purchase with streaming progress
    const result = await agenticPurchase(
      session.page,
      {
        productUrl: body.productUrl,
        productName: body.productName,
        expectedPrice: body.expectedPrice,
        currency: body.currency || 'ZAR',
        stopBeforePayment: true // Always stop for human confirmation
      },
      (progress) => {
        // Stream progress events to client
        sendEvent('progress', progress);
      }
    );

    // If awaiting payment, save checkout state for confirmation
    if (result.status === 'awaiting_payment') {
      saveCheckoutState(session.id, {
        total: result.total,
        screenshotBase64: await sessionManager.takeScreenshot(session.id) || undefined,
        ready: true
      });

      const resultEvent: AgenticResultEvent = {
        success: true,
        status: 'awaiting_payment',
        total: result.total,
        sessionId: session.id,
        screenshotBase64: await sessionManager.takeScreenshot(session.id) || undefined
      };
      sendEvent('result', resultEvent);
    } else if (result.success) {
      const resultEvent: AgenticResultEvent = {
        success: true,
        status: result.status,
        orderId: result.orderId,
        orderUrl: result.orderUrl,
        total: result.total
      };
      sendEvent('result', resultEvent);
    } else {
      const resultEvent: AgenticResultEvent = {
        success: false,
        status: 'failed',
        error: result.error,
        errorCode: result.errorCode,
        newPrice: result.newPrice
      };
      sendEvent('result', resultEvent);
    }

    res.end();

  } catch (error) {
    console.error('[Buy/Stream] Error:', error);
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN'
    });
    res.end();
  }
});

// ============================================================================
// Agentic Buy Confirm Endpoint - Complete purchase after human confirmation
// ============================================================================

app.post('/buy/confirm', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as AgenticBuyConfirmRequest;

  // Validate request
  if (!body.sessionId || !body.merchant) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: sessionId, merchant'
    });
    return;
  }

  const sessionManager = getSessionManager();

  // Get saved checkout state
  const checkoutState = getCheckoutState(body.sessionId);
  if (!checkoutState || !checkoutState.ready) {
    res.status(404).json({
      success: false,
      error: 'No pending checkout found for this session. Start a new purchase.'
    });
    return;
  }

  // Find session by looking through all sessions
  const sessions = sessionManager.listSessions();
  const matchingSession = sessions.find(s => s.id === body.sessionId || s.id.includes(body.sessionId));

  if (!matchingSession) {
    res.status(404).json({
      success: false,
      error: 'Browser session not found. It may have expired.'
    });
    return;
  }

  try {
    console.log(`[Buy/Confirm] Completing purchase for session ${body.sessionId}`);

    // Get the actual session to access the page
    const session = await sessionManager.getSession(body.merchant, body.sessionId);

    // Complete the purchase
    const result = await completePurchase(session.page);

    // Clear the pending checkout state
    clearCheckoutState(body.sessionId);

    if (result.success) {
      res.json({
        success: true,
        data: {
          orderId: result.orderId,
          orderUrl: result.orderUrl,
          total: result.total,
          status: result.status
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode
      });
    }

  } catch (error) {
    console.error('[Buy/Confirm] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// ============================================================================
// Test Agent Endpoint - For testing AI browser control
// ============================================================================

app.post('/test-agent', asyncHandler(async (req: Request, res: Response) => {
  const { url, goal, merchant } = req.body as { url?: string; goal: string; merchant?: SiteId };

  if (!goal) {
    res.status(400).json({
      success: false,
      error: 'Missing required field: goal'
    });
    return;
  }

  const site = merchant || 'takealot';
  const sessionManager = getSessionManager();

  try {
    const session = await sessionManager.getSession(site);

    // Navigate to URL if provided
    if (url) {
      await session.page.goto(url, { waitUntil: 'domcontentloaded' });
      await session.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }

    // Import BrowserAgent dynamically to avoid circular deps
    const { BrowserAgent } = await import('./browser-agent.js');
    const agent = new BrowserAgent(session.page, { maxIterations: 10 });

    const result = await agent.execute(goal);

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      iterations: result.iterations,
      actionHistory: result.actionHistory,
      screenshotBase64: result.screenshotBase64
    });

  } catch (error) {
    console.error('[TestAgent] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
// Playbook Endpoints
// ============================================================================

import {
  loadCurrentPlaybook,
  loadPlaybookVersion,
  listPlaybookVersions,
  initializeStore
} from './playbooks/store.js';
import { DiscoveryAgent } from './discovery/agent.js';

// Initialize playbook store on startup
initializeStore().catch(console.error);

// List playbook versions for a site
app.get('/playbooks/:siteId', asyncHandler(async (req: Request, res: Response) => {
  const siteId = req.params.siteId as SiteId;
  const versions = await listPlaybookVersions(siteId);

  res.json({
    success: true,
    data: { siteId, versions }
  });
}));

// Get current playbook for a site
app.get('/playbooks/:siteId/current', asyncHandler(async (req: Request, res: Response) => {
  const siteId = req.params.siteId as SiteId;
  const playbook = await loadCurrentPlaybook(siteId);

  if (playbook) {
    res.json({ success: true, data: playbook });
  } else {
    res.status(404).json({
      success: false,
      error: `No playbook found for ${siteId}`
    });
  }
}));

// Get specific playbook version
app.get('/playbooks/:siteId/:version', asyncHandler(async (req: Request, res: Response) => {
  const siteId = req.params.siteId as SiteId;
  const version = req.params.version as string;
  const playbook = await loadPlaybookVersion(siteId, version);

  if (playbook) {
    res.json({ success: true, data: playbook });
  } else {
    res.status(404).json({
      success: false,
      error: `Playbook ${siteId} v${version} not found`
    });
  }
}));

// ============================================================================
// Discovery Endpoints
// ============================================================================

// Active discovery sessions
const discoverySessions = new Map<string, DiscoveryAgent>();

// Start a new discovery session
app.post('/discovery/start', asyncHandler(async (req: Request, res: Response) => {
  const { siteId, baseUrl } = req.body as { siteId: SiteId; baseUrl?: string };

  if (!siteId) {
    res.status(400).json({ success: false, error: 'siteId is required' });
    return;
  }

  const sessionManager = getSessionManager();
  const session = await sessionManager.getSession(siteId);

  const discoveryBaseUrl = baseUrl || (siteId === 'takealot' ? 'https://www.takealot.com' : 'https://www.amazon.co.za');

  const agent = new DiscoveryAgent(session.page, siteId, discoveryBaseUrl, {
    onProgress: (progress) => {
      console.log(`[Discovery] ${progress.phase}: ${progress.message}`);
    }
  });

  const discoverySession = agent.getSession();
  discoverySessions.set(discoverySession.id, agent);

  res.json({
    success: true,
    data: {
      sessionId: discoverySession.id,
      status: discoverySession.status,
      message: 'Discovery session started. Use POST /discovery/:id/run to begin.'
    }
  });
}));

// Run discovery (async - returns immediately)
app.post('/discovery/:id/run', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const agent = discoverySessions.get(sessionId);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: `Discovery session ${sessionId} not found`
    });
    return;
  }

  // Start discovery in background
  agent.discoverSite().then((result) => {
    console.log(`[Discovery] Session ${sessionId} completed:`, result.success);
  }).catch((error) => {
    console.error(`[Discovery] Session ${sessionId} failed:`, error);
  });

  res.json({
    success: true,
    data: {
      sessionId,
      status: 'running',
      message: 'Discovery started. Use GET /discovery/:id to check status.'
    }
  });
}));

// Get discovery session status
app.get('/discovery/:id', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const agent = discoverySessions.get(sessionId);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: `Discovery session ${sessionId} not found`
    });
    return;
  }

  res.json({
    success: true,
    data: agent.getSession()
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
