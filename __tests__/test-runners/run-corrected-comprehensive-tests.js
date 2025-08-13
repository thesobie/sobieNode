#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Corrected comprehensive test suite for SOBIE Node.js application
const testSuite = [
  // Core functionality tests
  {
    name: "1. Data Model Tests",
    file: "../proceedings/test-proceedings-model.js",
    category: "Data Models",
    description: "Test proceedings workflow data model and methods"
  },
  {
    name: "2. Presenter Availability",
    file: "../availability/test-presenter-availability.js", 
    category: "New Features",
    description: "Test presenter availability tracking for conference scheduling"
  },
  {
    name: "3. Availability API",
    file: "../conference/test-availability-api.js",
    category: "Research Management", 
    description: "Test presenter availability API endpoints"
  },
  {
    name: "4. Co-Author Management",
    file: "../coauthors/test-coauthor-management.js",
    category: "Research Management", 
    description: "Test co-author capacity and management system"
  },
  {
    name: "5. Research Submission",
    file: "../research/test-research-submission.js",
    category: "Research Management",
    description: "Test research submission workflow"
  },
  {
    name: "6. Proceedings Workflow",
    file: "../proceedings/test-proceedings-workflow.js",
    category: "Research Management",
    description: "Test proceedings workflow API"
  },
  {
    name: "7. Suggestion System",
    file: "../suggestions/test-suggestion-system.js",
    category: "User Interaction",
    description: "Test user suggestion and feedback system"
  },
  {
    name: "8. Admin Suggestions",
    file: "../suggestions/test-admin-suggestions.js",
    category: "Admin Features",
    description: "Test administrative suggestion management"
  },
  {
    name: "9. User Participation",
    file: "../participation/test-user-participation.js",
    category: "User Management",
    description: "Test user participation and role management"
  },
  {
    name: "10. Conference Administration",
    file: "../conference/test-admin-conference.js",
    category: "Admin Features",
    description: "Test conference administration features"
  },
  {
    name: "11. Conference Registration",
    file: "../conference/test-conference-registration.js",
    category: "Registration",
    description: "Test conference registration workflow"
  },
  {
    name: "12. Payment System",
    file: "../payments/test-payment-system.js",
    category: "Financial",
    description: "Test payment processing and management"
  },
  {
    name: "13. Authentication Flow",
    file: "../auth/test-full-auth-flow.js",
    category: "Security",
    description: "Test complete authentication workflow"
  }
];

let totalTests = testSuite.length;
let passedTests = 0;
let failedTests = 0;
let results = [];

console.log('\n🚀 SOBIE Platform - Corrected Comprehensive Test Suite');
console.log('═'.repeat(70));
console.log(`📋 Running ${totalTests} test suites (including Research Management tests)...\n`);

function runTest(testConfig, index) {
  return new Promise((resolve) => {
    console.log(`\n🧪 ${testConfig.name}`);
    console.log(`📂 Category: ${testConfig.category}`);
    console.log(`📝 ${testConfig.description}`);
    console.log(`⚙️  Executing: ${testConfig.file}`);
    console.log('─'.repeat(50));

    const startTime = Date.now();
    const testProcess = spawn('node', [testConfig.file], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      if (success) {
        passedTests++;
        console.log(`✅ PASSED (${duration}ms)`);
      } else {
        failedTests++;
        console.log(`❌ FAILED (${duration}ms)`);
        if (stderr) {
          console.log(`   Error: ${stderr.split('\n')[0]}`);
        }
      }

      results.push({
        name: testConfig.name,
        file: testConfig.file,
        category: testConfig.category,
        success: success,
        duration: duration,
        error: stderr
      });

      resolve();
    });

    // Send 'y' to any cleanup prompts
    testProcess.stdin.write('y\n');
    testProcess.stdin.end();
  });
}

async function runAllTests() {
  for (let i = 0; i < testSuite.length; i++) {
    await runTest(testSuite[i], i);
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎯 CORRECTED COMPREHENSIVE TEST RESULTS`);
  console.log(`${'═'.repeat(60)}`);
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${failedTests}/${totalTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);

  // Group results by category
  const categories = {};
  results.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { passed: 0, failed: 0, tests: [] };
    }
    categories[result.category].tests.push(result);
    if (result.success) {
      categories[result.category].passed++;
    } else {
      categories[result.category].failed++;
    }
  });

  console.log(`\n📋 Results by Category:`);
  Object.keys(categories).forEach(category => {
    const cat = categories[category];
    const total = cat.passed + cat.failed;
    const rate = Math.round((cat.passed / total) * 100);
    console.log(`   ${category}: ${cat.passed}/${total} (${rate}%)`);
    
    // Show which tests passed/failed
    cat.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`     ${status} ${test.name}`);
    });
  });

  // Failed tests details
  const failedTestsList = results.filter(r => !r.success);
  if (failedTestsList.length > 0) {
    console.log(`\n❌ Failed Tests Analysis:`);
    failedTestsList.forEach(test => {
      console.log(`   📄 ${test.name} (${test.file})`);
      if (test.error) {
        const errorLines = test.error.split('\n').filter(line => line.trim());
        console.log(`      Issue: ${errorLines[0] || 'Unknown error'}`);
      }
    });
  }

  // Research Management specific analysis
  const researchCategory = categories['Research Management'];
  if (researchCategory) {
    console.log(`\n🔬 Research Management Analysis:`);
    console.log(`   Total Tests: ${researchCategory.passed + researchCategory.failed}`);
    console.log(`   Passed: ${researchCategory.passed}`);
    console.log(`   Failed: ${researchCategory.failed}`);
    console.log(`   Success Rate: ${Math.round((researchCategory.passed / (researchCategory.passed + researchCategory.failed)) * 100)}%`);
    
    researchCategory.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const note = test.success ? 'Working' : 'Needs attention';
      console.log(`     ${status} ${test.file} - ${note}`);
    });
  }

  // Performance insights
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const fastestTest = results.reduce((min, r) => r.duration < min.duration ? r : min);
  const slowestTest = results.reduce((max, r) => r.duration > max.duration ? r : max);

  console.log(`\n⚡ Performance:`);
  console.log(`   Average Duration: ${Math.round(avgDuration)}ms`);
  console.log(`   Fastest: ${fastestTest.name} (${fastestTest.duration}ms)`);
  console.log(`   Slowest: ${slowestTest.name} (${slowestTest.duration}ms)`);

  console.log(`\n🔍 Test Environment Notes:`);
  console.log(`   • API tests require server to be running`);
  console.log(`   • Some tests may timeout due to rate limiting`);
  console.log(`   • External dependencies may affect results`);
  console.log(`   • Database tests run against MongoDB`);

  if (failedTests > 0) {
    console.log(`\n⚠️  Action Items:`);
    failedTestsList.forEach(test => {
      if (test.file.includes('api') || test.file.includes('workflow')) {
        console.log(`   • Start server before running ${test.file}`);
      }
      if (test.error && test.error.includes('timeout')) {
        console.log(`   • Check for rate limiting in ${test.file}`);
      }
      if (test.error && test.error.includes('500')) {
        console.log(`   • Check server configuration for ${test.file}`);
      }
    });
  }

  console.log(`\n🎉 Comprehensive test analysis complete!`);
}

// Run the test suite
runAllTests().catch(console.error);
