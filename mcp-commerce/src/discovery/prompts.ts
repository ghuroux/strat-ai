/**
 * Discovery Prompts - Claude prompts for site discovery
 *
 * These prompts guide Claude to explore e-commerce sites and document
 * their structure, selectors, and flows for the playbook.
 */

// ============================================================================
// System Prompts
// ============================================================================

export const DISCOVERY_SYSTEM_PROMPT = `You are an AI assistant helping to discover and document the structure of e-commerce websites.

Your goal is to explore the site, find UI elements, and document their CSS selectors and visual appearance.

IMPORTANT GUIDELINES:
1. Be THOROUGH - check multiple fallback selectors for each element
2. Be PRECISE - prefer data-ref or id attributes over class names (classes often change)
3. Be DESCRIPTIVE - provide clear visual descriptions for each element
4. Document FAILURES too - if an element isn't found, note that in findings
5. Take SCREENSHOTS frequently - visual documentation is valuable

When discovering elements, try selectors in this order of reliability:
1. data-* attributes (most stable, site usually maintains these)
2. id attributes (stable but less common)
3. aria-label or role attributes (semantic, usually stable)
4. Specific class names (less stable, may change with redesigns)
5. Tag + text content patterns (least stable, use as fallback)

For each element you find, you must provide:
- primary: The most reliable CSS selector
- fallbacks: Array of alternative selectors (at least 2)
- visualDescription: What the element looks like to a human
- confidence: How sure you are this is the right element (0.0-1.0)`;

// ============================================================================
// Phase-Specific Prompts
// ============================================================================

export const AUTH_DISCOVERY_PROMPT = `TASK: Discover the authentication flow for this e-commerce site.

You need to document:

1. LOGGED OUT INDICATORS
   - What elements are visible when NOT logged in?
   - Usually: "Login", "Sign In", "Register" links in header
   - Find CSS selectors for these elements

2. LOGGED IN INDICATORS
   - What elements are visible ONLY when logged in?
   - Usually: "Hi [Name]", "My Account", "Logout" links
   - Account dropdown/menu indicators

3. LOGIN FORM
   - Navigate to login page
   - Document: email/username input, password input, submit button
   - Note any captcha or 2FA elements

4. LOGIN SUCCESS INDICATORS
   - What changes after successful login?
   - How can we verify login worked?

Start by taking a screenshot of the homepage to see the current state.
Then navigate to the login page to document the form.

Return findings using the report_findings tool when done.`;

export const SEARCH_DISCOVERY_PROMPT = `TASK: Discover the search functionality for this e-commerce site.

You need to document:

1. SEARCH INPUT
   - Find the main search bar
   - Document input field selector
   - Check for autocomplete behavior

2. SEARCH BUTTON/SUBMISSION
   - Is there a search button, or Enter key submission?
   - Document the submit mechanism

3. SEARCH RESULTS PAGE
   - Navigate to a search results page (try searching for "headphones")
   - Document the results container
   - Document individual product card structure

4. PRODUCT CARD DATA
   - How to extract: name, price, image, link, rating, reviews
   - Document selectors for each data point

5. PAGINATION
   - Is there pagination or infinite scroll?
   - Document pagination controls

Return findings using the report_findings tool when done.`;

export const CART_DISCOVERY_PROMPT = `TASK: Discover the shopping cart functionality for this e-commerce site.

You need to document:

1. ADD TO CART BUTTON
   - Navigate to any product page
   - Find the "Add to Cart" or "Buy" button
   - Document primary and fallback selectors

2. CART ICON/INDICATOR
   - Find cart icon in header
   - Find cart count/badge element

3. CART PAGE
   - Navigate to cart
   - Document cart item elements
   - Document remove item button
   - Document quantity controls

4. PROCEED TO CHECKOUT
   - Find the checkout button
   - Document its selector

5. EMPTY CART STATE
   - What does empty cart look like?
   - Document empty state indicators

Return findings using the report_findings tool when done.`;

export const CHECKOUT_DISCOVERY_PROMPT = `TASK: Discover the checkout flow for this e-commerce site.

IMPORTANT: Do NOT complete an actual purchase. Only document the UI elements.

You need to document:

1. CHECKOUT PAGE STRUCTURE
   - Navigate to checkout (cart must have items)
   - Document main sections (shipping, payment, summary)

2. SHIPPING SECTION
   - Saved address selector
   - Add new address elements

3. PAYMENT SECTION
   - Saved payment method selector
   - Payment form elements (if visible)

4. ORDER SUMMARY
   - Subtotal, shipping, tax, total elements
   - Document each selector

5. PLACE ORDER BUTTON
   - Find the final purchase button
   - Document its selector (but DO NOT click it)

6. CONFIRMATION INDICATORS
   - What URL patterns indicate order success?
   - What elements appear on confirmation page?

Return findings using the report_findings tool when done.`;

export const POPUP_DISCOVERY_PROMPT = `TASK: Discover popup/modal patterns on this e-commerce site.

You need to document:

1. COOKIE CONSENT
   - Is there a cookie banner?
   - How to dismiss it?

2. NEWSLETTER POPUP
   - Does a newsletter modal appear?
   - How to close it?

3. PROMOTIONAL POPUPS
   - Any discount/promo modals?
   - Close mechanisms?

4. AGE VERIFICATION
   - Any age gates?
   - How to proceed?

5. GENERAL MODAL PATTERNS
   - Common close button selectors
   - Overlay dismiss patterns

Navigate around the site to trigger any popups.
Document how to detect and dismiss each one.

Return findings using the report_findings tool when done.`;

// ============================================================================
// Tool Definitions for Discovery
// ============================================================================

export const DISCOVERY_TOOLS = [
  {
    name: 'browser_action',
    description: `Control the browser to explore the site.

Available actions:
- screenshot: Take a screenshot to see current state
- click: Click at [x, y] coordinates
- type: Type text (after clicking an input)
- scroll: Scroll up or down
- wait: Wait 2 seconds for page to load
- key: Press a keyboard key (Enter, Tab, Escape)
- navigate: Go to a specific URL`,
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['screenshot', 'click', 'type', 'scroll', 'wait', 'key', 'navigate'],
          description: 'The browser action to perform'
        },
        coordinate: {
          type: 'array',
          items: { type: 'number' },
          description: 'Click coordinates [x, y] for click action'
        },
        text: {
          type: 'string',
          description: 'Text to type for type action'
        },
        direction: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Scroll direction'
        },
        key: {
          type: 'string',
          description: 'Key to press (Enter, Tab, Escape, etc.)'
        },
        url: {
          type: 'string',
          description: 'URL to navigate to for navigate action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'test_selector',
    description: `Test if a CSS selector finds an element on the current page.
Returns whether the element was found and its properties.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to test'
        },
        description: {
          type: 'string',
          description: 'What element this selector should find'
        }
      },
      required: ['selector', 'description']
    }
  },
  {
    name: 'report_findings',
    description: `Report discovered elements for a specific category.
Call this when you've finished discovering elements for a section.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['auth', 'search', 'productPage', 'cart', 'checkout', 'popups'],
          description: 'Which section these findings belong to'
        },
        findings: {
          type: 'object',
          description: 'The discovered element selectors and their properties'
        },
        screenshots: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of screenshot IDs to associate with these findings'
        },
        notes: {
          type: 'string',
          description: 'Any additional notes about the discovery'
        }
      },
      required: ['category', 'findings']
    }
  },
  {
    name: 'complete_discovery',
    description: `Signal that discovery for this phase is complete.
Call this when you've finished exploring and reported all findings.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether discovery was successful'
        },
        summary: {
          type: 'string',
          description: 'Summary of what was discovered'
        },
        issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any issues or elements that could not be found'
        }
      },
      required: ['success', 'summary']
    }
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the discovery prompt for a specific phase
 */
export function getDiscoveryPrompt(phase: 'auth' | 'search' | 'cart' | 'checkout' | 'popups'): string {
  switch (phase) {
    case 'auth':
      return AUTH_DISCOVERY_PROMPT;
    case 'search':
      return SEARCH_DISCOVERY_PROMPT;
    case 'cart':
      return CART_DISCOVERY_PROMPT;
    case 'checkout':
      return CHECKOUT_DISCOVERY_PROMPT;
    case 'popups':
      return POPUP_DISCOVERY_PROMPT;
    default:
      throw new Error(`Unknown discovery phase: ${phase}`);
  }
}

/**
 * Build the initial user message for a discovery phase
 */
export function buildDiscoveryMessage(phase: string, siteUrl: string): string {
  return `You are discovering the ${phase} flow for the site at ${siteUrl}.

${getDiscoveryPrompt(phase as 'auth' | 'search' | 'cart' | 'checkout' | 'popups')}

Here is a screenshot of the current page state. Begin your exploration.`;
}
