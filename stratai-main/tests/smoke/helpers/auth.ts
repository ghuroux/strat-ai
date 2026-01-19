/**
 * Authentication helpers for Playwright smoke tests
 *
 * These helpers handle login/logout flows to enable authenticated testing.
 * Uses environment variables for credentials to avoid hardcoding secrets.
 */
import { type Page, expect } from '@playwright/test';

/**
 * Test user types with different permission levels
 */
export type TestUserType = 'admin' | 'tester';

/**
 * Login as a specific user type
 *
 * @param page - Playwright page object
 * @param userType - Which test user to log in as (admin or tester)
 * @returns Promise that resolves when login is complete
 *
 * Environment variables required:
 * - TEST_ADMIN_PASSWORD: Password for admin user
 * - TEST_USER_PASSWORD: Password for regular test user
 */
export async function loginAs(
	page: Page,
	userType: TestUserType = 'tester'
): Promise<void> {
	const password =
		userType === 'admin'
			? process.env.TEST_ADMIN_PASSWORD
			: process.env.TEST_USER_PASSWORD;

	if (!password) {
		throw new Error(
			`Missing password for ${userType}. Set TEST_${userType.toUpperCase()}_PASSWORD env var.`
		);
	}

	// Navigate to login page
	await page.goto('/login');

	// Wait for the form to be ready
	await page.waitForSelector('form');

	// Fill in credentials
	// Username is optional for admin (per login page comment)
	if (userType === 'tester') {
		await page.fill('input[name="username"]', process.env.TEST_USER_USERNAME || 'tester');
	}
	await page.fill('input[name="password"]', password);

	// Submit the form
	await page.click('button[type="submit"]');

	// Wait for successful redirect (should leave login page)
	await expect(page).not.toHaveURL(/\/login/);

	// Verify we're not seeing an error page
	await expect(page.locator('text=Error 500')).not.toBeVisible();
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
	// Navigate directly to logout page (this clears server session)
	// The app's logout route is at /logout, not /api/auth/logout
	await page.goto('/logout');

	// Should redirect to login after session is cleared
	await expect(page).toHaveURL(/\/login/);
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page object
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
	// Navigate to a protected page
	await page.goto('/');

	// If redirected to login, not logged in
	const url = page.url();
	return !url.includes('/login');
}

/**
 * Ensure user is logged in, logging in if necessary
 *
 * @param page - Playwright page object
 * @param userType - Which user to log in as if not already logged in
 */
export async function ensureLoggedIn(
	page: Page,
	userType: TestUserType = 'tester'
): Promise<void> {
	if (!(await isLoggedIn(page))) {
		await loginAs(page, userType);
	}
}
