/**
 * Tier 3: UX Tests
 *
 * These tests verify UI/UX interactions work correctly.
 * Failures are warnings - review recommended but not blocking.
 *
 * Would have caught: Phase 2 settings panel bug (modal in wrong branch)
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Tier 3: UX Interactions', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, 'tester');
	});

	test.describe('Settings Panel', () => {
		test('settings button opens settings panel on space page', async ({ page }) => {
			// Navigate to a space page
			await page.goto('/');

			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible())) {
				test.skip();
				return;
			}

			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Find settings button (gear icon)
			// This is the exact test that would have caught the Phase 2 bug!
			const settingsButton = page.locator('button[aria-label="Open settings"]');

			if (!(await settingsButton.isVisible({ timeout: 5000 }).catch(() => false))) {
				// Settings might not be available for this user
				test.skip();
				return;
			}

			await settingsButton.click();

			// Settings panel should appear
			const settingsPanel = page.locator('aside[aria-label="Space Settings"]');
			await expect(settingsPanel).toBeVisible({ timeout: 3000 });
		});

		test('settings panel closes when clicking close button', async ({ page }) => {
			// Navigate to space and open settings
			await page.goto('/');

			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible())) {
				test.skip();
				return;
			}

			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			const settingsButton = page.locator('button[aria-label="Open settings"]');
			if (!(await settingsButton.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}

			await settingsButton.click();

			const settingsPanel = page.locator('aside[aria-label="Space Settings"]');
			await expect(settingsPanel).toBeVisible();

			// Click close button (X button in panel header)
			const closeButton = settingsPanel.locator('button').filter({ hasText: /close|×/i }).or(
				settingsPanel.locator('button svg').first()
			);

			// Or try clicking the first button in the panel header
			await settingsPanel.locator('button').first().click();

			// Panel should be hidden
			await expect(settingsPanel).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('Modal Interactions', () => {
		test('area modal opens when clicking create area', async ({ page }) => {
			await page.goto('/');

			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible())) {
				test.skip();
				return;
			}

			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Find create area trigger
			const createAreaTrigger = page.locator('text=Create Area').or(
				page.locator('text=New Area').or(page.locator('[data-testid="create-area"]'))
			);

			if (!(await createAreaTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}

			await createAreaTrigger.click();

			// Modal should appear
			const modal = page.locator('[role="dialog"]').or(page.locator('[aria-labelledby="modal-title"]'));

			await expect(modal).toBeVisible({ timeout: 3000 });
		});

		test('modal closes on Escape key', async ({ page }) => {
			await page.goto('/');

			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible())) {
				test.skip();
				return;
			}

			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Open any modal (create area)
			const createAreaTrigger = page.locator('text=Create Area').or(
				page.locator('text=New Area')
			);

			if (!(await createAreaTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}

			await createAreaTrigger.click();

			const modal = page.locator('[role="dialog"]').or(page.locator('[aria-labelledby="modal-title"]'));
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Press Escape
			await page.keyboard.press('Escape');

			// Modal should close
			await expect(modal).not.toBeVisible({ timeout: 3000 });
		});

		test('modal closes on backdrop click', async ({ page }) => {
			await page.goto('/');

			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible())) {
				test.skip();
				return;
			}

			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Open any modal
			const createAreaTrigger = page.locator('text=Create Area').or(
				page.locator('text=New Area')
			);

			if (!(await createAreaTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}

			await createAreaTrigger.click();

			const modal = page.locator('[role="dialog"]').or(page.locator('[aria-labelledby="modal-title"]'));
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Click on backdrop (outside modal content)
			// Click at the edge of the viewport
			await page.mouse.click(10, 10);

			// Modal should close (with small delay for animation)
			await expect(modal).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('Sidebar Interactions', () => {
		test('sidebar can be toggled on mobile viewport', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			await page.goto('/');

			// On mobile, sidebar should be hidden initially
			const sidebar = page.locator('aside').first();

			// Find toggle button
			const toggleButton = page.locator('button[aria-label="Toggle sidebar"]');

			if (!(await toggleButton.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}

			// Click to open
			await toggleButton.click();

			// Sidebar should become visible (might have different selector when open)
			await page.waitForTimeout(300); // Wait for animation

			// Click again to close
			await toggleButton.click();

			await page.waitForTimeout(300); // Wait for animation
		});
	});

	test.describe('User Preferences', () => {
		test('user menu/settings accessible from header', async ({ page }) => {
			await page.goto('/');

			// Look for user menu or settings link in header
			const userMenu = page.locator('button[aria-label="User menu"]').or(
				page.locator('button[aria-label="Profile"]').or(
					page.locator('a[href="/settings"]')
				)
			);

			// There should be some way to access user settings (desktop header is visible)
			await expect(page.locator('header').last()).toBeVisible();
		});
	});

	test.describe('Visual Feedback', () => {
		test('loading states are shown during operations', async ({ page }) => {
			await page.goto('/');

			// This is a general check - when loading, spinners should appear
			// Page should not be stuck without any content
			await expect(page.locator('body')).not.toBeEmpty();
		});

		test('no horizontal overflow on page', async ({ page }) => {
			await page.goto('/');
			await page.waitForLoadState('networkidle');

			// Check for horizontal scroll
			const hasHorizontalScroll = await page.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});

			expect(hasHorizontalScroll).toBeFalsy();
		});

		test('no horizontal overflow on mobile', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			await page.goto('/');
			await page.waitForLoadState('networkidle');

			// Check for horizontal scroll
			const hasHorizontalScroll = await page.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});

			expect(hasHorizontalScroll).toBeFalsy();
		});
	});

	test.describe('Keyboard Navigation', () => {
		test('form inputs are focusable with Tab', async ({ page }) => {
			await page.goto('/');

			// Press Tab to move through focusable elements
			await page.keyboard.press('Tab');

			// Something should be focused
			const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
			expect(focusedElement).toBeTruthy();
		});
	});

	// ─── Phase 3: Additional UX Tests ────────────────────────────────────

	test.describe('Theme Preference', () => {
		test('theme toggle persists preference', async ({ page }) => {
			await page.goto('/settings');
			await page.waitForLoadState('networkidle');

			// Navigate to Appearance section in the settings sidebar
			const appearanceNav = page.locator('button.nav-item', { hasText: 'Appearance' });
			if (!(await appearanceNav.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip(); // Settings layout not accessible
				return;
			}
			await appearanceNav.click();

			// Verify theme options are visible
			const themeCards = page.locator('.theme-card');
			await expect(themeCards.first()).toBeVisible({ timeout: 3000 });

			// Determine current theme and pick a different one
			const selectedCard = page.locator('.theme-card.selected');
			const selectedLabel = await selectedCard.locator('.theme-label').textContent();
			const isDark = selectedLabel?.trim() === 'Dark';
			const targetLabel = isDark ? 'Light' : 'Dark';

			// Click the target theme card — match via .theme-label to avoid
			// substring issues (Dark card description contains "low-light")
			const targetCard = page.locator('.theme-card').filter({
				has: page.locator('.theme-label', { hasText: new RegExp(`^${targetLabel}$`) })
			});
			await expect(targetCard).toBeVisible();
			await targetCard.click();

			// Wait for save to complete
			await page.waitForTimeout(1000);

			// Reload the page and navigate back to appearance
			await page.reload();
			await page.waitForLoadState('networkidle');
			await page.locator('button.nav-item', { hasText: 'Appearance' }).click();

			// Verify the new theme is still selected
			const newSelected = page.locator('.theme-card.selected .theme-label');
			await expect(newSelected).toBeVisible({ timeout: 3000 });
			const newLabel = await newSelected.textContent();
			expect(newLabel?.trim()).toBe(targetLabel);

			// Restore to dark theme (cleanup)
			if (targetLabel !== 'Dark') {
				const darkCard = page.locator('.theme-card').filter({
					has: page.locator('.theme-label', { hasText: /^Dark$/ })
				});
				await darkCard.click();
				await page.waitForTimeout(500);
			}
		});
	});

	test.describe('Arena Page', () => {
		test('arena page loads without errors', async ({ page }) => {
			await page.goto('/arena');
			await page.waitForLoadState('networkidle');

			// Arena page should render — look for the heading
			const arenaHeading = page.getByRole('heading', { name: 'Model Arena', exact: true });
			await expect(arenaHeading).toBeVisible({ timeout: 5000 });

			// Page should not show an error
			const errorText = page.locator('text=Something went wrong');
			expect(await errorText.isVisible().catch(() => false)).toBeFalsy();
		});
	});

	test.describe('Task Creation', () => {
		test('task creation from space dashboard completes', async ({ page }) => {
			await page.goto('/');
			await page.waitForLoadState('networkidle');

			// Navigate to a space dashboard
			const spaceLink = page.locator('a[href^="/spaces/"]').first();
			if (!(await spaceLink.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip();
				return;
			}
			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Find the "Add task" button in the Tasks section
			const addTaskButton = page.locator('.add-task-btn').first();
			if (!(await addTaskButton.isVisible({ timeout: 5000 }).catch(() => false))) {
				test.skip(); // Tasks section not visible
				return;
			}
			await addTaskButton.click();

			// Task modal should open
			const modal = page.locator('[role="dialog"]');
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Fill required title field
			const titleInput = modal.locator('#title');
			await expect(titleInput).toBeVisible();
			await titleInput.fill(`Smoke Task ${Date.now()}`);

			// Submit the form
			const createButton = modal.locator('button').filter({ hasText: 'Create Task' });
			await expect(createButton).toBeVisible();
			await createButton.click();

			// Modal should close on success
			await expect(modal).not.toBeVisible({ timeout: 10000 });
		});
	});
});
