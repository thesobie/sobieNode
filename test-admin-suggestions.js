#!/usr/bin/env node

/**
 * Admin Test Script for User Suggestion Review System
 * This demonstrates the admin workflow for reviewing and managing user suggestions
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'barrycumbie@gmail.com'; // Assuming Barry has admin role
const ADMIN_PASSWORD = 'CatCat1!';

let authToken = null;

async function adminLogin() {
  try {
    console.log('🔐 Logging in as Admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Admin login successful!');
      return true;
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testAdminSuggestionDashboard() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 TESTING ADMIN SUGGESTION DASHBOARD\n');
  console.log('=' .repeat(80));

  // Test 1: Get admin dashboard with all suggestions
  let suggestions = [];
  try {
    console.log('\n1. Getting Admin Dashboard...');
    const response = await axios.get(`${BASE_URL}/admin/suggestions`, { headers });
    
    if (response.data.success) {
      suggestions = response.data.data.suggestions;
      const stats = response.data.data.statistics;
      
      console.log('✅ Admin Dashboard Loaded!');
      console.log(`\n📊 SUGGESTION STATISTICS:`);
      console.log(`   Total Suggestions: ${stats.total}`);
      console.log(`   Pending Review: ${stats.pending} (${((stats.pending/stats.total)*100).toFixed(1)}%)`);
      console.log(`   In Review: ${stats.inReview}`);
      console.log(`   Approved: ${stats.approved}`);
      console.log(`   Rejected: ${stats.rejected}`);
      console.log(`   Implemented: ${stats.implemented}`);
      
      console.log(`\n📈 PRIORITY BREAKDOWN:`);
      Object.entries(stats.byPriority).forEach(([priority, count]) => {
        console.log(`   ${priority}: ${count}`);
      });
      
      console.log(`\n📋 CATEGORY BREAKDOWN:`);
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });
      
      console.log(`\n🎯 TYPE BREAKDOWN:`);
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

      console.log(`\n📋 RECENT SUGGESTIONS:`);
      suggestions.slice(0, 5).forEach((suggestion, index) => {
        console.log(`\n   ${index + 1}. "${suggestion.title}"`);
        console.log(`      ID: ${suggestion._id}`);
        console.log(`      Type: ${suggestion.suggestionType}`);
        console.log(`      Status: ${suggestion.statusDisplay}`);
        console.log(`      Priority: ${suggestion.priorityDisplay}`);
        console.log(`      Submitter: ${suggestion.submitterFullName}`);
        console.log(`      Days Old: ${suggestion.daysSinceSubmission}`);
        
        if (suggestion.suggestedChanges?.presentationInfo) {
          console.log(`      📄 Presentation: ${suggestion.suggestedChanges.presentationInfo.title}`);
        }
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get pending suggestions only
  try {
    console.log('\n2. Getting Pending Suggestions...');
    const response = await axios.get(`${BASE_URL}/admin/suggestions?status=pending`, { headers });
    
    if (response.data.success) {
      const pending = response.data.data.suggestions;
      console.log(`✅ Pending Suggestions Retrieved!`);
      console.log(`   📋 Pending Count: ${pending.length}`);
      
      if (pending.length > 0) {
        console.log(`\n   🚨 URGENT PENDING SUGGESTIONS:`);
        const urgent = pending.filter(s => s.priority === 'urgent');
        urgent.forEach(suggestion => {
          console.log(`      • ${suggestion.title} (${suggestion.daysSinceSubmission} days old)`);
        });
        
        console.log(`\n   ⚡ HIGH PRIORITY PENDING:`);
        const high = pending.filter(s => s.priority === 'high');
        high.forEach(suggestion => {
          console.log(`      • ${suggestion.title} (${suggestion.daysSinceSubmission} days old)`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Review a suggestion (approve first pending suggestion)
  if (suggestions.length > 0) {
    const pendingSuggestion = suggestions.find(s => s.status === 'pending');
    
    if (pendingSuggestion) {
      try {
        console.log('\n3. Reviewing Suggestion (Approve)...');
        const reviewData = {
          action: 'approve',
          adminComments: 'Great suggestion! This presentation was indeed missing from our database. Approving for implementation.',
          notifyUser: true,
          estimatedImplementationTime: '3-5 business days'
        };

        const response = await axios.put(
          `${BASE_URL}/admin/suggestions/${pendingSuggestion._id}/review`, 
          reviewData, 
          { headers }
        );
        
        if (response.data.success) {
          console.log('✅ Suggestion Approved!');
          console.log(`   📋 Suggestion: "${pendingSuggestion.title}"`);
          console.log(`   📊 New Status: ${response.data.data.status}`);
          console.log(`   👤 Reviewed By: ${response.data.data.reviewedBy.fullName}`);
          console.log(`   📧 User Notified: ${reviewData.notifyUser ? 'Yes' : 'No'}`);
          console.log(`   ⏰ Est. Implementation: ${reviewData.estimatedImplementationTime}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      }

      // Test 4: Mark suggestion as implemented
      try {
        console.log('\n4. Marking Suggestion as Implemented...');
        const implementData = {
          implementationNotes: 'Successfully added the missing presentation to the database. Added "Data Analytics Applications in Small Business Decision Making" by Barry Cumbie and Dr. Sarah Johnson to SOBIE 2020 records.',
          implementedChanges: [
            'Added new research presentation to database',
            'Updated user presentation count',
            'Added authors to presentation record',
            'Updated analytics discipline count'
          ],
          notifyUser: true
        };

        const response = await axios.put(
          `${BASE_URL}/admin/suggestions/${pendingSuggestion._id}/implement`, 
          implementData, 
          { headers }
        );
        
        if (response.data.success) {
          console.log('✅ Suggestion Marked as Implemented!');
          console.log(`   📋 Suggestion: "${pendingSuggestion.title}"`);
          console.log(`   📊 Final Status: ${response.data.data.status}`);
          console.log(`   👤 Implemented By: ${response.data.data.implementedBy.fullName}`);
          console.log(`   📅 Implementation Date: ${new Date(response.data.data.implementedAt).toLocaleDateString()}`);
          console.log(`   📧 User Notified: ${implementData.notifyUser ? 'Yes' : 'No'}`);
          
          console.log(`\n   ✅ CHANGES IMPLEMENTED:`);
          implementData.implementedChanges.forEach(change => {
            console.log(`      • ${change}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      }
    }

    // Test 5: Reject a suggestion (if we have another pending one)
    const anotherPending = suggestions.find(s => s.status === 'pending' && s._id !== pendingSuggestion?._id);
    
    if (anotherPending) {
      try {
        console.log('\n5. Reviewing Suggestion (Reject)...');
        const rejectData = {
          action: 'reject',
          adminComments: 'Thank you for the suggestion, but we were unable to verify this information. The conference records for 2019 do not show this reviewer assignment. Please provide additional documentation if you believe this is an error.',
          notifyUser: true,
          rejectReason: 'insufficient_evidence'
        };

        const response = await axios.put(
          `${BASE_URL}/admin/suggestions/${anotherPending._id}/review`, 
          rejectData, 
          { headers }
        );
        
        if (response.data.success) {
          console.log('✅ Suggestion Rejected!');
          console.log(`   📋 Suggestion: "${anotherPending.title}"`);
          console.log(`   📊 Status: ${response.data.data.status}`);
          console.log(`   ❌ Reason: ${rejectData.rejectReason}`);
          console.log(`   👤 Reviewed By: ${response.data.data.reviewedBy.fullName}`);
          console.log(`   📧 User Notified: ${rejectData.notifyUser ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  // Test 6: Get high priority suggestions
  try {
    console.log('\n6. Getting High Priority Suggestions...');
    const response = await axios.get(`${BASE_URL}/admin/suggestions?priority=high,urgent`, { headers });
    
    if (response.data.success) {
      const highPriority = response.data.data.suggestions;
      console.log(`✅ High Priority Suggestions Retrieved!`);
      console.log(`   📋 High/Urgent Count: ${highPriority.length}`);
      
      if (highPriority.length > 0) {
        console.log(`\n   🚨 NEEDS IMMEDIATE ATTENTION:`);
        highPriority.forEach(suggestion => {
          const urgency = suggestion.daysSinceSubmission > 7 ? '🔥' : suggestion.daysSinceSubmission > 3 ? '⚡' : '📋';
          console.log(`      ${urgency} ${suggestion.title}`);
          console.log(`         Priority: ${suggestion.priorityDisplay} | Days: ${suggestion.daysSinceSubmission} | Type: ${suggestion.suggestionType}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 7: Get suggestions by category
  try {
    console.log('\n7. Getting Data Quality Suggestions...');
    const response = await axios.get(`${BASE_URL}/admin/suggestions?category=data_quality`, { headers });
    
    if (response.data.success) {
      const dataQuality = response.data.data.suggestions;
      console.log(`✅ Data Quality Suggestions Retrieved!`);
      console.log(`   📋 Data Quality Count: ${dataQuality.length}`);
      
      if (dataQuality.length > 0) {
        console.log(`\n   🔍 DATA QUALITY ISSUES:`);
        dataQuality.forEach(suggestion => {
          console.log(`      • ${suggestion.title}`);
          console.log(`        Type: ${suggestion.suggestionType} | Status: ${suggestion.statusDisplay}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ ADMIN SUGGESTION DASHBOARD TEST COMPLETE!');
  console.log('\n🎯 Admin Features Demonstrated:');
  console.log('   📊 Dashboard with Statistics & Analytics');
  console.log('   📋 View All Suggestions with Filtering');
  console.log('   ✅ Approve Suggestions with Comments');
  console.log('   ❌ Reject Suggestions with Reasons');
  console.log('   🚀 Mark Suggestions as Implemented');
  console.log('   📧 Automatic Email Notifications to Users');
  console.log('   🔍 Filter by Status, Priority, Category, Type');
  console.log('   📈 Real-time Statistics and Reporting');
  console.log('\n🔗 Admin Workflow:');
  console.log('   1. Review suggestion details and evidence');
  console.log('   2. Approve or reject with admin comments');
  console.log('   3. For approved: implement changes in system');
  console.log('   4. Mark as implemented with implementation notes');
  console.log('   5. User receives automatic email notifications');
  console.log('\n📊 Available Filters:');
  console.log('   • Status: pending, in_review, approved, rejected, implemented');
  console.log('   • Priority: low, medium, high, urgent');
  console.log('   • Category: missing_content, data_quality, enhancement');
  console.log('   • Type: missing_presentation, incorrect_info, service_record, etc.');
}

async function runAdminTests() {
  console.log('👑 SOBIE ADMIN SUGGESTION DASHBOARD TEST SUITE\n');
  console.log('This tests the admin review and management workflow!\n');
  
  // Step 1: Admin login
  const loginSuccess = await adminLogin();
  
  if (loginSuccess) {
    // Step 2: Test admin dashboard
    await testAdminSuggestionDashboard();
  } else {
    console.log('\n❌ Cannot test admin dashboard without admin authentication');
    console.log('   Please ensure user has admin role permissions');
  }
  
  console.log('\n✅ Admin Testing Complete!');
}

// Run the admin tests
runAdminTests().catch(console.error);
