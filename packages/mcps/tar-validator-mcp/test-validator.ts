/**
 * Test script for TAR Validator MCP
 * Tests validation of different TAR file types
 */

import { TarParser } from './src/parser/tar-parser.js';
import { MetadataValidator } from './src/validators/metadata-validator.js';
import { AaaValidator } from './src/validators/aaa-validator.js';
import { CommandValidator } from './src/validators/command-validator.js';
import { PatternValidator } from './src/validators/pattern-validator.js';

// Sample TAR files for testing
const TEST_CASE_VALID = `---
type: Test Case
owner: Airline and Defense Operators
mode: Standalone
---

# 10.30.2.1N Perform Maintenance - Raise Logbook Fault

## Description
Raise a logbook fault for aircraft.

## Arrange
1. Set up the aircraft and inbound flight.
2. Capture the fault details.

\`\`\`cs
Connect alain

Eval "IFSAD-1375" Into Aircraft
Eval "MEX-IN-500" Into InboundFlightName
Eval "LOG-" + RandomWithRange(1000,9999).ToString() Into LogbookReference

ApplyJson Into RaiseFaultInitPayload
{
  "Aircraft": {%Aircraft},
  "ArrivalFlight": {%InboundFlightName},
  "LogbookReference": {%LogbookReference}
}
\`\`\`

## Act
1. Invoke RaiseLogbookFault.mkd with the prepared payload.

\`\`\`cs
Call CatchError ../util/RaiseLogbookFault.mkd With Json Into Response
{$RaiseFaultInitPayload}
\`\`\`

## Assert
1. Assert response status and returned identifiers.

\`\`\`cs
Get FlmTaskDetailHandling.svc/AvExeTaskSet?$filter=(TaskSeq eq {$Response.TaskSeq}) Into TaskDetails

Assert {$Response.ResponseStatusCode} == 200
Assert {%TaskDetails.value.Items(0).TaskSeq} == {%Response.TaskSeq}
\`\`\`
`;

const TEST_UTIL_VALID = `---
type: Test Util
owner: Airline and Defense Operators
---

# Add Skill Requirement Util

## Description
Add Demand Line and Assignments for a task

### Required input
- TaskSeq
- SkillDemandResSeq

### Output
Create Demand Lines and Assignment for the task

\`\`\`cs
Get FlmTaskDetailHandling.svc/AddAssignmentVirtualSet/IfsApp.FlmTaskDetailHandling.AddAssignmentVirtual_Default() Into AddAssignmentDefaultResponse

Create FlmTaskDetailHandling.svc/AddAssignmentVirtualSet Using AddAssignmentDefaultResponse Into AddAssignmentResponse
{$input}

Output AddAssignmentResponse
\`\`\`
`;

const TEST_DATA_VALID = `---
type: Test Data
owner: Airline and Defense Operators
---

# Mobile Maintenance Test Data - Sites

## Companies
Company  | Description | Currency | Country
-------- | ----------- | -------- | --------
AND-COM  | AnD Company | USD      | US

\`\`\`cs
Connect

Eval "AND-COM" Into company
Eval "AnD Company" Into companyDescription

Call CatchError ../../CreateCompany/util/CreateCompany.mkd With Json
{
    "Company": {%company},
    "Description": {%companyDescription}
}
\`\`\`
`;

const TEST_SUITE_VALID = `---
type: Test Suite
owner: Airline and Defense Operators
mode: Standalone
---

# 10.30.2.1N Perform Maintenance - Raise Fault

## Description
Raise a fault from an aircraft turn.

\`\`\`cs
Call CatchError tests/RaiseLogbookFault.mkd
Call CatchError tests/RaiseFaultFromLobbyToATurn.mkd
Call CatchError tests/RaiseFaultFromLobbyToAnAircraft.mkd
\`\`\`
`;

const TEST_COLLECTION_VALID = `---
type: Test Collection
owner: Airline and Defense Operators
mode: Standalone
---

# 10.30.2.2 Perform Maintenance

## Description
Perform Maintenance test collection.

\`\`\`cs
Call CatchError RecordWork/RecordWork.mkd
Call CatchError FaultsSearch/FaultsSearch.mkd
Call CatchError StepSignOff/StepSingOff.mkd
\`\`\`
`;

const INVALID_MISSING_METADATA = `# Test Without Metadata

## Description
This file has no frontmatter.

\`\`\`cs
Get SomeService.svc/EntitySet Into result
\`\`\`
`;

const INVALID_WRONG_TYPE = `---
type: Invalid Type
owner: Some Team
---

# Invalid Type Test

\`\`\`cs
Get SomeService.svc/EntitySet Into result
\`\`\`
`;

const INVALID_TEST_CASE_MISSING_MODE = `---
type: Test Case
owner: Some Team
---

# Test Case Missing Mode

## Act

\`\`\`cs
Get SomeService.svc/EntitySet Into result
\`\`\`

## Assert

\`\`\`cs
Assert {$result.value} != null
\`\`\`
`;

const INVALID_TEST_UTIL_WITH_ASSERT = `---
type: Test Util
owner: Some Team
---

# Test Util With Assert (Invalid)

\`\`\`cs
Get SomeService.svc/EntitySet Into result
Assert {$result.value} != null
\`\`\`
`;

// Test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('TAR Validator MCP - Test Suite');
  console.log('='.repeat(60));
  console.log();

  const parser = new TarParser();
  const metadataValidator = new MetadataValidator();
  const aaaValidator = new AaaValidator();
  const commandValidator = new CommandValidator();
  const patternValidator = new PatternValidator();

  const testCases = [
    { name: 'Valid Test Case', content: TEST_CASE_VALID, expectValid: true },
    { name: 'Valid Test Util', content: TEST_UTIL_VALID, expectValid: true },
    { name: 'Valid Test Data', content: TEST_DATA_VALID, expectValid: true },
    { name: 'Valid Test Suite', content: TEST_SUITE_VALID, expectValid: true },
    { name: 'Valid Test Collection', content: TEST_COLLECTION_VALID, expectValid: true },
    { name: 'Invalid - Missing Metadata', content: INVALID_MISSING_METADATA, expectValid: false },
    { name: 'Invalid - Wrong Type', content: INVALID_WRONG_TYPE, expectValid: false },
    { name: 'Invalid - Test Case Missing Mode', content: INVALID_TEST_CASE_MISSING_MODE, expectValid: false },
    { name: 'Invalid - Test Util With Assert', content: INVALID_TEST_UTIL_WITH_ASSERT, expectValid: false },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('-'.repeat(40));

    try {
      const doc = await parser.parse(testCase.content);
      
      // Run validators
      const metadataIssues = metadataValidator.validate(doc);
      const aaaIssues = aaaValidator.validate(doc);
      const commandIssues = commandValidator.validate(doc);
      const patternResult = patternValidator.validate(doc);

      const allErrors = [
        ...metadataIssues.filter(i => i.severity === 'error'),
        ...aaaIssues.filter(i => i.severity === 'error'),
        ...commandIssues.filter(i => i.severity === 'error'),
        ...patternResult.issues.filter(i => i.severity === 'error'),
      ];

      const allWarnings = [
        ...metadataIssues.filter(i => i.severity === 'warning'),
        ...aaaIssues.filter(i => i.severity === 'warning'),
        ...commandIssues.filter(i => i.severity === 'warning'),
        ...patternResult.issues.filter(i => i.severity === 'warning'),
      ];

      const isValid = allErrors.length === 0;
      const testPassed = isValid === testCase.expectValid;

      console.log(`  File Type: ${doc.fileType ?? 'Unknown'}`);
      console.log(`  Commands Found: ${doc.commands.length}`);
      console.log(`  Variables Found: ${doc.variables.length}`);
      console.log(`  Patterns Found: ${doc.patterns.length}`);
      console.log(`  Errors: ${allErrors.length}`);
      console.log(`  Warnings: ${allWarnings.length}`);

      if (allErrors.length > 0) {
        console.log('  Error Details:');
        for (const error of allErrors.slice(0, 3)) {
          console.log(`    - [${error.code}] ${error.message}`);
        }
        if (allErrors.length > 3) {
          console.log(`    ... and ${allErrors.length - 3} more errors`);
        }
      }

      if (testPassed) {
        console.log(`  Result: ✓ PASSED (expected ${testCase.expectValid ? 'valid' : 'invalid'}, got ${isValid ? 'valid' : 'invalid'})`);
        passed++;
      } else {
        console.log(`  Result: ✗ FAILED (expected ${testCase.expectValid ? 'valid' : 'invalid'}, got ${isValid ? 'valid' : 'invalid'})`);
        failed++;
      }
    } catch (error) {
      console.log(`  Result: ✗ ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
