/**
 * HTTP Capture MCP - Form Interaction Test
 * Tests: Open modal, fill form with dropdowns/checkboxes, submit, capture API
 */

import { chromium } from 'playwright';

interface ApiCall {
  method: string;
  url: string;
  requestPayload?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
}

async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     HTTP Capture MCP - Form & Modal Interaction Test           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const capturedApis: ApiCall[] = [];

  // Capture API calls
  page.on('request', request => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      let payload: unknown;
      const postData = request.postData();
      if (postData) {
        try { payload = JSON.parse(postData); } catch { payload = postData; }
      }
      capturedApis.push({
        method: request.method(),
        url: request.url(),
        requestPayload: payload,
      });
    }
  });

  page.on('response', async response => {
    const request = response.request();
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      const apiCall = capturedApis.find(a => a.url === response.url() && !a.responseStatus);
      if (apiCall) {
        apiCall.responseStatus = response.status();
        try {
          const text = await response.text();
          try { apiCall.responseBody = JSON.parse(text); } catch { apiCall.responseBody = text; }
        } catch {}
      }
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // DEMO 1: Create a test page with modal and form
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 1: Create test page with modal form                      │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    // Create a local test page with modal form
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form Test Page</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .modal { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                   background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                   min-width: 400px; z-index: 1000; }
          .modal.open { display: block; }
          .overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                     background: rgba(0,0,0,0.5); z-index: 999; }
          .overlay.open { display: block; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; border-radius: 4px; }
          .btn-primary { background: #007bff; color: white; border: none; }
          .btn-secondary { background: #6c757d; color: white; border: none; }
          .checkbox-group { display: flex; align-items: center; gap: 10px; }
          .checkbox-group input { width: auto; }
          h2 { margin-top: 0; }
          #result { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 4px; display: none; }
        </style>
      </head>
      <body>
        <h1>User Management System</h1>
        <button id="openModalBtn" class="btn-primary">+ Add New User</button>
        
        <div class="overlay" id="overlay"></div>
        <div class="modal" id="userModal" role="dialog">
          <h2>Add New User</h2>
          <form id="userForm">
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" placeholder="Enter first name" required>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" placeholder="Enter last name" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="Enter email" required>
            </div>
            <div class="form-group">
              <label for="department">Department</label>
              <select id="department" name="department">
                <option value="">Select Department</option>
                <option value="engineering">Engineering</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="hr">Human Resources</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div class="form-group">
              <label for="role">Role</label>
              <select id="role" name="role">
                <option value="">Select Role</option>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="developer">Developer</option>
                <option value="analyst">Analyst</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="isActive" name="isActive">
              <label for="isActive" style="margin-bottom: 0; font-weight: normal;">Active User</label>
            </div>
            <div class="form-group checkbox-group">
              <input type="checkbox" id="sendWelcomeEmail" name="sendWelcomeEmail">
              <label for="sendWelcomeEmail" style="margin-bottom: 0; font-weight: normal;">Send Welcome Email</label>
            </div>
            <div style="text-align: right; margin-top: 20px;">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary" id="submitBtn">OK</button>
            </div>
          </form>
        </div>
        
        <div id="result"></div>
        
        <script>
          const modal = document.getElementById('userModal');
          const overlay = document.getElementById('overlay');
          const form = document.getElementById('userForm');
          const result = document.getElementById('result');
          
          document.getElementById('openModalBtn').onclick = () => {
            modal.classList.add('open');
            overlay.classList.add('open');
          };
          
          document.getElementById('cancelBtn').onclick = () => {
            modal.classList.remove('open');
            overlay.classList.remove('open');
          };
          
          overlay.onclick = () => {
            modal.classList.remove('open');
            overlay.classList.remove('open');
          };
          
          form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = {
              firstName: document.getElementById('firstName').value,
              lastName: document.getElementById('lastName').value,
              email: document.getElementById('email').value,
              department: document.getElementById('department').value,
              role: document.getElementById('role').value,
              isActive: document.getElementById('isActive').checked,
              sendWelcomeEmail: document.getElementById('sendWelcomeEmail').checked,
            };
            
            // Simulate API call
            try {
              const response = await fetch('https://jsonplaceholder.typicode.com/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
              });
              const data = await response.json();
              
              modal.classList.remove('open');
              overlay.classList.remove('open');
              
              result.style.display = 'block';
              result.innerHTML = '<strong>User Created!</strong><br>API Response: ' + JSON.stringify(data, null, 2);
            } catch (err) {
              alert('Error: ' + err.message);
            }
          };
        </script>
      </body>
      </html>
    `);

    console.log('   ✓ Test page created with modal form\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 2: Click button to open modal
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 2: Click button to open modal                            │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    console.log('   ➤ Clicking "Add New User" button...');
    await page.click('#openModalBtn');
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"].open', { state: 'visible' });
    console.log('   ✓ Modal opened successfully\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 3: Get form fields in modal
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 3: Discover form fields in modal                         │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    const inputs = await page.locator('#userModal input, #userModal select').all();
    console.log(`   Found ${inputs.length} form fields:`);
    
    for (const input of inputs) {
      const tag = await input.evaluate(el => el.tagName);
      const name = await input.getAttribute('name') ?? await input.getAttribute('id');
      const type = await input.getAttribute('type') ?? tag.toLowerCase();
      console.log(`     - ${name} (${type})`);
    }
    console.log();

    // ═══════════════════════════════════════════════════════════════
    // DEMO 4: Fill text inputs
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 4: Fill text inputs                                      │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    console.log('   ➤ Filling firstName...');
    await page.fill('#firstName', 'John');
    console.log('   ➤ Filling lastName...');
    await page.fill('#lastName', 'Doe');
    console.log('   ➤ Filling email...');
    await page.fill('#email', 'john.doe@company.com');
    console.log('   ✓ Text inputs filled\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 5: Select dropdown options
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 5: Select dropdown options                               │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    console.log('   ➤ Selecting department: "Engineering"...');
    await page.selectOption('#department', { value: 'engineering' });
    
    console.log('   ➤ Selecting role: "Developer"...');
    await page.selectOption('#role', { label: 'Developer' });
    
    console.log('   ✓ Dropdowns selected\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 6: Check checkboxes
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 6: Check checkboxes                                      │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    console.log('   ➤ Checking "Active User"...');
    await page.check('#isActive');
    
    console.log('   ➤ Checking "Send Welcome Email"...');
    await page.check('#sendWelcomeEmail');
    
    console.log('   ✓ Checkboxes checked\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 7: Take screenshot of filled form
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 7: Screenshot of filled form                             │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    await page.screenshot({ path: './form-filled.png' });
    console.log('   ✓ Screenshot saved: form-filled.png\n');

    // ═══════════════════════════════════════════════════════════════
    // DEMO 8: Submit form and capture API call
    // ═══════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│ DEMO 8: Submit form (click OK) and capture API                │');
    console.log('└───────────────────────────────────────────────────────────────┘');

    capturedApis.length = 0;
    
    console.log('   ➤ Clicking "OK" button to submit...');
    await page.click('#submitBtn');
    
    // Wait for API response
    await page.waitForResponse(response => response.url().includes('jsonplaceholder'), { timeout: 10000 });
    await page.waitForTimeout(500);

    console.log('\n   📡 CAPTURED API CALL:');
    console.log('   ┌──────────────────────────────────────────────────────────────');
    
    for (const api of capturedApis) {
      if (api.url.includes('jsonplaceholder')) {
        console.log(`   │ Method: ${api.method}`);
        console.log(`   │ URL:    ${api.url}`);
        console.log(`   │ Status: ${api.responseStatus}`);
        console.log('   │');
        console.log('   │ 📤 REQUEST PAYLOAD (Form Data):');
        if (api.requestPayload) {
          const lines = JSON.stringify(api.requestPayload, null, 2).split('\n');
          lines.forEach(line => console.log(`   │    ${line}`));
        }
        console.log('   │');
        console.log('   │ 📥 RESPONSE:');
        if (api.responseBody) {
          const lines = JSON.stringify(api.responseBody, null, 2).split('\n');
          lines.forEach(line => console.log(`   │    ${line}`));
        }
      }
    }
    console.log('   └──────────────────────────────────────────────────────────────');

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST COMPLETE                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n✅ Form Interaction Capabilities Demonstrated:');
    console.log('   • Click button to open modal/dialog');
    console.log('   • Wait for modal to appear');
    console.log('   • Discover form fields (inputs, selects, checkboxes)');
    console.log('   • Fill text input fields');
    console.log('   • Select dropdown options (by value or label)');
    console.log('   • Check/uncheck checkboxes');
    console.log('   • Take screenshot of form state');
    console.log('   • Click OK/Submit button');
    console.log('   • Capture API call with full form payload');
    console.log('   • Capture API response');
    console.log();

  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runTest().catch(console.error);
