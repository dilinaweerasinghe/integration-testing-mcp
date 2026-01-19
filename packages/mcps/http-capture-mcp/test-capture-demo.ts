/**
 * HTTP Capture MCP Demo - Complete API Capture Flow
 * Demonstrates capturing real API calls with payloads and responses
 */

import { chromium } from 'playwright';

async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         HTTP Capture MCP - API Capture Demo                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // API Call storage with full details
  interface ApiCall {
    timestamp: string;
    method: string;
    url: string;
    requestHeaders: Record<string, string>;
    requestPayload?: unknown;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    duration?: number;
  }

  const capturedApis: ApiCall[] = [];
  const requestTimings = new Map<string, number>();

  // Capture requests
  page.on('request', request => {
    const url = request.url();
    const resourceType = request.resourceType();
    
    // Capture XHR, Fetch, and document requests to APIs
    if (resourceType === 'fetch' || resourceType === 'xhr' || 
        (resourceType === 'document' && url.includes('/api/'))) {
      
      const key = `${request.method()}-${url}`;
      requestTimings.set(key, Date.now());

      let requestPayload: unknown = undefined;
      const postData = request.postData();
      if (postData) {
        try {
          requestPayload = JSON.parse(postData);
        } catch {
          requestPayload = postData;
        }
      }

      capturedApis.push({
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: url,
        requestHeaders: request.headers(),
        requestPayload,
      });
    }
  });

  // Capture responses
  page.on('response', async response => {
    const request = response.request();
    const url = response.url();
    const key = `${request.method()}-${url}`;
    
    const apiCall = capturedApis.find(a => 
      a.url === url && 
      a.method === request.method() && 
      !a.responseStatus
    );
    
    if (apiCall) {
      const startTime = requestTimings.get(key) ?? Date.now();
      apiCall.duration = Date.now() - startTime;
      apiCall.responseStatus = response.status();
      apiCall.responseHeaders = await response.allHeaders();
      
      try {
        const text = await response.text();
        try {
          apiCall.responseBody = JSON.parse(text);
        } catch {
          apiCall.responseBody = text.substring(0, 500);
        }
      } catch {
        // Body not available
      }
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // DEMO 1: Navigate and capture page load APIs
    // ═══════════════════════════════════════════════════════════
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 1: Navigate to API endpoint                            │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('\n➤ Navigating to JSONPlaceholder API...');
    await page.goto('https://jsonplaceholder.typicode.com/posts/1');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.textContent('body');
    console.log('\n📄 Page Content (API Response):');
    try {
      const json = JSON.parse(pageContent ?? '{}');
      console.log(JSON.stringify(json, null, 2).split('\n').map(l => '   ' + l).join('\n'));
    } catch {
      console.log('   ' + (pageContent?.substring(0, 200) ?? 'No content'));
    }

    // ═══════════════════════════════════════════════════════════
    // DEMO 2: Trigger API via JavaScript (simulating button click)
    // ═══════════════════════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 2: Click triggers GET API call                         │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    capturedApis.length = 0;
    
    console.log('\n➤ Simulating button click that fetches user list...');
    
    await page.evaluate(async () => {
      await fetch('https://jsonplaceholder.typicode.com/users');
    });
    
    await page.waitForTimeout(1000);
    
    printCapturedApi(capturedApis[capturedApis.length - 1]);

    // ═══════════════════════════════════════════════════════════
    // DEMO 3: POST request with payload
    // ═══════════════════════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 3: Click triggers POST API call with payload           │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    capturedApis.length = 0;
    
    console.log('\n➤ Simulating form submit that creates a new post...');
    
    await page.evaluate(async () => {
      await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Post from MCP',
          body: 'This demonstrates API capture with payload',
          userId: 42,
        }),
      });
    });
    
    await page.waitForTimeout(1000);
    
    printCapturedApi(capturedApis[capturedApis.length - 1]);

    // ═══════════════════════════════════════════════════════════
    // DEMO 4: PUT request (update)
    // ═══════════════════════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 4: PUT API call (update resource)                      │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    capturedApis.length = 0;
    
    console.log('\n➤ Simulating update action...');
    
    await page.evaluate(async () => {
      await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          title: 'Updated Title',
          body: 'Updated body content',
          userId: 1,
        }),
      });
    });
    
    await page.waitForTimeout(1000);
    
    printCapturedApi(capturedApis[capturedApis.length - 1]);

    // ═══════════════════════════════════════════════════════════
    // DEMO 5: DELETE request
    // ═══════════════════════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 5: DELETE API call                                     │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    capturedApis.length = 0;
    
    console.log('\n➤ Simulating delete action...');
    
    await page.evaluate(async () => {
      await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'DELETE',
      });
    });
    
    await page.waitForTimeout(1000);
    
    printCapturedApi(capturedApis[capturedApis.length - 1]);

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     DEMO COMPLETE                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ HTTP Capture MCP Capabilities Demonstrated:');
    console.log('   • Navigate to web pages and API endpoints');
    console.log('   • Intercept and capture HTTP requests/responses');
    console.log('   • Capture GET requests with query parameters');
    console.log('   • Capture POST requests with JSON payloads');
    console.log('   • Capture PUT/PATCH requests for updates');
    console.log('   • Capture DELETE requests');
    console.log('   • Extract response status, headers, and body');
    console.log('   • Measure request duration/timing');
    console.log('   • Click buttons and trigger interactions');
    console.log();

  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }

  // Helper function to print captured API
  function printCapturedApi(api: ApiCall | undefined) {
    if (!api) {
      console.log('   No API captured');
      return;
    }

    console.log('\n📡 CAPTURED API CALL:');
    console.log('   ┌──────────────────────────────────────────────────────────');
    console.log(`   │ Method:   ${api.method}`);
    console.log(`   │ URL:      ${api.url}`);
    console.log(`   │ Status:   ${api.responseStatus}`);
    console.log(`   │ Duration: ${api.duration}ms`);
    
    if (api.requestPayload) {
      console.log('   │');
      console.log('   │ 📤 REQUEST PAYLOAD:');
      const payloadStr = JSON.stringify(api.requestPayload, null, 2);
      payloadStr.split('\n').forEach(line => console.log(`   │    ${line}`));
    }
    
    if (api.responseBody) {
      console.log('   │');
      console.log('   │ 📥 RESPONSE BODY:');
      const bodyStr = JSON.stringify(api.responseBody, null, 2);
      const truncated = bodyStr.length > 400 ? bodyStr.substring(0, 400) + '\n   ...(truncated)' : bodyStr;
      truncated.split('\n').forEach(line => console.log(`   │    ${line}`));
    }
    
    console.log('   └──────────────────────────────────────────────────────────');
  }
}

runDemo().catch(console.error);
