/**
 * Browser Agent - AI-driven browser automation using Claude's vision capabilities
 *
 * This module implements an agentic loop where:
 * 1. Take screenshot of current page
 * 2. Send to Claude with task description
 * 3. Claude returns action to perform (click, type, scroll, etc.)
 * 4. Execute action
 * 5. Repeat until task complete or max iterations
 *
 * Key security: Credentials are NEVER sent to Claude - only screenshots
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Page } from 'playwright';
import type { MessageParam, ContentBlockParam, ToolUseBlock, TextBlock } from '@anthropic-ai/sdk/resources/messages';

// ============================================================================
// Types
// ============================================================================

export type BrowserActionType = 'screenshot' | 'click' | 'type' | 'scroll' | 'wait' | 'done' | 'key';

export interface BrowserAction {
  action: BrowserActionType;
  coordinate?: [number, number];
  text?: string;
  direction?: 'up' | 'down';
  key?: string; // For key presses like 'Enter', 'Tab', 'Escape'
  result?: string; // For 'done' action - extracted data as JSON string
}

export interface AgentResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  screenshotBase64?: string;
  actionHistory: BrowserAction[];
  iterations: number;
}

export interface AgentProgress {
  step: string;
  screenshotBase64?: string;
  iteration: number;
  action?: BrowserAction;
}

export type ProgressCallback = (progress: AgentProgress) => void;

// ============================================================================
// Tool Definition
// ============================================================================

const BROWSER_TOOL: Anthropic.Tool = {
  name: 'browser_action',
  description: `Control a web browser to complete shopping tasks. You are looking at a screenshot of the current page state.

Available actions:
- screenshot: Take a new screenshot to see the current page state (use after waiting or if unsure)
- click: Click at specific pixel coordinates [x, y] on the screenshot
- type: Type text (use AFTER clicking on an input field first)
- scroll: Scroll the page up or down to reveal more content
- wait: Wait for page to load/update (2 seconds)
- key: Press a keyboard key (Enter, Tab, Escape, etc.)
- done: Task complete - return the extracted result as JSON

IMPORTANT GUIDELINES:
1. Always look carefully at the screenshot before acting
2. Click coordinates must be within the visible area (max 1280x800)
3. For buttons/links, click in the CENTER of the element
4. After clicking a button, use 'wait' then 'screenshot' to see the result
5. If you see a popup/modal, handle it first before continuing
6. If the page looks wrong, take a new screenshot
7. Return 'done' with extracted data when the task is complete`,
  input_schema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['screenshot', 'click', 'type', 'scroll', 'wait', 'done', 'key'],
        description: 'The browser action to perform'
      },
      coordinate: {
        type: 'array',
        items: { type: 'number' },
        description: 'Click coordinates [x, y] - required for click action. Must be within screenshot bounds (1280x800).'
      },
      text: {
        type: 'string',
        description: 'Text to type - required for type action'
      },
      direction: {
        type: 'string',
        enum: ['up', 'down'],
        description: 'Scroll direction - required for scroll action'
      },
      key: {
        type: 'string',
        description: 'Key to press - required for key action. Examples: Enter, Tab, Escape, Backspace'
      },
      result: {
        type: 'string',
        description: 'JSON string with extracted data - required for done action. Include relevant data like { "success": true, "total": 99.99 }'
      }
    },
    required: ['action']
  }
};

// ============================================================================
// Browser Agent Class
// ============================================================================

export class BrowserAgent {
  private client: Anthropic;
  private page: Page;
  private maxIterations: number;
  private onProgress?: ProgressCallback;

  constructor(page: Page, options?: { maxIterations?: number; onProgress?: ProgressCallback }) {
    // Read API key at construction time (after dotenv has loaded)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set. Add it to mcp-commerce/.env.local');
    }
    this.client = new Anthropic({ apiKey });
    this.page = page;
    this.maxIterations = options?.maxIterations ?? 20;
    this.onProgress = options?.onProgress;
  }

  /**
   * Execute a task using AI-driven browser control
   */
  async execute(goal: string, context?: string): Promise<AgentResult> {
    const actionHistory: BrowserAction[] = [];
    let iteration = 0;

    // Take initial screenshot
    let screenshotBase64 = await this.takeScreenshot();

    // Build conversation history for Claude
    const messages: MessageParam[] = [];

    // System context
    const systemPrompt = `You are an AI assistant controlling a web browser to complete shopping tasks.
You can see screenshots of the browser and control it using the browser_action tool.

CURRENT TASK: ${goal}
${context ? `\nADDITIONAL CONTEXT: ${context}` : ''}

IMPORTANT:
- Credentials have already been handled - you're logged in
- Look carefully at each screenshot before acting
- Click coordinates should be in the CENTER of buttons/links
- After clicking, wait and take a new screenshot to verify the result
- Handle any popups/modals that appear before continuing
- If you're stuck, try scrolling to find elements
- Return 'done' with extracted data when task is complete`;

    // Initial message with screenshot
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Here is the current browser state. Complete the task using the browser_action tool.'
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: screenshotBase64
          }
        }
      ]
    });

    // Report initial progress
    this.reportProgress({ step: 'Starting task', screenshotBase64, iteration: 0 });

    // Agentic loop
    while (iteration < this.maxIterations) {
      iteration++;

      try {
        // Call Claude
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          tools: [BROWSER_TOOL],
          messages
        });

        // Process response
        const assistantContent: ContentBlockParam[] = [];
        let toolUseBlock: ToolUseBlock | null = null;
        let textContent = '';

        for (const block of response.content) {
          if (block.type === 'text') {
            textContent = (block as TextBlock).text;
            assistantContent.push({ type: 'text', text: textContent });
          } else if (block.type === 'tool_use') {
            toolUseBlock = block as ToolUseBlock;
            assistantContent.push({
              type: 'tool_use',
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              input: toolUseBlock.input
            });
          }
        }

        // Add assistant response to history
        messages.push({ role: 'assistant', content: assistantContent });

        // If no tool use, Claude might be explaining or stuck
        if (!toolUseBlock) {
          console.log(`[BrowserAgent] No tool use in response. Claude said: ${textContent}`);

          // Ask for action
          messages.push({
            role: 'user',
            content: 'Please use the browser_action tool to take the next action or complete the task.'
          });
          continue;
        }

        // Parse action
        const action = toolUseBlock.input as BrowserAction;
        actionHistory.push(action);

        console.log(`[BrowserAgent] Iteration ${iteration}: ${action.action}`,
          action.coordinate ? `at ${action.coordinate}` : '',
          action.text ? `text: "${action.text.substring(0, 20)}..."` : '',
          action.key ? `key: ${action.key}` : ''
        );

        // Check if done
        if (action.action === 'done') {
          let data: Record<string, unknown> = {};
          try {
            data = action.result ? JSON.parse(action.result) : {};
          } catch {
            console.warn('[BrowserAgent] Could not parse result JSON:', action.result);
          }

          this.reportProgress({ step: 'Task complete', screenshotBase64, iteration, action });

          return {
            success: true,
            data,
            screenshotBase64,
            actionHistory,
            iterations: iteration
          };
        }

        // Execute action
        const actionResult = await this.executeAction(action);

        // Take new screenshot after action (except for screenshot action which already takes one)
        if (action.action !== 'screenshot') {
          await this.page.waitForTimeout(500); // Brief pause for page to update
          screenshotBase64 = await this.takeScreenshot();
        } else {
          screenshotBase64 = actionResult.screenshotBase64 || screenshotBase64;
        }

        // Report progress
        this.reportProgress({
          step: this.getStepDescription(action),
          screenshotBase64,
          iteration,
          action
        });

        // Add tool result to conversation
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: [
                { type: 'text', text: actionResult.message },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: screenshotBase64
                  }
                }
              ]
            }
          ]
        });

      } catch (error) {
        console.error(`[BrowserAgent] Error in iteration ${iteration}:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          screenshotBase64,
          actionHistory,
          iterations: iteration
        };
      }
    }

    // Max iterations reached
    return {
      success: false,
      error: `Max iterations (${this.maxIterations}) reached without completing task`,
      screenshotBase64,
      actionHistory,
      iterations: iteration
    };
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(): Promise<string> {
    // Use JPEG for smaller file size, resize to standard dimensions
    const buffer = await this.page.screenshot({
      type: 'jpeg',
      quality: 80,
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });
    return buffer.toString('base64');
  }

  /**
   * Execute a browser action
   */
  private async executeAction(action: BrowserAction): Promise<{ message: string; screenshotBase64?: string }> {
    switch (action.action) {
      case 'screenshot': {
        const screenshot = await this.takeScreenshot();
        return { message: 'Screenshot taken. Here is the current page state.', screenshotBase64: screenshot };
      }

      case 'click': {
        if (!action.coordinate || action.coordinate.length !== 2) {
          return { message: 'Error: click action requires coordinate [x, y]' };
        }
        const [x, y] = action.coordinate;

        // Validate coordinates
        if (x < 0 || x > 1280 || y < 0 || y > 800) {
          return { message: `Error: coordinates [${x}, ${y}] are outside viewport bounds (1280x800)` };
        }

        await this.page.mouse.click(x, y);
        await this.page.waitForTimeout(500); // Wait for click to register
        return { message: `Clicked at coordinates [${x}, ${y}]. Here is the updated page.` };
      }

      case 'type': {
        if (!action.text) {
          return { message: 'Error: type action requires text' };
        }
        await this.page.keyboard.type(action.text);
        return { message: `Typed "${action.text}". Here is the updated page.` };
      }

      case 'scroll': {
        const direction = action.direction || 'down';
        const amount = direction === 'down' ? 400 : -400;
        await this.page.mouse.wheel(0, amount);
        await this.page.waitForTimeout(500);
        return { message: `Scrolled ${direction}. Here is the updated page.` };
      }

      case 'wait': {
        await this.page.waitForTimeout(2000);
        return { message: 'Waited 2 seconds. Here is the updated page.' };
      }

      case 'key': {
        if (!action.key) {
          return { message: 'Error: key action requires key name' };
        }
        await this.page.keyboard.press(action.key);
        await this.page.waitForTimeout(300);
        return { message: `Pressed ${action.key} key. Here is the updated page.` };
      }

      case 'done': {
        return { message: 'Task marked as complete.' };
      }

      default:
        return { message: `Unknown action: ${action.action}` };
    }
  }

  /**
   * Get human-readable step description
   */
  private getStepDescription(action: BrowserAction): string {
    switch (action.action) {
      case 'screenshot': return 'Analyzing page';
      case 'click': return `Clicking at [${action.coordinate?.join(', ')}]`;
      case 'type': return `Typing "${action.text?.substring(0, 20)}..."`;
      case 'scroll': return `Scrolling ${action.direction}`;
      case 'wait': return 'Waiting for page';
      case 'key': return `Pressing ${action.key}`;
      case 'done': return 'Task complete';
      default: return action.action;
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: AgentProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }
}
