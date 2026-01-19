/**
 * Test script for SAR Test MCP
 * Demonstrates: Configuration, validation, running tests, and analyzing results
 */

import { OutputParser } from './src/runner/output-parser.js';
import { ResultAnalyzer } from './src/runner/result-analyzer.js';

// ============================================================
// SAMPLE TEST OUTPUTS
// ============================================================

// Sample 1: Successful Test Data execution
const SAMPLE_SUCCESS_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

appsettings.json read from C:\\Users\\WEDILK\\Downloads\\Script-A-Rest_commandline_latest (2)\\publish-commandline
2026-01-20 00:39:50 Start
2026-01-20 00:39:52 Command:  Connect
2026-01-20 00:39:52 Connected as default user.
2026-01-20 00:39:52 Command:  Eval "AND-COM"
2026-01-20 00:39:52 Command:  Eval "AnD Company"
2026-01-20 00:39:52 Command:  Eval "AND-ADD"
2026-01-20 00:39:52 Command:  Call ../../1.2.3.6/CreateCompany/util/CreateCompany.mkd
   2026-01-20 00:39:52 Command:  Get CreateCompanyAssistantHandling.svc/DefaultTemplate()
   2026-01-20 00:39:53 Result (200) OK with No Reattempt
   2026-01-20 00:39:53 Command:  Action CreateCompanyAssistantHandling.svc/CreateNewCompany
   2026-01-20 00:42:29 Result (200) OK with No Reattempt
   2026-01-20 00:42:29 Command:  Output
2026-01-20 00:42:29 Command:  Call ../../1.2.3.6/EnterCompanyAddressInfo/util/EnterCompanyAddressInfo.mkd
   2026-01-20 00:42:29 Command:  Get CompanyHandling.svc/CompanySet(Company={#input.Company})
   2026-01-20 00:42:30 Result (200) OK with No Reattempt
   2026-01-20 00:42:32 Command:  Create CompanyHandling.svc/CompanySet(Company={#input.Company})/CompanyAddresses
   2026-01-20 00:42:34 Result (201) Created with No Reattempt
   2026-01-20 00:42:34 Command:  Output
2026-01-20 00:43:13 End

Test Report =======================================
  --------------------------
  TestData CreateSiteData
  Passed
  time: 201.6420736
  file: C:\\IFS-GH\\ifs-applications\\workspace\\inttst\\test\\inttst\\testdata\\AnD\\CreateSiteData.mkd
  system-out: Server calls: 32
              Failed server calls: 0
              Asserts: 0
              Failed asserts: 0
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 0
  failures: 0
  errors: 0
  time: 201.6420736
  timestamp: 1/20/2026 12:39:52 AM
  system-out: Server calls: 32
              Failed server calls: 0
              Asserts: 0
              Failed asserts: 0
              Exceptions 0
Test Report (end)  ----------------------------------
[
{ "Url": "CreateCompanyAssistantHandling.svc/DefaultTemplate()", "Count": "1", "Avg": "923", "Max": "923", "Min": "923" },
{ "Url": "CreateCompanyAssistantHandling.svc/CreateNewCompany", "Count": "1", "Avg": "155095", "Max": "155095", "Min": "155095" },
{ "Url": "CompanyHandling.svc/CompanySet(Company={#input.Company})", "Count": "1", "Avg": "1563", "Max": "1563", "Min": "1563" },
{ "Url": "CompanyHandling.svc/CompanySet(Company={#input.Company})/CompanyAddresses", "Count": "1", "Avg": "1473", "Max": "1473", "Min": "1473" }
]`;

// Sample 2: Failed test with 404 Not Found
const SAMPLE_404_FAILED_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 10:15:30 Start
2026-01-20 10:15:32 Command:  Connect
2026-01-20 10:15:32 Connected as default user.
2026-01-20 10:15:32 Command:  Get CustomerHandling.svc/CustomerSet(CustomerId='INVALID-ID')
2026-01-20 10:15:33 Result (404) NotFound with No Reattempt
2026-01-20 10:15:33 Command:  Assert {$customer.CustomerId} == 'INVALID-ID'
2026-01-20 10:15:33 Assert failed: customer is null
2026-01-20 10:15:33 End

Test Report =======================================
  --------------------------
  TestCase CustomerLookupTest
  Failed
  time: 3.254
  file: C:\\tests\\CustomerLookupTest.mkd
  system-out: Server calls: 1
              Failed server calls: 1
              Asserts: 1
              Failed asserts: 1
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 1
  failures: 1
  errors: 0
  time: 3.254
Test Report (end)  ----------------------------------
[
{ "Url": "CustomerHandling.svc/CustomerSet(CustomerId='INVALID-ID')", "Count": "1", "Avg": "1200", "Max": "1200", "Min": "1200" }
]`;

// Sample 3: Authentication failure (401)
const SAMPLE_AUTH_FAILED_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 14:22:10 Start
2026-01-20 14:22:12 Command:  Connect
2026-01-20 14:22:13 Result (401) Unauthorized with No Reattempt
2026-01-20 14:22:13 Connection failed: Invalid credentials
2026-01-20 14:22:13 End

Test Report =======================================
  --------------------------
  TestCase SecureOperationTest
  Failed
  time: 3.12
  file: C:\\tests\\SecureOperationTest.mkd
  system-out: Server calls: 1
              Failed server calls: 1
              Asserts: 0
              Failed asserts: 0
              Exceptions: 1
Test Summary  ----------------------------------
  tests: 1
  failures: 1
  errors: 1
  time: 3.12
Test Report (end)  ----------------------------------
[
{ "Url": "Connect", "Count": "1", "Avg": "2100", "Max": "2100", "Min": "2100" }
]`;

// Sample 4: Validation error (422)
const SAMPLE_VALIDATION_FAILED_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 15:30:00 Start
2026-01-20 15:30:02 Command:  Connect
2026-01-20 15:30:02 Connected as default user.
2026-01-20 15:30:02 Command:  Eval "NEW-CUST"
2026-01-20 15:30:02 Command:  Create CustomerHandling.svc/CustomerSet
2026-01-20 15:30:03 Result (422) UnprocessableEntity with No Reattempt
2026-01-20 15:30:03 Validation Error: Field 'CustomerName' is required. Field 'Country' must be a valid ISO country code.
2026-01-20 15:30:03 End

Test Report =======================================
  --------------------------
  TestCase CreateCustomerValidation
  Failed
  time: 3.45
  file: C:\\tests\\CreateCustomerValidation.mkd
  system-out: Server calls: 1
              Failed server calls: 1
              Asserts: 0
              Failed asserts: 0
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 1
  failures: 1
  errors: 0
  time: 3.45
Test Report (end)  ----------------------------------
[
{ "Url": "CustomerHandling.svc/CustomerSet", "Count": "1", "Avg": "850", "Max": "850", "Min": "850" }
]`;

// Sample 5: Test Suite with multiple test cases
const SAMPLE_TEST_SUITE_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 16:00:00 Start
2026-01-20 16:00:02 Command:  Connect
2026-01-20 16:00:02 Connected as default user.
2026-01-20 16:00:02 Running Test Suite: CustomerManagement

2026-01-20 16:00:02 Command:  Call ./testcases/CreateCustomer.mkd
   2026-01-20 16:00:03 Command:  Create CustomerHandling.svc/CustomerSet
   2026-01-20 16:00:04 Result (201) Created with No Reattempt
   2026-01-20 16:00:04 Command:  Assert {$response.CustomerId} != null
   2026-01-20 16:00:04 Assert passed
   2026-01-20 16:00:04 Command:  Output

2026-01-20 16:00:05 Command:  Call ./testcases/UpdateCustomer.mkd
   2026-01-20 16:00:05 Command:  Modify CustomerHandling.svc/CustomerSet(CustomerId={#customerId})
   2026-01-20 16:00:06 Result (200) OK with No Reattempt
   2026-01-20 16:00:06 Command:  Assert {$response.CustomerName} == 'Updated Name'
   2026-01-20 16:00:06 Assert passed
   2026-01-20 16:00:06 Command:  Output

2026-01-20 16:00:07 Command:  Call ./testcases/DeleteCustomer.mkd
   2026-01-20 16:00:07 Command:  Delete CustomerHandling.svc/CustomerSet(CustomerId={#customerId})
   2026-01-20 16:00:08 Result (204) NoContent with No Reattempt
   2026-01-20 16:00:08 Command:  Output

2026-01-20 16:00:08 End

Test Report =======================================
  --------------------------
  TestSuite CustomerManagement
  Passed
  time: 8.234
  file: C:\\tests\\suites\\CustomerManagement.mkd
  system-out: Server calls: 3
              Failed server calls: 0
              Asserts: 2
              Failed asserts: 0
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 3
  failures: 0
  errors: 0
  time: 8.234
Test Report (end)  ----------------------------------
[
{ "Url": "CustomerHandling.svc/CustomerSet", "Count": "1", "Avg": "1200", "Max": "1200", "Min": "1200" },
{ "Url": "CustomerHandling.svc/CustomerSet(CustomerId={#customerId})", "Count": "2", "Avg": "950", "Max": "1100", "Min": "800" }
]`;

// Sample 6: Deeply nested Call commands
const SAMPLE_NESTED_CALLS_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 17:00:00 Start
2026-01-20 17:00:02 Command:  Connect
2026-01-20 17:00:02 Connected as default user.
2026-01-20 17:00:02 Command:  Call ../../setup/MasterData.mkd
   2026-01-20 17:00:03 Command:  Call ../common/CreateCompany.mkd
      2026-01-20 17:00:03 Command:  Get CompanyHandling.svc/CompanySet?$top=1
      2026-01-20 17:00:04 Result (200) OK with No Reattempt
      2026-01-20 17:00:04 Command:  Create CompanyHandling.svc/CompanySet
      2026-01-20 17:00:05 Result (201) Created with No Reattempt
      2026-01-20 17:00:05 Command:  Output
   2026-01-20 17:00:05 Command:  Call ../common/CreateSite.mkd
      2026-01-20 17:00:06 Command:  Get CompanySiteHandling.svc/CompanySiteSet?$top=1
      2026-01-20 17:00:06 Result (200) OK with No Reattempt
      2026-01-20 17:00:07 Command:  Create CompanySiteHandling.svc/CompanySiteSet
      2026-01-20 17:00:08 Result (201) Created with No Reattempt
      2026-01-20 17:00:08 Command:  Output
   2026-01-20 17:00:08 Command:  Output
2026-01-20 17:00:08 Command:  Call ../../tests/InventoryTest.mkd
   2026-01-20 17:00:09 Command:  Get InventoryHandling.svc/InventoryPartSet
   2026-01-20 17:00:10 Result (200) OK with No Reattempt
   2026-01-20 17:00:10 Command:  Assert {$parts.value.length} > 0
   2026-01-20 17:00:10 Assert passed
   2026-01-20 17:00:10 Command:  Output
2026-01-20 17:00:10 End

Test Report =======================================
  --------------------------
  TestSuite FullIntegrationTest
  Passed
  time: 10.567
  file: C:\\tests\\integration\\FullIntegrationTest.mkd
  system-out: Server calls: 5
              Failed server calls: 0
              Asserts: 1
              Failed asserts: 0
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 1
  failures: 0
  errors: 0
  time: 10.567
Test Report (end)  ----------------------------------
[
{ "Url": "CompanyHandling.svc/CompanySet?$top=1", "Count": "1", "Avg": "800", "Max": "800", "Min": "800" },
{ "Url": "CompanyHandling.svc/CompanySet", "Count": "1", "Avg": "1500", "Max": "1500", "Min": "1500" },
{ "Url": "CompanySiteHandling.svc/CompanySiteSet?$top=1", "Count": "1", "Avg": "650", "Max": "650", "Min": "650" },
{ "Url": "CompanySiteHandling.svc/CompanySiteSet", "Count": "1", "Avg": "2100", "Max": "2100", "Min": "2100" },
{ "Url": "InventoryHandling.svc/InventoryPartSet", "Count": "1", "Avg": "920", "Max": "920", "Min": "920" }
]`;

// Sample 7: Multiple failures with high failure rate
const SAMPLE_MULTI_FAILURE_OUTPUT = `IFS Script-A-Rest v 2.4.0
======================================

2026-01-20 18:00:00 Start
2026-01-20 18:00:02 Command:  Connect
2026-01-20 18:00:02 Connected as default user.
2026-01-20 18:00:02 Command:  Get OrderHandling.svc/OrderSet(OrderId='ORD-001')
2026-01-20 18:00:03 Result (404) NotFound with No Reattempt
2026-01-20 18:00:03 Command:  Get OrderHandling.svc/OrderSet(OrderId='ORD-002')
2026-01-20 18:00:04 Result (404) NotFound with No Reattempt
2026-01-20 18:00:04 Command:  Get OrderHandling.svc/OrderSet(OrderId='ORD-003')
2026-01-20 18:00:05 Result (200) OK with No Reattempt
2026-01-20 18:00:05 Command:  Get OrderHandling.svc/OrderSet(OrderId='ORD-004')
2026-01-20 18:00:06 Result (500) InternalServerError with No Reattempt
2026-01-20 18:00:06 Command:  Assert {$orders.length} == 4
2026-01-20 18:00:06 Assert failed: Expected 4, got 1
2026-01-20 18:00:06 End

Test Report =======================================
  --------------------------
  TestCase BulkOrderLookup
  Failed
  time: 6.123
  file: C:\\tests\\BulkOrderLookup.mkd
  system-out: Server calls: 4
              Failed server calls: 3
              Asserts: 1
              Failed asserts: 1
              Exceptions: 0
Test Summary  ----------------------------------
  tests: 1
  failures: 1
  errors: 0
  time: 6.123
Test Report (end)  ----------------------------------
[
{ "Url": "OrderHandling.svc/OrderSet(OrderId='ORD-001')", "Count": "1", "Avg": "1000", "Max": "1000", "Min": "1000" },
{ "Url": "OrderHandling.svc/OrderSet(OrderId='ORD-002')", "Count": "1", "Avg": "1100", "Max": "1100", "Min": "1100" },
{ "Url": "OrderHandling.svc/OrderSet(OrderId='ORD-003')", "Count": "1", "Avg": "950", "Max": "950", "Min": "950" },
{ "Url": "OrderHandling.svc/OrderSet(OrderId='ORD-004')", "Count": "1", "Avg": "1200", "Max": "1200", "Min": "1200" }
]`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function printTestReport(result: ReturnType<OutputParser['parse']>) {
  console.log('\n📊 Parsed Test Report:');
  console.log(`   Test Name:      ${result.report.testName}`);
  console.log(`   Status:         ${result.report.status === 'Passed' ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   Time:           ${result.report.timeSeconds.toFixed(2)}s`);
  console.log(`   Server Calls:   ${result.report.serverCalls}`);
  console.log(`   Failed Calls:   ${result.report.failedServerCalls}`);
  console.log(`   Asserts:        ${result.report.asserts}`);
  console.log(`   Failed Asserts: ${result.report.failedAsserts}`);
  console.log(`   Exceptions:     ${result.report.exceptions}`);
}

function printErrors(result: ReturnType<OutputParser['parse']>) {
  if (result.errors.length === 0) {
    console.log('\n✅ No errors detected');
    return;
  }
  console.log(`\n❌ Errors Found: ${result.errors.length}`);
  result.errors.forEach((err, idx) => {
    console.log(`\n   Error ${idx + 1}:`);
    console.log(`     Type:       ${err.type}`);
    console.log(`     Message:    ${err.message}`);
    if (err.statusCode) {
      console.log(`     Status:     HTTP ${err.statusCode}`);
    }
    if (err.suggestion) {
      console.log(`     Suggestion: ${err.suggestion}`);
    }
  });
}

function printAnalysis(analysis: ReturnType<ResultAnalyzer['analyze']>) {
  console.log('\n📋 Analysis:');
  console.log(`   ${analysis.summary}`);
  
  if (analysis.issues.length > 0) {
    console.log('\n   Issues:');
    analysis.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      console.log(`     ${icon} [${issue.severity.toUpperCase()}] ${issue.description}`);
      if (issue.suggestion) {
        console.log(`        └─ ${issue.suggestion}`);
      }
    });
  }

  if (analysis.performance.recommendations.length > 0) {
    console.log('\n   Performance Recommendations:');
    analysis.performance.recommendations.forEach(rec => {
      console.log(`     • ${rec}`);
    });
  }
}

function printServerStats(result: ReturnType<OutputParser['parse']>) {
  if (result.serverCallStats.length === 0) return;
  
  console.log(`\n📈 Server Call Statistics (${result.serverCallStats.length} endpoints):`);
  result.serverCallStats.slice(0, 5).forEach(stat => {
    const url = stat.url.length > 45 ? stat.url.substring(0, 45) + '...' : stat.url;
    console.log(`     ${url}`);
    console.log(`       calls: ${stat.count}, avg: ${stat.avgMs}ms, max: ${stat.maxMs}ms`);
  });
  if (result.serverCallStats.length > 5) {
    console.log(`     ... and ${result.serverCallStats.length - 5} more endpoints`);
  }
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         SAR Test MCP - Comprehensive Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  const parser = new OutputParser();
  const analyzer = new ResultAnalyzer();

  const testCases = [
    {
      name: 'TEST 1: Successful Test Data Execution',
      description: 'Parses output from a successful TestData file that creates company/site data',
      output: SAMPLE_SUCCESS_OUTPUT,
    },
    {
      name: 'TEST 2: Failed Test - 404 Not Found',
      description: 'Parses output with 404 error when entity does not exist',
      output: SAMPLE_404_FAILED_OUTPUT,
    },
    {
      name: 'TEST 3: Authentication Failure (401)',
      description: 'Parses output when authentication fails',
      output: SAMPLE_AUTH_FAILED_OUTPUT,
    },
    {
      name: 'TEST 4: Validation Error (422)',
      description: 'Parses output when server returns validation errors',
      output: SAMPLE_VALIDATION_FAILED_OUTPUT,
    },
    {
      name: 'TEST 5: Test Suite with Multiple Test Cases',
      description: 'Parses output from a TestSuite running multiple test cases',
      output: SAMPLE_TEST_SUITE_OUTPUT,
    },
    {
      name: 'TEST 6: Deeply Nested Call Commands',
      description: 'Parses output with multiple levels of nested Call commands',
      output: SAMPLE_NESTED_CALLS_OUTPUT,
    },
    {
      name: 'TEST 7: Multiple Failures (High Failure Rate)',
      description: 'Parses output with multiple failed server calls and assertions',
      output: SAMPLE_MULTI_FAILURE_OUTPUT,
    },
  ];

  for (const testCase of testCases) {
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log(`│ ${testCase.name.padEnd(61)}│`);
    console.log('└───────────────────────────────────────────────────────────────┘');
    console.log(`   ${testCase.description}`);

    const result = parser.parse(testCase.output);
    const analysis = analyzer.analyze(result);

    printTestReport(result);
    printErrors(result);
    printServerStats(result);
    printAnalysis(analysis);

    console.log('\n');
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL TESTS COMPLETE                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  console.log('\n✅ SAR Test MCP Demonstrated Capabilities:');
  console.log('   • Parse ScriptARest command line output');
  console.log('   • Extract test report (status, time, server calls, asserts)');
  console.log('   • Parse individual commands with results (200, 201, 404, 401, 422, 500)');
  console.log('   • Handle nested Call command structures');
  console.log('   • Extract server call performance statistics');
  console.log('   • Identify errors: server failures, auth errors, validation errors');
  console.log('   • Detect assert failures');
  console.log('   • Calculate failure rates and detect high-failure scenarios');
  console.log('   • Provide context-aware fix suggestions');
  console.log('   • Analyze performance and recommend improvements');

  console.log('\n📌 Available MCP Tools:');
  console.log('   ┌────────────────────┬─────────────────────────────────────────┐');
  console.log('   │ Tool               │ Description                             │');
  console.log('   ├────────────────────┼─────────────────────────────────────────┤');
  console.log('   │ configureRunner    │ Set ScriptARest path and credentials    │');
  console.log('   │ runTest            │ Execute a TAR test file                 │');
  console.log('   │ analyzeResults     │ Analyze raw test output                 │');
  console.log('   │ validateFile       │ Validate TAR file syntax                │');
  console.log('   │ validateContent    │ Validate TAR content (string)           │');
  console.log('   │ validateSuite      │ Validate all files in a directory       │');
  console.log('   │ checkAaaStructure  │ Check Arrange-Act-Assert structure      │');
  console.log('   │ checkCommands      │ Validate TAR commands                   │');
  console.log('   │ getRunnerStatus    │ Check runner configuration status       │');
  console.log('   │ getValidationRules │ Get current validation rules            │');
  console.log('   └────────────────────┴─────────────────────────────────────────┘');

  console.log('\n🔧 Configuration:');
  console.log('   Environment Variables:');
  console.log('     SAR_SCRIPT_A_REST_PATH  Path to ScriptARest.exe');
  console.log('     SAR_SERVER_URL          IFS Cloud server URL');
  console.log('     SAR_USERNAME            Authentication username');
  console.log('     SAR_PASSWORD            Authentication password');
  console.log('     SAR_TIMEOUT_MS          Timeout in milliseconds (default: 600000)');
  console.log();
}

runTests().catch(console.error);
