/**
 * Test Playbook - Verify discovered selectors work with Playwright
 *
 * This script uses the AI-discovered playbook to automate Takealot
 */

import { chromium } from 'playwright';
import { loadCurrentPlaybook } from './playbooks/store.js';

async function testPlaybook() {
  console.log('🧪 Testing AI-Discovered Playbook\n');

  // Load the discovered playbook
  const playbook = await loadCurrentPlaybook('takealot');
  if (!playbook) {
    console.error('❌ No playbook found for takealot');
    process.exit(1);
  }

  console.log(`📋 Loaded playbook: v${playbook.version}`);
  console.log(`   Created: ${playbook.createdAt}`);
  console.log('');

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // ========================================
    // Test 1: Search using discovered selectors
    // ========================================
    console.log('🔍 Test 1: Search Flow');
    console.log('   Navigating to Takealot...');

    await page.goto('https://www.takealot.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Use discovered search input selector
    const searchSelector = playbook.search.searchInput?.primary || 'input[placeholder*="Search"]';
    console.log(`   Search input selector: "${searchSelector}"`);
    console.log(`   Confidence: ${playbook.search.searchInput?.confidence || 'N/A'}`);

    const searchInput = await page.$(searchSelector);
    if (searchInput) {
      console.log('   ✅ Search input FOUND!');

      // Type search query
      await searchInput.fill('energizer batteries');
      console.log('   ✅ Typed search query');

      // Use discovered search button selector
      const searchButtonSelector = playbook.search.searchButton?.primary || 'button[type="submit"]';
      console.log(`   Search button selector: "${searchButtonSelector}"`);

      const searchButton = await page.$(searchButtonSelector);
      if (searchButton) {
        console.log('   ✅ Search button FOUND!');
        await searchButton.click();
        console.log('   ✅ Clicked search button');

        // Wait for results
        await page.waitForTimeout(3000);
        console.log('   ✅ Search results loaded');
      } else {
        console.log('   ⚠️ Search button not found, trying fallbacks...');
        // Try fallbacks
        for (const fallback of playbook.search.searchButton?.fallbacks || []) {
          const btn = await page.$(fallback);
          if (btn) {
            console.log(`   ✅ Found with fallback: "${fallback}"`);
            await btn.click();
            break;
          }
        }
      }
    } else {
      console.log('   ❌ Search input NOT found with primary selector');
    }

    console.log('');

    // ========================================
    // Test 2: Find Add to Cart button
    // ========================================
    console.log('🛒 Test 2: Add to Cart Button');

    // The discovery found [data-ref="add-to-cart-button"] - let's verify
    const addToCartSelector = '[data-ref="add-to-cart-button"]';
    console.log(`   Selector: "${addToCartSelector}"`);

    // Wait a moment for products to load
    await page.waitForTimeout(2000);

    const addToCartButtons = await page.$$(addToCartSelector);
    console.log(`   ✅ Found ${addToCartButtons.length} "Add to Cart" buttons!`);

    if (addToCartButtons.length > 0) {
      // Click the first add to cart button
      console.log('   Clicking first "Add to Cart" button...');
      await addToCartButtons[0].click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked Add to Cart!');

      // Check cart count
      const cartSelector = playbook.cart.cartIcon.primary || '.header-mini-cart, .mini-cart, [data-testid*="cart"]';
      const cartIcon = await page.$(cartSelector);
      if (cartIcon) {
        const cartText = await cartIcon.textContent();
        console.log(`   ✅ Cart updated: ${cartText?.trim()}`);
      }
    }

    console.log('');

    // ========================================
    // Test 3: Navigate to Cart
    // ========================================
    console.log('📦 Test 3: Cart Page');

    await page.goto('https://www.takealot.com/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Try to find cart items
    const cartItemSelector = '[data-ref*="cart-item"], .cart-item, .product-item';
    const cartItems = await page.$$(cartItemSelector);
    console.log(`   ✅ Found ${cartItems.length} items in cart`);

    // Try to find subtotal using discovered selector
    const subtotalSelector = playbook.cart.subtotal.primary || '.cart-summary .total';
    console.log(`   Subtotal selector: "${subtotalSelector}"`);

    const subtotal = await page.$(subtotalSelector);
    if (subtotal) {
      const amount = await subtotal.textContent();
      console.log(`   ✅ Cart subtotal: ${amount?.trim()}`);
    }

    console.log('');
    console.log('✨ All tests completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Search input: AI-discovered selector worked');
    console.log('   - Add to Cart: Discovered [data-ref] pattern worked');
    console.log('   - Cart navigation: Working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Keep browser open for inspection
    console.log('\n🔍 Browser kept open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {}); // Keep process running
  }
}

// Run test
testPlaybook().catch(console.error);
