/**
 * Playbook Adapter - Base adapter that uses playbooks for automation
 *
 * This adapter reads from versioned playbooks instead of hardcoded selectors,
 * making automation more maintainable and enabling visual fallback.
 *
 * @see docs/DISCOVERY_FIRST_ARCHITECTURE.md
 */

import type { Page } from 'playwright';
import { SiteAdapter, type SearchOptions } from './base.js';
import type { Product, SiteId, SiteSelectors, PurchaseResult, ThreeDSecureInfo } from '../types.js';
import type { SitePlaybook, ElementSelector, Flow, FlowStep } from '../playbooks/types.js';
import { loadCurrentPlaybook } from '../playbooks/store.js';
import { BrowserAgent } from '../browser-agent.js';

// ============================================================================
// Playbook Adapter Base Class
// ============================================================================

export abstract class PlaybookAdapter extends SiteAdapter {
  protected playbook: SitePlaybook | null = null;
  protected browserAgent: BrowserAgent | null = null;
  protected playbookSiteId: SiteId;
  protected playbookBaseUrl: string = '';

  constructor(context: { page: Page; sessionId: string }, playbookSiteId: SiteId) {
    super(context);
    this.playbookSiteId = playbookSiteId;
  }

  /**
   * Initialize the adapter by loading its playbook
   */
  async initialize(): Promise<void> {
    this.playbook = await loadCurrentPlaybook(this.playbookSiteId);

    if (this.playbook) {
      console.log(`[PlaybookAdapter] Loaded playbook ${this.playbookSiteId} v${this.playbook.version}`);
      // Update base URL from playbook
      this.playbookBaseUrl = this.playbook.baseUrl;
    } else {
      console.warn(`[PlaybookAdapter] No playbook found for ${this.playbookSiteId}, using defaults`);
    }
  }

  /**
   * Get a selector from the playbook, with fallback to default
   */
  protected getSelector(elementSelector: ElementSelector | undefined, defaultSelector: string): string {
    if (!elementSelector || !elementSelector.primary) {
      return defaultSelector;
    }
    return elementSelector.primary;
  }

  /**
   * Try multiple selectors until one works
   */
  protected async trySelectors(
    elementSelector: ElementSelector | undefined,
    defaultSelector: string
  ): Promise<ReturnType<Page['$']>> {
    if (!elementSelector) {
      return this.page.$(defaultSelector);
    }

    // Try primary selector
    let element = await this.page.$(elementSelector.primary);
    if (element) return element;

    // Try fallbacks
    for (const fallback of elementSelector.fallbacks) {
      element = await this.page.$(fallback);
      if (element) return element;
    }

    // Last resort: default
    return this.page.$(defaultSelector);
  }

  /**
   * Use browser agent for visual fallback
   */
  protected async visualFallback(
    description: string,
    goal: string
  ): Promise<boolean> {
    if (!this.browserAgent) {
      this.browserAgent = new BrowserAgent(this.page, { maxIterations: 5 });
    }

    try {
      const result = await this.browserAgent.execute(goal, description);
      return result.success;
    } catch (error) {
      console.error(`[PlaybookAdapter] Visual fallback failed:`, error);
      return false;
    }
  }

  /**
   * Execute a flow from the playbook
   */
  protected async executeFlow(flowName: string, variables?: Record<string, string>): Promise<boolean> {
    if (!this.playbook) {
      console.error(`[PlaybookAdapter] No playbook loaded`);
      return false;
    }

    const flow = this.playbook.flows[flowName];
    if (!flow) {
      console.error(`[PlaybookAdapter] Flow ${flowName} not found in playbook`);
      return false;
    }

    console.log(`[PlaybookAdapter] Executing flow: ${flow.name}`);

    for (const step of flow.steps) {
      const success = await this.executeStep(step, variables);
      if (!success && step.onFailure === 'abort') {
        console.error(`[PlaybookAdapter] Step ${step.id} failed, aborting flow`);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single flow step
   */
  protected async executeStep(
    step: FlowStep,
    variables?: Record<string, string>
  ): Promise<boolean> {
    try {
      console.log(`[PlaybookAdapter] Executing step: ${step.name}`);

      switch (step.action) {
        case 'navigate': {
          let url = step.value || '';
          // Replace variables
          if (variables) {
            for (const [key, value] of Object.entries(variables)) {
              url = url.replace(`{{${key}}}`, value);
            }
          }
          await this.page.goto(url, { waitUntil: 'domcontentloaded' });
          break;
        }

        case 'click': {
          if (!step.target) {
            console.error(`[PlaybookAdapter] Click step requires target`);
            return false;
          }
          const element = await this.trySelectors(step.target, '');
          if (!element) {
            // Try visual fallback
            if (step.target.visualDescription) {
              return this.visualFallback(
                step.target.visualDescription,
                `Click on ${step.target.visualDescription}`
              );
            }
            return false;
          }
          await element.click();
          break;
        }

        case 'type': {
          if (!step.target || !step.value) {
            console.error(`[PlaybookAdapter] Type step requires target and value`);
            return false;
          }
          const input = await this.trySelectors(step.target, '');
          if (!input) return false;
          await input.fill(step.value);
          break;
        }

        case 'wait': {
          if (typeof step.waitFor === 'number') {
            await this.page.waitForTimeout(step.waitFor);
          } else if (step.waitFor) {
            const selector = this.getSelector(step.waitFor, '');
            if (selector) {
              await this.page.waitForSelector(selector, { timeout: this.playbook?.defaultTimeout || 15000 });
            }
          }
          break;
        }

        case 'scroll': {
          await this.page.mouse.wheel(0, 400);
          await this.page.waitForTimeout(500);
          break;
        }

        case 'extract': {
          // Data extraction would be handled separately
          break;
        }

        case 'hover': {
          if (!step.target) return false;
          const hoverElement = await this.trySelectors(step.target, '');
          if (!hoverElement) return false;
          await hoverElement.hover();
          break;
        }
      }

      // Wait after action if specified
      if (step.waitFor && typeof step.waitFor === 'number') {
        await this.page.waitForTimeout(step.waitFor);
      }

      return true;
    } catch (error) {
      console.error(`[PlaybookAdapter] Step ${step.id} error:`, error);

      if (step.onFailure === 'retry') {
        // Could implement retry logic here
        return false;
      }

      return step.onFailure === 'skip';
    }
  }

  /**
   * Dismiss any known popups
   */
  protected async dismissPopups(): Promise<void> {
    if (!this.playbook?.popups) return;

    for (const popup of this.playbook.popups) {
      try {
        const element = await this.trySelectors(popup.detection, '');
        if (element) {
          console.log(`[PlaybookAdapter] Dismissing popup: ${popup.name}`);

          if (popup.dismissAction.type === 'key') {
            await this.page.keyboard.press(popup.dismissAction.key || 'Escape');
          } else if (popup.dismissAction.target) {
            const closeBtn = await this.trySelectors(popup.dismissAction.target, '');
            if (closeBtn) {
              await closeBtn.click();
            }
          }

          await this.page.waitForTimeout(500);
        }
      } catch {
        // Ignore - popup may not be present
      }
    }
  }

  // ============================================================================
  // Abstract Methods (must be implemented by site-specific adapters)
  // ============================================================================

  abstract search(query: string, options?: SearchOptions): Promise<Product[]>;
  abstract getProduct(productUrl: string): Promise<Product>;
  abstract addToCart(productUrl: string, quantity?: number): Promise<boolean>;
  abstract isAuthenticated(): Promise<boolean>;
  abstract login(): Promise<boolean>;
  abstract purchase(productUrl: string, expectedPrice?: number): Promise<PurchaseResult>;
  abstract detect3DSecure(): Promise<ThreeDSecureInfo>;
  abstract waitForOrderConfirmation(timeout?: number): Promise<{ orderId?: string; success: boolean }>;
}
