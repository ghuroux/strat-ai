/**
 * Test Login - Verify AI-discovered auth selectors work
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const EMAIL = process.env.TAKEALOT_EMAIL || '';
const PASSWORD = process.env.TAKEALOT_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

async function testLogin() {
  console.log('🔐 Testing Login Flow\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Step 1: Navigate
    console.log('📍 Step 1: Navigate to Takealot');
    await page.goto('https://www.takealot.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    console.log('   ✅ Page loaded');

    // Step 2: Go directly to login page (bypass modal popup issues)
    console.log('\n📍 Step 2: Navigate directly to login page');
    await page.goto('https://www.takealot.com/account/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('   ✅ On login page');

    // Step 2b: Dismiss the "NEVER MISS A DEAL" popup by clicking the X
    console.log('\n📍 Step 2b: Dismiss notification popup');
    try {
      // Wait for and click the X button (it's a button/div with × character or SVG)
      // The X is in the top-right of the notification overlay
      await page.waitForTimeout(1000);

      // Try clicking the X button - it appears to be a clickable element with an X
      const closeButton = page.locator('button').filter({ has: page.locator('svg path') }).first();
      if (await closeButton.isVisible({ timeout: 3000 })) {
        await closeButton.click();
        console.log('   ✅ Clicked X button (svg)');
      } else {
        // Try finding close button by position/class
        const xButton = await page.$('button[aria-label*="close"], button[aria-label*="Close"], [class*="close"] button, button:near(:text("DEAL"))');
        if (xButton) {
          await xButton.click();
          console.log('   ✅ Clicked close button');
        } else {
          // Click at coordinates where X appears (top-right of popup)
          // Based on screenshot, the X is roughly at the top-right of the centered popup
          await page.mouse.click(735, 235);
          console.log('   ✅ Clicked at X coordinates');
        }
      }
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('   ⚠️ Could not dismiss popup:', e);
    }

    // Step 3: Fill email
    console.log('\n📍 Step 3: Fill email');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', EMAIL);
    console.log('   ✅ Email filled');

    // Step 5: Fill password
    console.log('\n📍 Step 5: Fill password');
    await page.fill('input[type="password"]', PASSWORD);
    console.log('   ✅ Password filled');

    // Take screenshot before clicking
    await page.screenshot({ path: '/tmp/login-filled.png' });
    console.log('   📸 Screenshot: /tmp/login-filled.png');

    // Step 6: Click Login button - BE MORE SPECIFIC
    console.log('\n📍 Step 6: Click Login button');

    // Try multiple approaches to find and click the login button
    const loginButtonSelectors = [
      'button:has-text("Login")',           // Playwright text selector
      'form button[type="submit"]',         // Form submit button
      '.login-form button',                 // Login form button
      'button.btn-primary',                 // Primary button
      '[data-ref="login-submit"]',          // Data ref
    ];

    let clicked = false;
    for (const selector of loginButtonSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          const isVisible = await btn.isVisible();
          console.log(`   Trying: "${selector}" - ${isVisible ? 'visible' : 'hidden'}`);
          if (isVisible) {
            // Scroll into view and click
            await btn.scrollIntoViewIfNeeded();
            await btn.click({ force: true });
            console.log(`   ✅ Clicked with selector: "${selector}"`);
            clicked = true;
            break;
          }
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      // Last resort: click by coordinates or use page.click with text
      console.log('   Trying page.click with text matcher...');
      await page.click('button:has-text("Login")');
      console.log('   ✅ Clicked via text matcher');
    }

    // Step 7: Wait and verify
    console.log('\n📍 Step 7: Waiting for login to process...');
    await page.waitForTimeout(5000);

    // Take screenshot after
    await page.screenshot({ path: '/tmp/login-after.png' });
    console.log('   📸 Screenshot: /tmp/login-after.png');

    // Check current URL
    const url = page.url();
    console.log(`   Current URL: ${url}`);

    // Check for success indicators
    const accountLink = await page.$('a[href*="account"]');
    if (accountLink && !url.includes('login')) {
      console.log('\n🎉 LOGIN SUCCESSFUL!');
    } else {
      // Check for error messages
      const errorEl = await page.$('.error, [class*="error"], [class*="Error"]');
      if (errorEl) {
        const errorText = await errorEl.textContent();
        console.log(`   ⚠️ Error message: ${errorText?.trim()}`);
      }
    }

    console.log('\n✨ Test completed!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    await page.screenshot({ path: '/tmp/login-error.png' });
  } finally {
    console.log('\n🔍 Browser open for inspection. Ctrl+C to close.');
    await new Promise(() => {});
  }
}

testLogin().catch(console.error);
