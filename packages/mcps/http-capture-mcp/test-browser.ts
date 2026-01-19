/**
 * Simple test script to verify Playwright browser can open web pages
 */

import { chromium } from 'playwright';

async function testBrowser() {
  console.log('Starting browser test...\n');

  try {
    // Launch browser (headless: false to see it visually)
    console.log('1. Launching Chromium browser...');
    const browser = await chromium.launch({
      headless: false, // Set to true for headless mode
    });
    console.log('   ✓ Browser launched successfully\n');

    // Create a new context
    console.log('2. Creating browser context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    console.log('   ✓ Context created\n');

    // Create a new page
    console.log('3. Creating new page...');
    const page = await context.newPage();
    console.log('   ✓ Page created\n');

    // Navigate to a test URL
    const testUrl = 'https://example.com';
    console.log(`4. Navigating to ${testUrl}...`);
    await page.goto(testUrl);
    console.log('   ✓ Page loaded\n');

    // Get page title
    const title = await page.title();
    console.log(`5. Page title: "${title}"\n`);

    // Capture a screenshot
    console.log('6. Taking screenshot...');
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('   ✓ Screenshot saved as test-screenshot.png\n');

    // Wait a few seconds so you can see the browser
    console.log('7. Waiting 3 seconds before closing...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Cleanup
    console.log('8. Closing browser...');
    await context.close();
    await browser.close();
    console.log('   ✓ Browser closed\n');

    console.log('========================================');
    console.log('✓ Browser test completed successfully!');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ Browser test failed:', error);
    process.exit(1);
  }
}

testBrowser();
