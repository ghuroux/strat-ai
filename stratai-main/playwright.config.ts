import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file manually
// (avoiding dotenv dependency)
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
	const envContent = readFileSync(envPath, 'utf-8');
	envContent.split('\n').forEach((line) => {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#')) {
			const [key, ...valueParts] = trimmed.split('=');
			const value = valueParts.join('=');
			if (key && value && !process.env[key]) {
				process.env[key] = value;
			}
		}
	});
}

/**
 * Playwright configuration for StratAI smoke tests
 *
 * Test tiers:
 * - tier1-critical: Must pass or abort (login, page loads)
 * - tier2-core: Must pass for completion (send message, create area)
 * - tier3-ux: Warn if fail (settings panel, modal close)
 */
export default defineConfig({
	testDir: './tests/smoke',

	// Maximum time one test can run
	timeout: 30000,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 1,

	// Limit parallel workers
	workers: 1, // Run sequentially for smoke tests

	// Reporter to use
	reporter: [
		['list'],
		['html', { open: 'never' }],
	],

	// Shared settings for all projects
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: 'http://localhost:5173',

		// Run in headless mode
		headless: true,

		// Collect trace when retrying the failed test
		trace: 'retain-on-failure',

		// Capture screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'retain-on-failure',
	},

	// Configure projects for different browsers
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	// Run local dev server before starting the tests
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 120000,
	},
});
