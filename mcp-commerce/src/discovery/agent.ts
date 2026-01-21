/**
 * Discovery Agent - AI-powered site exploration for playbook generation
 *
 * This agent extends the BrowserAgent pattern to discover and document
 * e-commerce site structure, generating playbooks for automation.
 *
 * @see docs/DISCOVERY_FIRST_ARCHITECTURE.md
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Page } from 'playwright';
import type { MessageParam, ContentBlockParam, ToolUseBlock, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { randomUUID } from 'crypto';
import type {
  SitePlaybook,
  DiscoverySession,
  DiscoveryStatus,
  DiscoveryProgress,
  DiscoveryScreenshot,
  DiscoveryError,
  ElementSelector,
} from '../playbooks/types.js';
import type { SiteId } from '../types.js';
import { saveScreenshot, savePlaybook, getNextVersion } from '../playbooks/store.js';
import { DISCOVERY_SYSTEM_PROMPT, DISCOVERY_TOOLS, getDiscoveryPrompt } from './prompts.js';

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryOptions {
  maxIterations?: number;
  onProgress?: (progress: DiscoveryProgress) => void;
}

export interface DiscoveryResult {
  success: boolean;
  session: DiscoverySession;
  playbook?: SitePlaybook;
  error?: string;
}

interface SelectorTestResult {
  found: boolean;
  count: number;
  text?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  [key: string]: unknown;
}

interface FindingsReport {
  category: string;
  findings: Record<string, unknown>;
  screenshots?: string[];
  notes?: string;
}

// ============================================================================
// Discovery Agent
// ============================================================================

export class DiscoveryAgent {
  private client: Anthropic;
  private page: Page;
  private siteId: SiteId;
  private baseUrl: string;
  private maxIterations: number;
  private onProgress?: (progress: DiscoveryProgress) => void;

  private session: DiscoverySession;
  private partialPlaybook: Partial<SitePlaybook>;
  private screenshotCounter: number = 0;

  constructor(
    page: Page,
    siteId: SiteId,
    baseUrl: string,
    options?: DiscoveryOptions
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
    this.page = page;
    this.siteId = siteId;
    this.baseUrl = baseUrl;
    this.maxIterations = options?.maxIterations ?? 30;
    this.onProgress = options?.onProgress;

    // Initialize session
    this.session = {
      id: randomUUID(),
      siteId,
      status: 'initializing',
      startedAt: new Date().toISOString(),
      progress: [],
      screenshots: [],
      errors: [],
    };

    // Initialize partial playbook
    this.partialPlaybook = {
      id: randomUUID(),
      siteId,
      baseUrl,
      defaultTimeout: 15000,
    };
  }

  /**
   * Get the current discovery session
   */
  getSession(): DiscoverySession {
    return this.session;
  }

  /**
   * Run full discovery for the site
   */
  async discoverSite(): Promise<DiscoveryResult> {
    try {
      this.updateStatus('exploring');
      this.addProgress('Starting site discovery');

      // Navigate to base URL
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Discover each phase
      await this.discoverPhase('auth');
      await this.discoverPhase('search');
      await this.discoverPhase('cart');
      await this.discoverPhase('checkout');
      await this.discoverPhase('popups');

      // Generate final playbook
      this.updateStatus('generating_playbook');
      const playbook = await this.generatePlaybook();

      this.updateStatus('completed');
      this.addProgress('Discovery completed successfully');

      return {
        success: true,
        session: this.session,
        playbook,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addError(this.session.status, errorMessage, false);
      this.updateStatus('failed');

      return {
        success: false,
        session: this.session,
        error: errorMessage,
      };
    }
  }

  /**
   * Discover a specific phase (auth, search, cart, checkout, popups)
   */
  async discoverPhase(phase: 'auth' | 'search' | 'cart' | 'checkout' | 'popups'): Promise<void> {
    const statusMap: Record<string, DiscoveryStatus> = {
      auth: 'discovering_auth',
      search: 'discovering_search',
      cart: 'discovering_cart',
      checkout: 'discovering_checkout',
      popups: 'exploring', // No specific status for popups
    };

    this.updateStatus(statusMap[phase] || 'exploring');
    this.addProgress(`Starting ${phase} discovery`);

    // Take initial screenshot
    let screenshotBase64 = await this.takeScreenshot(`${phase}-initial`);

    // Build conversation
    const messages: MessageParam[] = [];

    // Initial message with context
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are discovering the ${phase} flow for ${this.baseUrl}.

${getDiscoveryPrompt(phase)}

Here is a screenshot of the current page state.`,
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: screenshotBase64,
          },
        },
      ],
    });

    let iteration = 0;
    let phaseComplete = false;
    const findings: FindingsReport[] = [];

    while (iteration < this.maxIterations && !phaseComplete) {
      iteration++;

      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: DISCOVERY_SYSTEM_PROMPT,
          tools: DISCOVERY_TOOLS as Anthropic.Tool[],
          messages,
        });

        // Process response
        const assistantContent: ContentBlockParam[] = [];
        let toolUseBlock: ToolUseBlock | null = null;

        for (const block of response.content) {
          if (block.type === 'text') {
            assistantContent.push({ type: 'text', text: (block as TextBlock).text });
          } else if (block.type === 'tool_use') {
            toolUseBlock = block as ToolUseBlock;
            assistantContent.push({
              type: 'tool_use',
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              input: toolUseBlock.input,
            });
          }
        }

        messages.push({ role: 'assistant', content: assistantContent });

        if (!toolUseBlock) {
          messages.push({
            role: 'user',
            content: 'Please use one of the available tools to continue discovery or complete this phase.',
          });
          continue;
        }

        // Handle tool use
        const toolResult = await this.handleTool(toolUseBlock, phase);

        // Check for completion
        if (toolUseBlock.name === 'complete_discovery') {
          phaseComplete = true;
          this.addProgress(`Completed ${phase} discovery`);
        }

        // Check for findings
        if (toolUseBlock.name === 'report_findings') {
          findings.push(toolUseBlock.input as FindingsReport);
        }

        // Update screenshot if action was taken
        if (toolUseBlock.name === 'browser_action') {
          const action = toolUseBlock.input as { action: string };
          if (action.action !== 'screenshot') {
            await this.page.waitForTimeout(500);
          }
          screenshotBase64 = await this.takeScreenshot(`${phase}-${iteration}`);
        }

        // Add tool result to conversation
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: [
                { type: 'text', text: JSON.stringify(toolResult) },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: screenshotBase64,
                  },
                },
              ],
            },
          ],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addError(this.session.status, `Error in ${phase} discovery: ${errorMessage}`, true);
        console.error(`[DiscoveryAgent] Error in ${phase} iteration ${iteration}:`, error);
      }
    }

    // Merge findings into partial playbook
    this.mergeFindings(phase, findings);
  }

  /**
   * Handle a tool call from Claude
   */
  private async handleTool(
    toolUse: ToolUseBlock,
    phase: string
  ): Promise<Record<string, unknown>> {
    const input = toolUse.input as Record<string, unknown>;

    switch (toolUse.name) {
      case 'browser_action':
        return this.handleBrowserAction(input);

      case 'test_selector':
        return this.handleTestSelector(input);

      case 'report_findings':
        return { success: true, message: `Findings for ${input.category} recorded` };

      case 'complete_discovery':
        return { success: true, message: `${phase} discovery marked as complete` };

      default:
        return { error: `Unknown tool: ${toolUse.name}` };
    }
  }

  /**
   * Handle browser action tool
   */
  private async handleBrowserAction(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const action = input.action as string;

    switch (action) {
      case 'screenshot': {
        const screenshot = await this.takeScreenshot('action');
        return { success: true, message: 'Screenshot taken', screenshot };
      }

      case 'click': {
        const coordinate = input.coordinate as number[];
        if (!coordinate || coordinate.length !== 2) {
          return { error: 'Click requires coordinate [x, y]' };
        }
        await this.page.mouse.click(coordinate[0], coordinate[1]);
        await this.page.waitForTimeout(500);
        return { success: true, message: `Clicked at [${coordinate.join(', ')}]` };
      }

      case 'type': {
        const text = input.text as string;
        if (!text) {
          return { error: 'Type requires text' };
        }
        await this.page.keyboard.type(text);
        return { success: true, message: `Typed "${text}"` };
      }

      case 'scroll': {
        const direction = (input.direction as string) || 'down';
        const amount = direction === 'down' ? 400 : -400;
        await this.page.mouse.wheel(0, amount);
        await this.page.waitForTimeout(500);
        return { success: true, message: `Scrolled ${direction}` };
      }

      case 'wait': {
        await this.page.waitForTimeout(2000);
        return { success: true, message: 'Waited 2 seconds' };
      }

      case 'key': {
        const key = input.key as string;
        if (!key) {
          return { error: 'Key action requires key name' };
        }
        await this.page.keyboard.press(key);
        await this.page.waitForTimeout(300);
        return { success: true, message: `Pressed ${key}` };
      }

      case 'navigate': {
        const url = input.url as string;
        if (!url) {
          return { error: 'Navigate requires url' };
        }
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return { success: true, message: `Navigated to ${url}` };
      }

      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  /**
   * Handle test_selector tool - test if a CSS selector works
   */
  private async handleTestSelector(
    input: Record<string, unknown>
  ): Promise<SelectorTestResult> {
    const selector = input.selector as string;
    const description = input.description as string;

    try {
      const elements = await this.page.$$(selector);
      const count = elements.length;

      if (count === 0) {
        return { found: false, count: 0 };
      }

      // Get info from first element
      const first = elements[0];
      const text = await first.textContent().catch(() => undefined);
      const tagName = await first.evaluate((el) => el.tagName.toLowerCase());
      const attributes: Record<string, string> = {};

      // Get common attributes
      for (const attr of ['id', 'class', 'data-ref', 'href', 'type', 'name']) {
        const value = await first.getAttribute(attr);
        if (value) {
          attributes[attr] = value;
        }
      }

      console.log(`[DiscoveryAgent] Selector test: "${selector}" (${description}) - found ${count} elements`);

      return {
        found: true,
        count,
        text: text?.trim().substring(0, 100),
        tagName,
        attributes,
      };
    } catch (error) {
      console.error(`[DiscoveryAgent] Selector test failed for "${selector}":`, error);
      return { found: false, count: 0 };
    }
  }

  /**
   * Take a screenshot and save it
   */
  private async takeScreenshot(name: string): Promise<string> {
    this.screenshotCounter++;
    const filename = `${name}-${this.screenshotCounter}`;

    const buffer = await this.page.screenshot({
      type: 'jpeg',
      quality: 80,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });

    const base64 = buffer.toString('base64');

    // Save to disk (using version 'discovery' as temporary)
    try {
      const savedFilename = await saveScreenshot(
        this.siteId,
        'discovery',
        filename,
        buffer
      );

      this.session.screenshots.push({
        id: filename,
        filename: savedFilename,
        phase: this.session.status,
        description: name,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[DiscoveryAgent] Failed to save screenshot:`, error);
    }

    return base64;
  }

  /**
   * Merge discovery findings into partial playbook
   */
  private mergeFindings(phase: string, findings: FindingsReport[]): void {
    for (const report of findings) {
      const category = report.category;
      const data = report.findings;

      // Convert raw findings to playbook structure
      switch (category) {
        case 'auth':
          this.partialPlaybook.auth = this.convertAuthFindings(data);
          break;
        case 'search':
          this.partialPlaybook.search = this.convertSearchFindings(data);
          break;
        case 'productPage':
          this.partialPlaybook.productPage = this.convertProductPageFindings(data);
          break;
        case 'cart':
          this.partialPlaybook.cart = this.convertCartFindings(data);
          break;
        case 'checkout':
          this.partialPlaybook.checkout = this.convertCheckoutFindings(data);
          break;
        case 'popups':
          this.partialPlaybook.popups = this.convertPopupFindings(data);
          break;
      }
    }

    this.session.partialPlaybook = this.partialPlaybook;
  }

  /**
   * Convert raw findings to ElementSelector format
   */
  private toElementSelector(data: unknown): ElementSelector {
    if (!data || typeof data !== 'object') {
      return {
        primary: '',
        fallbacks: [],
        visualDescription: '',
        confidence: 0,
      };
    }

    const obj = data as Record<string, unknown>;
    return {
      primary: (obj.primary as string) || '',
      fallbacks: (obj.fallbacks as string[]) || [],
      visualDescription: (obj.visualDescription as string) || '',
      confidence: (obj.confidence as number) || 0.5,
      screenshot: obj.screenshot as string | undefined,
    };
  }

  // Conversion helpers (simplified - Claude's output will need parsing)
  private convertAuthFindings(data: Record<string, unknown>): SitePlaybook['auth'] {
    return {
      loginUrl: (data.loginUrl as string) || `${this.baseUrl}/login`,
      loggedInIndicators: this.convertIndicators(data.loggedInIndicators),
      loggedOutIndicators: this.convertIndicators(data.loggedOutIndicators),
      loginForm: {
        emailInput: this.toElementSelector(data.emailInput),
        passwordInput: this.toElementSelector(data.passwordInput),
        submitButton: this.toElementSelector(data.submitButton),
      },
      screenshots: {
        loggedIn: 'logged-in.jpg',
        loggedOut: 'logged-out.jpg',
        loginPage: 'login-page.jpg',
      },
    };
  }

  private convertIndicators(data: unknown): ElementSelector[] {
    if (Array.isArray(data)) {
      return data.map((item) => this.toElementSelector(item));
    }
    return [];
  }

  private convertSearchFindings(data: Record<string, unknown>): SitePlaybook['search'] {
    return {
      searchInput: this.toElementSelector(data.searchInput),
      searchButton: data.searchButton ? this.toElementSelector(data.searchButton) : undefined,
      resultsContainer: this.toElementSelector(data.resultsContainer),
      productCard: this.toElementSelector(data.productCard),
      productData: {
        name: this.toElementSelector((data.productData as Record<string, unknown>)?.name),
        price: this.toElementSelector((data.productData as Record<string, unknown>)?.price),
        link: this.toElementSelector((data.productData as Record<string, unknown>)?.link),
        image: this.toElementSelector((data.productData as Record<string, unknown>)?.image),
        rating: this.toElementSelector((data.productData as Record<string, unknown>)?.rating),
        reviewCount: this.toElementSelector((data.productData as Record<string, unknown>)?.reviewCount),
      },
    };
  }

  private convertProductPageFindings(data: Record<string, unknown>): SitePlaybook['productPage'] {
    return {
      name: this.toElementSelector(data.name),
      price: this.toElementSelector(data.price),
      image: this.toElementSelector(data.image),
      rating: this.toElementSelector(data.rating),
      reviewCount: this.toElementSelector(data.reviewCount),
      stockStatus: this.toElementSelector(data.stockStatus),
      outOfStockIndicators: this.convertIndicators(data.outOfStockIndicators),
      addToCart: this.toElementSelector(data.addToCart),
      quantityInput: this.toElementSelector(data.quantityInput),
    };
  }

  private convertCartFindings(data: Record<string, unknown>): SitePlaybook['cart'] {
    return {
      cartIcon: this.toElementSelector(data.cartIcon),
      cartCount: this.toElementSelector(data.cartCount),
      cartUrl: (data.cartUrl as string) || '/cart',
      cartItem: this.toElementSelector(data.cartItem),
      cartItemData: {
        name: this.toElementSelector((data.cartItemData as Record<string, unknown>)?.name),
        price: this.toElementSelector((data.cartItemData as Record<string, unknown>)?.price),
        quantity: this.toElementSelector((data.cartItemData as Record<string, unknown>)?.quantity),
      },
      removeButton: this.toElementSelector(data.removeButton),
      subtotal: this.toElementSelector(data.subtotal),
      checkoutButton: this.toElementSelector(data.checkoutButton),
    };
  }

  private convertCheckoutFindings(data: Record<string, unknown>): SitePlaybook['checkout'] {
    return {
      checkoutUrl: (data.checkoutUrl as string) || '/checkout',
      orderSummary: {
        subtotal: this.toElementSelector((data.orderSummary as Record<string, unknown>)?.subtotal),
        shipping: this.toElementSelector((data.orderSummary as Record<string, unknown>)?.shipping),
        tax: this.toElementSelector((data.orderSummary as Record<string, unknown>)?.tax),
        total: this.toElementSelector((data.orderSummary as Record<string, unknown>)?.total),
      },
      placeOrderButton: this.toElementSelector(data.placeOrderButton),
      confirmationIndicators: this.convertIndicators(data.confirmationIndicators),
      orderIdSelector: this.toElementSelector(data.orderIdSelector),
    };
  }

  private convertPopupFindings(data: Record<string, unknown>): SitePlaybook['popups'] {
    if (Array.isArray(data)) {
      return data.map((popup, index) => ({
        name: (popup.name as string) || `Popup ${index + 1}`,
        detection: this.toElementSelector(popup.detection),
        dismissAction: popup.dismissAction as SitePlaybook['popups'][0]['dismissAction'],
        priority: index + 1,
      }));
    }
    return [];
  }

  /**
   * Generate the final playbook from discoveries
   */
  private async generatePlaybook(): Promise<SitePlaybook> {
    const version = await getNextVersion(this.siteId);

    const playbook: SitePlaybook = {
      id: this.partialPlaybook.id || randomUUID(),
      siteId: this.siteId,
      version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      discoverySessionId: this.session.id,
      baseUrl: this.baseUrl,
      defaultTimeout: 15000,

      auth: this.partialPlaybook.auth || this.getDefaultAuth(),
      search: this.partialPlaybook.search || this.getDefaultSearch(),
      productPage: this.partialPlaybook.productPage || this.getDefaultProductPage(),
      cart: this.partialPlaybook.cart || this.getDefaultCart(),
      checkout: this.partialPlaybook.checkout || this.getDefaultCheckout(),

      flows: this.generateFlows(),
      popups: this.partialPlaybook.popups || [],
    };

    // Save the playbook
    await savePlaybook(playbook, true);

    return playbook;
  }

  /**
   * Generate flows from discovered elements
   */
  private generateFlows(): SitePlaybook['flows'] {
    return {
      search: {
        name: 'search',
        description: 'Search for products',
        steps: [],
        successIndicators: [],
        failureIndicators: [],
      },
      addToCart: {
        name: 'addToCart',
        description: 'Add product to cart',
        steps: [],
        successIndicators: [],
        failureIndicators: [],
      },
      checkout: {
        name: 'checkout',
        description: 'Complete checkout',
        steps: [],
        successIndicators: [],
        failureIndicators: [],
      },
    };
  }

  // Default configurations (fallbacks if discovery fails)
  private getDefaultAuth(): SitePlaybook['auth'] {
    return {
      loginUrl: `${this.baseUrl}/login`,
      loggedInIndicators: [],
      loggedOutIndicators: [],
      loginForm: {
        emailInput: { primary: 'input[type="email"]', fallbacks: [], visualDescription: '', confidence: 0 },
        passwordInput: { primary: 'input[type="password"]', fallbacks: [], visualDescription: '', confidence: 0 },
        submitButton: { primary: 'button[type="submit"]', fallbacks: [], visualDescription: '', confidence: 0 },
      },
      screenshots: { loggedIn: '', loggedOut: '', loginPage: '' },
    };
  }

  private getDefaultSearch(): SitePlaybook['search'] {
    return {
      searchInput: { primary: 'input[type="search"]', fallbacks: [], visualDescription: '', confidence: 0 },
      resultsContainer: { primary: 'main', fallbacks: [], visualDescription: '', confidence: 0 },
      productCard: { primary: 'article', fallbacks: [], visualDescription: '', confidence: 0 },
      productData: {
        name: { primary: 'h2', fallbacks: [], visualDescription: '', confidence: 0 },
        price: { primary: '.price', fallbacks: [], visualDescription: '', confidence: 0 },
        link: { primary: 'a', fallbacks: [], visualDescription: '', confidence: 0 },
      },
    };
  }

  private getDefaultProductPage(): SitePlaybook['productPage'] {
    return {
      name: { primary: 'h1', fallbacks: [], visualDescription: '', confidence: 0 },
      price: { primary: '.price', fallbacks: [], visualDescription: '', confidence: 0 },
      image: { primary: 'img', fallbacks: [], visualDescription: '', confidence: 0 },
      outOfStockIndicators: [],
      addToCart: { primary: 'button', fallbacks: [], visualDescription: '', confidence: 0 },
    };
  }

  private getDefaultCart(): SitePlaybook['cart'] {
    return {
      cartIcon: { primary: '[data-cart]', fallbacks: [], visualDescription: '', confidence: 0 },
      cartUrl: '/cart',
      cartItem: { primary: '.cart-item', fallbacks: [], visualDescription: '', confidence: 0 },
      cartItemData: {
        name: { primary: '.name', fallbacks: [], visualDescription: '', confidence: 0 },
        price: { primary: '.price', fallbacks: [], visualDescription: '', confidence: 0 },
        quantity: { primary: 'input', fallbacks: [], visualDescription: '', confidence: 0 },
      },
      removeButton: { primary: 'button', fallbacks: [], visualDescription: '', confidence: 0 },
      subtotal: { primary: '.subtotal', fallbacks: [], visualDescription: '', confidence: 0 },
      checkoutButton: { primary: 'button', fallbacks: [], visualDescription: '', confidence: 0 },
    };
  }

  private getDefaultCheckout(): SitePlaybook['checkout'] {
    return {
      checkoutUrl: '/checkout',
      orderSummary: {
        subtotal: { primary: '.subtotal', fallbacks: [], visualDescription: '', confidence: 0 },
        shipping: { primary: '.shipping', fallbacks: [], visualDescription: '', confidence: 0 },
        total: { primary: '.total', fallbacks: [], visualDescription: '', confidence: 0 },
      },
      placeOrderButton: { primary: 'button', fallbacks: [], visualDescription: '', confidence: 0 },
      confirmationIndicators: [],
    };
  }

  // Status/Progress helpers
  private updateStatus(status: DiscoveryStatus): void {
    this.session.status = status;
  }

  private addProgress(message: string): void {
    const progress: DiscoveryProgress = {
      timestamp: new Date().toISOString(),
      phase: this.session.status,
      message,
    };
    this.session.progress.push(progress);
    this.onProgress?.(progress);
    console.log(`[DiscoveryAgent] ${message}`);
  }

  private addError(phase: DiscoveryStatus, message: string, recoverable: boolean): void {
    const error: DiscoveryError = {
      timestamp: new Date().toISOString(),
      phase,
      message,
      recoverable,
    };
    this.session.errors.push(error);
    console.error(`[DiscoveryAgent] Error: ${message}`);
  }
}
