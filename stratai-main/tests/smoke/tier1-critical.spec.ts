/**
 * Tier 1: Critical Path Tests
 *
 * These tests verify absolute essentials - if ANY fail, abort deployment.
 * Tests basic app functionality: login, page loads, session persistence.
 *
 * Would have caught: Phase 2 login 500 error (reserved action name)
 * Phase 1 additions: invalid credentials, forgot password, settings, admin pages
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

test.describe('Tier 1: Critical Path', () => {
	test.describe('Login Flow', () => {
		test('login page loads without errors', async ({ page }) => {
			// Track page errors
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/login');

			// Page should load successfully
			await expect(page).toHaveURL(/\/login/);

			// Login form should be visible
			await expect(page.locator('form')).toBeVisible();
			await expect(page.locator('input[name="password"]')).toBeVisible();
			await expect(page.locator('button[type="submit"]')).toBeVisible();

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});

		test('login succeeds with valid credentials', async ({ page }) => {
			// Track page errors (would catch 500 errors)
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			// This would have caught the "reserved action name" 500 error
			await loginAs(page, 'tester');

			// Should not be on login page
			await expect(page).not.toHaveURL(/\/login/);

			// Should not see error messages
			await expect(page.locator('text=Error 500')).not.toBeVisible();
			await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

			// No JavaScript errors during login
			expect(errors).toHaveLength(0);
		});

		test('logout redirects to login', async ({ page }) => {
			// Login first
			await loginAs(page, 'tester');

			// Logout
			await logout(page);

			// Should be back on login page
			await expect(page).toHaveURL(/\/login/);
		});
	});

	test.describe('Page Loads', () => {
		test.beforeEach(async ({ page }) => {
			await loginAs(page, 'tester');
		});

		test('main page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/');

			// Should not redirect to login (session valid)
			await expect(page).not.toHaveURL(/\/login/);

			// Page should have loaded something
			await expect(page.locator('body')).not.toBeEmpty();

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});

		test('space page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			// Navigate to spaces list or a known space
			// First go to home to find available spaces
			await page.goto('/');

			// Look for any space link in navigation
			const spaceLink = page.locator('a[href^="/spaces/"]').first();

			if (await spaceLink.isVisible()) {
				await spaceLink.click();
				await page.waitForLoadState('networkidle');

				// Should be on a space page
				await expect(page).toHaveURL(/\/spaces\//);

				// Space dashboard should have areas section
				await expect(page.locator('body')).not.toBeEmpty();
			}

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});
	});

	test.describe('Session Persistence', () => {
		test('authenticated user can access protected routes', async ({ page }) => {
			await loginAs(page, 'tester');

			// Navigate to home (protected)
			await page.goto('/');
			await expect(page).not.toHaveURL(/\/login/);

			// Navigate to another protected route
			await page.goto('/settings');
			await expect(page).not.toHaveURL(/\/login/);
		});

		test('unauthenticated user is redirected to login', async ({ page }) => {
			// Try to access protected route without logging in
			await page.goto('/');

			// Should redirect to login
			await expect(page).toHaveURL(/\/login/);
		});
	});

	test.describe('Login Error Handling', () => {
		test('login with invalid credentials shows error', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/login');
			await page.waitForSelector('form');

			// Submit with wrong password
			await page.fill('input[name="username"]', 'nonexistent-user');
			await page.fill('input[name="password"]', 'wrong-password-12345');
			await page.click('button[type="submit"]');

			// Should stay on login page
			await expect(page).toHaveURL(/\/login/);

			// Should show error message (red banner)
			await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });

			// No JavaScript errors (just a form error, not a crash)
			expect(errors).toHaveLength(0);
		});
	});

	test.describe('Password Recovery', () => {
		test('forgot password page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/forgot-password');

			// Page should load with reset form
			await expect(page.locator('h1')).toContainText('Reset Password');
			await expect(page.locator('input[type="email"]')).toBeVisible();
			await expect(page.locator('button[type="submit"]')).toBeVisible();

			// Back to login link should exist
			await expect(page.locator('a[href="/login"]')).toBeVisible();

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});

		test('forgot password form submits successfully', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/forgot-password');

			// Fill email and submit
			await page.fill('input[type="email"]', 'test@example.com');
			await page.click('button[type="submit"]');

			// Should show confirmation (always shows success for security)
			await expect(page.getByRole('heading', { name: /check your email/i }).or(page.locator('text=reset link').first())).toBeVisible({ timeout: 5000 });

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});
	});

	test.describe('Protected Page Loads', () => {
		test.beforeEach(async ({ page }) => {
			await loginAs(page, 'tester');
		});

		test('settings page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/settings');
			await page.waitForLoadState('networkidle');

			// Should not redirect to login
			await expect(page).not.toHaveURL(/\/login/);

			// Settings title should be in the page head
			await expect(page).toHaveTitle(/Settings/);

			// Page should have content
			await expect(page.locator('body')).not.toBeEmpty();

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});
	});

	test.describe('Admin Pages', () => {
		test.beforeEach(async ({ page }) => {
			await loginAs(page, 'admin');
		});

		test('admin overview page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/admin/overview');
			await page.waitForLoadState('networkidle');

			// Should not redirect to login
			await expect(page).not.toHaveURL(/\/login/);

			// Dashboard should have content
			await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});

		test('admin members page loads without errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.goto('/admin/members');
			await page.waitForLoadState('networkidle');

			// Should not redirect to login
			await expect(page).not.toHaveURL(/\/login/);

			// Page should have content
			await expect(page.locator('body')).not.toBeEmpty();

			// No JavaScript errors
			expect(errors).toHaveLength(0);
		});
	});

	test.describe('API Health', () => {
		test.beforeEach(async ({ page }) => {
			await loginAs(page, 'tester');
		});

		test('spaces API returns 200', async ({ page }) => {
			const response = await page.request.get('/api/spaces');
			expect(response.ok()).toBeTruthy();
		});

		test('models API returns 200', async ({ page }) => {
			const response = await page.request.get('/api/models');
			expect(response.ok()).toBeTruthy();
		});

		test('conversations API returns 200', async ({ page }) => {
			const response = await page.request.get('/api/conversations');
			expect(response.ok()).toBeTruthy();
		});

		test('password reset API accepts POST', async ({ page }) => {
			const response = await page.request.post('/api/auth/forgot-password', {
				data: { email: 'smoke-test@example.com' },
				headers: { 'Content-Type': 'application/json' }
			});
			// Should return 200 (always succeeds for security - doesn't reveal if email exists)
			expect(response.ok()).toBeTruthy();
		});
	});
});
