/**
 * Test script for HTTP Capture MCP
 * Demonstrates: page navigation, button clicks, API capture
 */

import { chromium, type Browser, type BrowserContext, type Page, type Request, type Response } from 'playwright';

interface CapturedRequest {
  method: string;
  url: string;
  postData?: string | null;
  headers: Record<string, string>;
  response?: {
    status: number;
    body?: string;
    headers: Record<string, string>;
  };
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('HTTP Capture MCP - Interactive Test');
  console.log('='.repeat(60));
  console.log();

  let browser: Browser | null = null;

  try {
    // Launch browser
    console.log('[1] Launching browser...');
    browser = await chromium.launch({
      headless: false, // Set to true for headless mode
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect API calls
    const capturedRequests: CapturedRequest[] = [];

    // Listen to all requests
    page.on('request', (request: Request) => {
      const url = request.url();
      // Only capture API calls (not static resources)
      if (url.includes('/api/') || url.includes('.json') || request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
        const captured: CapturedRequest = {
          method: request.method(),
          url: url,
          postData: request.postData(),
          headers: request.headers(),
        };
        capturedRequests.push(captured);
        console.log(`  [REQUEST] ${captured.method} ${url.substring(0, 80)}...`);
      }
    });

    page.on('response', async (response: Response) => {
      const url = response.url();
      const request = response.request();
      
      // Match with captured request
      const captured = capturedRequests.find(
        r => r.url === url && r.method === request.method() && !r.response
      );
      
      if (captured) {
        try {
          const body = await response.text().catch(() => '');
          captured.response = {
            status: response.status(),
            body: body.substring(0, 500), // Limit body size for display
            headers: await response.allHeaders(),
          };
          console.log(`  [RESPONSE] ${response.status()} ${url.substring(0, 80)}...`);
        } catch {
          // Response body not available
        }
      }
    });

    // Test 1: Navigate to a page with API calls
    console.log('\n[2] Navigating to JSONPlaceholder (test API)...');
    await page.goto('https://jsonplaceholder.typicode.com/');
    await page.waitForLoadState('networkidle');
    console.log('  Page loaded. Title:', await page.title());

    // Test 2: Get page info
    console.log('\n[3] Analyzing page elements...');
    const buttons = await page.locator('button, [role="button"], a.button').count();
    const links = await page.locator('a[href]').count();
    console.log(`  Found ${buttons} buttons/button-like elements`);
    console.log(`  Found ${links} links`);

    // Test 3: Click on a link that triggers API (if exists)
    console.log('\n[4] Looking for interactive elements...');
    
    // JSONPlaceholder doesn't have buttons, so let's navigate to an endpoint
    console.log('\n[5] Fetching API data by navigation...');
    capturedRequests.length = 0; // Clear previous captures
    
    await page.goto('https://jsonplaceholder.typicode.com/posts/1');
    await page.waitForLoadState('networkidle');
    
    // Test 4: Programmatically trigger a fetch request
    console.log('\n[6] Triggering API call via JavaScript...');
    capturedRequests.length = 0;
    
    const fetchResult = await page.evaluate(async () => {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Post',
          body: 'This is a test post from MCP',
          userId: 1,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      return {
        status: response.status,
        data: await response.json(),
      };
    });
    
    console.log('  Fetch result:', JSON.stringify(fetchResult, null, 2));
    
    // Wait for capture
    await page.waitForTimeout(1000);

    // Test 5: Navigate to a page with buttons (ReqRes API demo site)
    console.log('\n[7] Testing with ReqRes API page (has interactive elements)...');
    capturedRequests.length = 0;
    
    await page.goto('https://reqres.in/');
    await page.waitForLoadState('networkidle');
    
    // Find and display available buttons
    const reqresButtons = await page.locator('[data-id]').all();
    console.log(`  Found ${reqresButtons.length} API test buttons`);
    
    if (reqresButtons.length > 0) {
      // Click the first API button
      console.log('\n[8] Clicking an API button...');
      const firstButton = reqresButtons[0];
      const buttonText = await firstButton.textContent();
      console.log(`  Clicking button: "${buttonText?.trim()}"`);
      
      capturedRequests.length = 0;
      await firstButton.click();
      
      // Wait for API response
      await page.waitForTimeout(2000);
      
      console.log('\n[9] Captured API calls:');
      if (capturedRequests.length === 0) {
        console.log('  No API calls captured (the site may use different patterns)');
      } else {
        for (const req of capturedRequests) {
          console.log(`  - ${req.method} ${req.url}`);
          if (req.postData) {
            console.log(`    Request Body: ${req.postData.substring(0, 100)}...`);
          }
          if (req.response) {
            console.log(`    Response: ${req.response.status}`);
            if (req.response.body) {
              console.log(`    Response Body: ${req.response.body.substring(0, 200)}...`);
            }
          }
        }
      }
    }

    // Test 6: Take screenshot
    console.log('\n[10] Taking screenshot...');
    const screenshot = await page.screenshot({ 
      path: './test-screenshot.png',
      fullPage: false 
    });
    console.log(`  Screenshot saved: test-screenshot.png (${screenshot.length} bytes)`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log('Capabilities demonstrated:');
    console.log('  [x] Browser launch and page navigation');
    console.log('  [x] HTTP request/response interception');
    console.log('  [x] Page element discovery (buttons, links)');
    console.log('  [x] Click interactions');
    console.log('  [x] JavaScript evaluation (fetch API calls)');
    console.log('  [x] Capture of API payloads and responses');
    console.log('  [x] Screenshot capture');
    console.log();
    console.log('Total API calls captured in session:', capturedRequests.length);

    // Close browser
    await browser.close();
    console.log('\nBrowser closed. Test complete!');

  } catch (error) {
    console.error('Test failed:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

runTest();
