/**
 * Auth Flow Discovery - Specialized discovery for authentication flows
 *
 * This module provides focused discovery for authentication elements,
 * including login detection, form discovery, and session validation.
 */

import type { Page } from 'playwright';
import type { AuthConfig, ElementSelector } from '../../playbooks/types.js';

// ============================================================================
// Auth Detection
// ============================================================================

/**
 * Common patterns for detecting logged-in state
 */
const LOGGED_IN_PATTERNS = [
  'text=/Hi \\w/',           // "Hi [Name]"
  'text=/Hello \\w/',        // "Hello [Name]"
  'text=My Account',
  'text=Logout',
  'text=Sign Out',
  '[data-ref="account-menu"]',
  '[class*="user-menu"]',
  '[class*="account-dropdown"]',
];

/**
 * Common patterns for detecting logged-out state
 */
const LOGGED_OUT_PATTERNS = [
  'text=Login',
  'text=Log in',
  'text=Sign In',
  'text=Register',
  'text=Sign Up',
  'a[href*="/login"]',
  'a[href*="/signin"]',
  'a[href*="/register"]',
];

/**
 * Common email input selectors
 */
const EMAIL_INPUT_PATTERNS = [
  'input[name="email"]',
  'input[type="email"]',
  'input[id*="email"]',
  '[data-ref*="email"]',
  'input[placeholder*="email"]',
  'input[placeholder*="Email"]',
];

/**
 * Common password input selectors
 */
const PASSWORD_INPUT_PATTERNS = [
  'input[name="password"]',
  'input[type="password"]',
  'input[id*="password"]',
  '[data-ref*="password"]',
];

/**
 * Common login button selectors
 */
const LOGIN_BUTTON_PATTERNS = [
  'button[type="submit"]',
  'button:has-text("Login")',
  'button:has-text("Log in")',
  'button:has-text("Sign In")',
  'button:has-text("Sign in")',
  '[data-ref*="login"]',
  '[data-ref*="submit"]',
];

// ============================================================================
// Auth Flow Discovery Functions
// ============================================================================

/**
 * Detect current authentication state
 */
export async function detectAuthState(page: Page): Promise<'logged_in' | 'logged_out' | 'unknown'> {
  // Check for logged-in indicators
  for (const pattern of LOGGED_IN_PATTERNS) {
    try {
      const locator = page.locator(pattern).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return 'logged_in';
      }
    } catch {
      // Continue
    }
  }

  // Check for logged-out indicators
  for (const pattern of LOGGED_OUT_PATTERNS) {
    try {
      const locator = page.locator(pattern).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return 'logged_out';
      }
    } catch {
      // Continue
    }
  }

  return 'unknown';
}

/**
 * Find working selector from a list of patterns
 */
export async function findWorkingSelector(
  page: Page,
  patterns: string[],
  description: string
): Promise<ElementSelector | null> {
  const workingSelectors: string[] = [];

  for (const pattern of patterns) {
    try {
      const elements = await page.$$(pattern);
      if (elements.length > 0) {
        workingSelectors.push(pattern);
      }
    } catch {
      // Continue
    }
  }

  if (workingSelectors.length === 0) {
    return null;
  }

  return {
    primary: workingSelectors[0],
    fallbacks: workingSelectors.slice(1),
    visualDescription: description,
    confidence: workingSelectors.length > 2 ? 0.9 : workingSelectors.length > 1 ? 0.7 : 0.5,
  };
}

/**
 * Discover login form elements on current page
 */
export async function discoverLoginForm(page: Page): Promise<{
  emailInput: ElementSelector | null;
  passwordInput: ElementSelector | null;
  submitButton: ElementSelector | null;
}> {
  return {
    emailInput: await findWorkingSelector(page, EMAIL_INPUT_PATTERNS, 'Email input field'),
    passwordInput: await findWorkingSelector(page, PASSWORD_INPUT_PATTERNS, 'Password input field'),
    submitButton: await findWorkingSelector(page, LOGIN_BUTTON_PATTERNS, 'Login submit button'),
  };
}

/**
 * Discover logged-in indicators on current page
 */
export async function discoverLoggedInIndicators(page: Page): Promise<ElementSelector[]> {
  const indicators: ElementSelector[] = [];

  for (const pattern of LOGGED_IN_PATTERNS) {
    try {
      const locator = page.locator(pattern).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        indicators.push({
          primary: pattern,
          fallbacks: [],
          visualDescription: 'Logged-in indicator',
          confidence: 0.8,
        });
      }
    } catch {
      // Continue
    }
  }

  return indicators;
}

/**
 * Discover logged-out indicators on current page
 */
export async function discoverLoggedOutIndicators(page: Page): Promise<ElementSelector[]> {
  const indicators: ElementSelector[] = [];

  for (const pattern of LOGGED_OUT_PATTERNS) {
    try {
      const locator = page.locator(pattern).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        indicators.push({
          primary: pattern,
          fallbacks: [],
          visualDescription: 'Logged-out indicator',
          confidence: 0.8,
        });
      }
    } catch {
      // Continue
    }
  }

  return indicators;
}

/**
 * Complete auth flow discovery
 */
export async function discoverAuthConfig(
  page: Page,
  baseUrl: string
): Promise<Partial<AuthConfig>> {
  const loginUrl = `${baseUrl}/login`;
  const currentUrl = page.url();

  // First check current page state
  const initialState = await detectAuthState(page);
  let loggedInIndicators: ElementSelector[] = [];
  let loggedOutIndicators: ElementSelector[] = [];

  if (initialState === 'logged_in') {
    loggedInIndicators = await discoverLoggedInIndicators(page);
  } else if (initialState === 'logged_out') {
    loggedOutIndicators = await discoverLoggedOutIndicators(page);
  }

  // Navigate to login page to discover form
  let loginForm = {
    emailInput: null as ElementSelector | null,
    passwordInput: null as ElementSelector | null,
    submitButton: null as ElementSelector | null,
  };

  if (!currentUrl.includes('/login')) {
    try {
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      loginForm = await discoverLoginForm(page);
    } catch (error) {
      console.error('[AuthDiscovery] Error navigating to login page:', error);
    }
  } else {
    loginForm = await discoverLoginForm(page);
  }

  return {
    loginUrl,
    loggedInIndicators,
    loggedOutIndicators,
    loginForm: {
      emailInput: loginForm.emailInput || {
        primary: 'input[type="email"]',
        fallbacks: [],
        visualDescription: 'Email input',
        confidence: 0,
      },
      passwordInput: loginForm.passwordInput || {
        primary: 'input[type="password"]',
        fallbacks: [],
        visualDescription: 'Password input',
        confidence: 0,
      },
      submitButton: loginForm.submitButton || {
        primary: 'button[type="submit"]',
        fallbacks: [],
        visualDescription: 'Submit button',
        confidence: 0,
      },
    },
  };
}
