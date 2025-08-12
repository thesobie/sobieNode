#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Comprehensive test suite for SOBIE Node.js application
const testSuite = [
  // Core functionality tests
  {
    name: "1. Data Model Tests",
    file: "test-proceedings-model.js",
    category: "Data Models",
    description: "Test proceedings workflow data model and methods"
  },
  {
    name: "2. Presenter Availability",
    file: "test-presenter-availability.js", 
    category: "New Features",
    description: "Test presenter availability tracking for conference scheduling"
  },
  {
    name: "3. Co-Author Management",
    file: "test-coauthor-management.js",
    category: "Research Management", 
    description: "Test co-author capacity and management system"
  },
  {
    name: "4. Research Submission",
    file: "test-research-submission.js",
    category: "Research Management",
    description: "Test research submission workflow"
  },
  {
    name: "5. Suggestion System",
    file: "test-suggestion-system.js",
    category: "User Interaction",
    description: "Test user suggestion and feedback system"
  },
  {
    name: "6. Admin Suggestions",
    file: "test-admin-suggestions.js",
    category: "Admin Features",
    description: "Test administrative suggestion management"
  },
  {
    name: "7. User Participation",
    file: "test-user-participation.js",
    category: "User Management",
    description: "Test user participation and role management"
  },
  {
    name: "8. Conference Administration",
    file: "test-admin-conference.js",
    category: "Admin Features",
    description: "Test conference administration features"
  },
  {
    name: "9. Conference Registration",
    file: "test-conference-registration.js",
    category: "Registration",
    description: "Test conference registration workflow"
  },
  {
    name: "10. Payment System",
    file: "test-payment-system.js",
    category: "Financial",
    description: "Test payment processing and management"
  },
  {
    name: "11. Authentication Flow",
    file: "test-full-auth-flow.js",
    category: "Security",
    description: "Test complete authentication workflow"
  }
];

let totalTests = testSuite.length;
let passedTests = 0;
let failedTests = 0;
let results = [];

console.log('\n🚀 SOBIE Platform - Comprehensive Test Suite');
console.log('═'.repeat(60));
console.log(`📋 Running ${totalTests} test suites...\n`);

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
          console.log(`🔍 Error: ${stderr.slice(0, 200)}...`);
        }
      }

      results.push({
        name: testConfig.name,
        category: testConfig.category,
        file: testConfig.file,
        success,
        duration,
        error: stderr.slice(0, 500)
      });

      // Progress indicator
      console.log(`📊 Progress: ${index + 1}/${totalTests} complete`);
      
      resolve();
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      testProcess.kill('SIGTERM');
      failedTests++;
      results.push({
        name: testConfig.name,
        category: testConfig.category,
        file: testConfig.file,
        success: false,
        duration: 60000,
        error: 'Test timed out after 60 seconds'
      });
      resolve();
    }, 60000);
  });
}

async function runAllTests() {
  for (let i = 0; i < testSuite.length; i++) {
    await runTest(testSuite[i], i);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final results
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(60));
  
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
  });

  // Failed tests details
  const failedTestsList = results.filter(r => !r.success);
  if (failedTestsList.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedTestsList.forEach(test => {
      console.log(`   📄 ${test.name}`);
      console.log(`      File: ${test.file}`);
      if (test.error) {
        console.log(`      Error: ${test.error.split('\n')[0]}`);
      }
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

  console.log('\n' + '═'.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! The SOBIE platform is working perfectly! 🎊');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('═'.repeat(60));
  
  process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
