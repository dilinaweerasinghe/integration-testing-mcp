/**
 * Focused test: Click button -> Capture API call with payload and response
 */

import { chromium } from 'playwright';

async function runTest() {
  console.log('='.repeat(60));
  console.log('API Capture Test - Button Click -> API Call');
  console.log('='.repeat(60));
  console.log();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store API calls
  const apiCalls: Array<{
    method: string;
    url: string;
    requestPayload?: string;
    responseStatus?: number;
    responseBody?: string;
  }> = [];

  // Intercept all fetch/XHR requests
  page.on('request', request => {
    const resourceType = request.resourceType();
    if (resourceType === 'fetch' || resourceType === 'xhr') {
      const url = request.url();
      // Filter out analytics
      if (!url.includes('google') && !url.includes('analytics') && !url.includes('stripe')) {
        apiCalls.push({
          method: request.method(),
          url: url,
          requestPayload: request.postData() ?? undefined,
        });
      }
    }
  });

  page.on('response', async response => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (resourceType === 'fetch' || resourceType === 'xhr') {
      const url = response.url();
      const apiCall = apiCalls.find(a => a.url === url && !a.responseStatus);
      if (apiCall) {
        apiCall.responseStatus = response.status();
        try {
          apiCall.responseBody = await response.text();
        } catch {
          // Body not available
        }
      }
    }
  });

  try {
    // Navigate to ReqRes - a site with API test buttons
    console.log('[1] Navigating to ReqRes API testing site...');
    await page.goto('https://reqres.in/');
    await page.waitForLoadState('networkidle');
    console.log('    Page loaded!');

    // Find the "List Users" button (GET request)
    console.log('\n[2] Finding API buttons...');
    const getButton = page.locator('[data-id="users"]').first();
    const buttonExists = await getButton.count() > 0;
    
    if (buttonExists) {
      console.log('    Found "List Users" button');
      
      // Clear previous captures
      apiCalls.length = 0;
      
      // Click and wait for API
      console.log('\n[3] Clicking button to trigger API call...');
      await getButton.click();
      
      // Wait for response
      await page.waitForResponse(
        response => response.url().includes('reqres.in/api'),
        { timeout: 10000 }
      ).catch(() => {});
      
      await page.waitForTimeout(1000);

      // Show captured API
      console.log('\n[4] Captured API Calls:');
      console.log('-'.repeat(60));
      
      for (const call of apiCalls) {
        console.log(`\n   METHOD: ${call.method}`);
        console.log(`   URL: ${call.url}`);
        if (call.requestPayload) {
          console.log(`   REQUEST BODY:`);
          try {
            const parsed = JSON.parse(call.requestPayload);
            console.log(JSON.stringify(parsed, null, 4).split('\n').map(l => '      ' + l).join('\n'));
          } catch {
            console.log(`      ${call.requestPayload}`);
          }
        }
        console.log(`   RESPONSE STATUS: ${call.responseStatus}`);
        if (call.responseBody) {
          console.log(`   RESPONSE BODY:`);
          try {
            const parsed = JSON.parse(call.responseBody);
            const pretty = JSON.stringify(parsed, null, 4);
            // Show first 500 chars
            const truncated = pretty.length > 500 ? pretty.substring(0, 500) + '...' : pretty;
            console.log(truncated.split('\n').map(l => '      ' + l).join('\n'));
          } catch {
            console.log(`      ${call.responseBody.substring(0, 200)}`);
          }
        }
      }

      // Now test POST - Create User
      console.log('\n\n[5] Testing POST request...');
      const postButton = page.locator('[data-id="users-post"]').first();
      
      if (await postButton.count() > 0) {
        apiCalls.length = 0;
        
        console.log('    Clicking "Create User" button...');
        await postButton.click();
        
        await page.waitForResponse(
          response => response.url().includes('reqres.in/api'),
          { timeout: 10000 }
        ).catch(() => {});
        
        await page.waitForTimeout(1000);

        console.log('\n[6] Captured POST API Call:');
        console.log('-'.repeat(60));
        
        for (const call of apiCalls) {
          console.log(`\n   METHOD: ${call.method}`);
          console.log(`   URL: ${call.url}`);
          if (call.requestPayload) {
            console.log(`   REQUEST PAYLOAD:`);
            try {
              const parsed = JSON.parse(call.requestPayload);
              console.log(JSON.stringify(parsed, null, 4).split('\n').map(l => '      ' + l).join('\n'));
            } catch {
              console.log(`      ${call.requestPayload}`);
            }
          }
          console.log(`   RESPONSE STATUS: ${call.responseStatus}`);
          if (call.responseBody) {
            console.log(`   RESPONSE BODY:`);
            try {
              const parsed = JSON.parse(call.responseBody);
              console.log(JSON.stringify(parsed, null, 4).split('\n').map(l => '      ' + l).join('\n'));
            } catch {
              console.log(`      ${call.responseBody.substring(0, 200)}`);
            }
          }
        }
      }
    } else {
      console.log('    Button not found - site may have changed');
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nThe HTTP Capture MCP can:');
    console.log('  1. Navigate to web pages');
    console.log('  2. Find and click buttons/elements');
    console.log('  3. Capture API requests triggered by interactions');
    console.log('  4. Capture request payloads (POST body, headers)');
    console.log('  5. Capture response status and body');
    console.log('  6. Filter out irrelevant calls (analytics, etc.)');

  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
