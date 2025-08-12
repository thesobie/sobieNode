const mongoose = require('mongoose');
const BugReport = require('../models/BugReport');
const User = require('../models/User');
const githubService = require('../services/githubService');

// Test the bug reporting system
const testBugReporting = async () => {
  try {
    console.log('🐛 Testing Bug Reporting System...\n');

    // Find a test user
    const user = await User.findOne({ isActive: true });
    if (!user) {
      console.log('❌ No active users found for testing');
      return;
    }

    console.log(`👤 Test user: ${user.name.firstName} ${user.name.lastName}\n`);

    // Test 1: Create a bug report
    console.log('1️⃣ Testing Bug Report Creation...');
    const bugReport = new BugReport({
      reporterId: user._id,
      title: 'Test Bug Report - Login Button Not Working',
      description: 'When I click the login button, nothing happens. The page doesn\'t respond and no error message is shown.',
      category: 'functionality',
      severity: 'medium',
      priority: 'normal',
      stepsToReproduce: [
        { step: 1, description: 'Navigate to the login page' },
        { step: 2, description: 'Enter valid username and password' },
        { step: 3, description: 'Click the login button' },
        { step: 4, description: 'Observe that nothing happens' }
      ],
      expectedBehavior: 'User should be logged in and redirected to dashboard',
      actualBehavior: 'Nothing happens when clicking the button',
      additionalContext: 'This issue started happening after the latest update',
      environment: {
        browser: 'Chrome',
        browserVersion: '119.0.0.0',
        operatingSystem: 'macOS Ventura 13.6',
        screenResolution: '1920x1080',
        url: 'https://sobie.example.com/login',
        timestamp: new Date()
      },
      userCanContact: true,
      contactPreference: 'in_app',
      status: 'submitted'
    });

    await bugReport.save();
    console.log(`✅ Bug report created with ID: ${bugReport._id}\n`);

    // Test 2: Generate GitHub issue content
    console.log('2️⃣ Testing GitHub Issue Content Generation...');
    await bugReport.populate('reporterId', 'name email');
    
    const issueBody = bugReport.generateGithubIssueBody();
    const issueLabels = bugReport.generateGithubLabels();
    
    console.log('📝 Generated Issue Body (first 300 chars):');
    console.log(issueBody.substring(0, 300) + '...\n');
    
    console.log('🏷️  Generated Labels:');
    console.log(issueLabels.join(', ') + '\n');

    // Test 3: Test GitHub service (if configured)
    console.log('3️⃣ Testing GitHub Service Configuration...');
    const githubStatus = await githubService.validateConfiguration();
    
    if (githubStatus.valid) {
      console.log('✅ GitHub integration is properly configured');
      console.log(`📁 Repository: ${githubStatus.repository.fullName}`);
      console.log(`🔗 URL: ${githubStatus.repository.url}\n`);
      
      // Test creating a GitHub issue (only if token is available)
      if (process.env.GITHUB_TOKEN) {
        console.log('4️⃣ Testing GitHub Issue Creation...');
        try {
          const result = await githubService.createIssueFromBugReport(bugReport);
          
          if (result.success) {
            console.log(`✅ GitHub issue created successfully!`);
            console.log(`📊 Issue #${result.issue.number}`);
            console.log(`🔗 URL: ${result.issue.url}\n`);
            
            // Update bug report with GitHub info
            bugReport.githubIssue = {
              issueNumber: result.issue.number,
              issueUrl: result.issue.url,
              createdAt: new Date(result.issue.createdAt),
              status: 'created'
            };
            await bugReport.save();
            
            console.log('✅ Bug report updated with GitHub issue information\n');
          } else {
            console.log(`❌ GitHub issue creation failed: ${result.error}\n`);
          }
        } catch (error) {
          console.log(`❌ Error creating GitHub issue: ${error.message}\n`);
        }
      } else {
        console.log('⚠️  GITHUB_TOKEN not set - skipping issue creation test\n');
      }
    } else {
      console.log(`❌ GitHub integration not configured: ${githubStatus.error}\n`);
    }

    // Test 4: Test bug report statistics
    console.log('5️⃣ Testing Bug Report Statistics...');
    const stats = await BugReport.getBugStatistics({});
    console.log('📊 Bug Report Statistics:');
    console.log(`   Total bugs: ${stats.totalBugs}`);
    console.log(`   By status:`, stats.byStatus);
    console.log(`   By category:`, stats.byCategory);
    console.log(`   By severity:`, stats.bySeverity);
    console.log(`   Avg time to resolve: ${stats.avgTimeToResolve} hours\n`);

    // Test 5: Test virtual fields
    console.log('6️⃣ Testing Virtual Fields...');
    console.log(`⏰ Time since reported: ${bugReport.timeSinceReported}`);
    console.log(`🔗 GitHub URL: ${bugReport.githubUrl || 'Not available'}\n`);

    console.log('🎉 All bug reporting tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log(`   • Bug report ID: ${bugReport._id}`);
    console.log(`   • Category: ${bugReport.category}`);
    console.log(`   • Severity: ${bugReport.severity}`);
    console.log(`   • GitHub integration: ${githubStatus.valid ? '✅ Working' : '❌ Not configured'}`);
    if (bugReport.githubIssue?.issueNumber) {
      console.log(`   • GitHub issue: #${bugReport.githubIssue.issueNumber}`);
    }

  } catch (error) {
    console.error('❌ Bug reporting test failed:', error.message);
    console.error(error.stack);
  }
};

// Test GitHub service features
const testGitHubFeatures = async () => {
  console.log('\n🔧 Testing GitHub Service Features...\n');

  try {
    // Test 1: Validate configuration
    console.log('1️⃣ Testing Configuration Validation...');
    const validation = await githubService.validateConfiguration();
    console.log(`Configuration valid: ${validation.valid}`);
    if (validation.error) {
      console.log(`Error: ${validation.error}`);
    }
    if (validation.repository) {
      console.log(`Repository: ${validation.repository.fullName}`);
    }

    // Test 2: Search for existing issues
    if (validation.valid && process.env.GITHUB_TOKEN) {
      console.log('\n2️⃣ Testing Issue Search...');
      const searchResult = await githubService.searchIssues('bug login');
      if (searchResult.success) {
        console.log(`Found ${searchResult.issues.length} existing issues`);
        if (searchResult.issues.length > 0) {
          console.log(`Latest issue: #${searchResult.issues[0].number} - ${searchResult.issues[0].title}`);
        }
      }

      // Test 3: Ensure labels exist
      console.log('\n3️⃣ Testing Label Creation...');
      const labelResult = await githubService.ensureLabelsExist();
      if (labelResult.success) {
        console.log('✅ All required labels exist or were created');
      } else {
        console.log(`❌ Error with labels: ${labelResult.error}`);
      }
    }

  } catch (error) {
    console.error('❌ GitHub features test failed:', error.message);
  }
};

// Test bug report workflow
const testBugReportWorkflow = () => {
  console.log('\n📋 Bug Report Workflow Guide:\n');
  
  console.log('1. **User submits bug report:**');
  console.log('   POST /api/bug-reports');
  console.log('   - User fills out bug report form');
  console.log('   - System validates input');
  console.log('   - Bug report saved to database\n');
  
  console.log('2. **GitHub issue creation:**');
  console.log('   - System generates GitHub issue body');
  console.log('   - Creates issue with appropriate labels');
  console.log('   - Links bug report to GitHub issue\n');
  
  console.log('3. **Admin notification:**');
  console.log('   - Admins receive in-app notification');
  console.log('   - Message sent via communication system');
  console.log('   - Email notification (if configured)\n');
  
  console.log('4. **User confirmation:**');
  console.log('   - User receives confirmation message');
  console.log('   - Bug report ID and GitHub link provided');
  console.log('   - Status tracking available\n');
  
  console.log('5. **Admin workflow:**');
  console.log('   - Admin views bug in dashboard');
  console.log('   - Can assign to team member');
  console.log('   - Update status (triaged → in_progress → resolved)');
  console.log('   - User notified of status changes\n');
  
  console.log('6. **GitHub sync:**');
  console.log('   - Status updates sync to GitHub');
  console.log('   - Resolution comments added');
  console.log('   - Issue closed when resolved\n');
};

// Export test functions
module.exports = {
  testBugReporting,
  testGitHubFeatures,
  testBugReportWorkflow
};

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Bug Reporting System Tests...\n');
  
  testBugReportWorkflow();
  testGitHubFeatures();
  
  // Uncomment to run full database tests (requires MongoDB connection)
  // testBugReporting().then(() => {
  //   console.log('\n✨ All tests completed!');
  //   process.exit(0);
  // }).catch(error => {
  //   console.error('Test suite failed:', error);
  //   process.exit(1);
  // });
}
