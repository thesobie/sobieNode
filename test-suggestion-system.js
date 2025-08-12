#!/usr/bin/env node

/**
 * Comprehensive Test Script for User Suggestion System
 * This demonstrates the new suggestion/edit functionality for SOBIE users
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'barrycumbie@gmail.com';
const TEST_PASSWORD = 'CatCat1!';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in as Barry Cumbie...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful!');
      return true;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testSuggestionSystem() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 TESTING USER SUGGESTION SYSTEM\n');
  console.log('=' .repeat(80));

  // Test 1: Get form options
  try {
    console.log('\n1. Getting Form Options...');
    const response = await axios.get(`${BASE_URL}/suggestions/form-options`, { headers });
    
    if (response.data.success) {
      console.log('✅ Form Options Retrieved!');
      console.log(`   📊 Suggestion Types: ${response.data.data.suggestionTypes.length}`);
      console.log(`   📊 Target Types: ${response.data.data.targetTypes.length}`);
      console.log(`   📊 Priorities: ${response.data.data.priorities.length}`);
      console.log(`   📊 Categories: ${response.data.data.categories.length}`);
      
      console.log('\n   Available Suggestion Types:');
      response.data.data.suggestionTypes.forEach(type => {
        console.log(`      • ${type.label}: ${type.description}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Submit a missing presentation suggestion
  let suggestionId = null;
  try {
    console.log('\n2. Submitting Missing Presentation Suggestion...');
    const suggestionData = {
      suggestionType: 'missing_presentation',
      targetType: 'general',
      title: 'Missing Presentation: Data Analytics in Small Business',
      description: 'I presented a paper on "Data Analytics Applications in Small Business Decision Making" at SOBIE 2020, but I don\'t see it in the database. It was presented in the Analytics track.',
      suggestedChanges: {
        presentationInfo: {
          title: 'Data Analytics Applications in Small Business Decision Making',
          authors: ['Barry Cumbie', 'Dr. Sarah Johnson'],
          year: 2020,
          conference: 'SOBIE 2020',
          session: 'Analytics Track - Session 2',
          abstract: 'This research examines how small businesses can leverage data analytics tools to improve decision-making processes and operational efficiency.',
          discipline: 'analytics',
          methodology: 'mixed_methods'
        },
        evidence: {
          sourceDocuments: ['Conference program 2020', 'Personal presentation slides'],
          additionalNotes: 'I have the original slides and can provide them as evidence.'
        }
      },
      priority: 'medium',
      category: 'missing_content',
      contactPreference: 'email',
      allowPublicContact: false,
      tags: ['2020', 'analytics', 'small-business', 'data-science']
    };

    const response = await axios.post(`${BASE_URL}/suggestions`, suggestionData, { headers });
    
    if (response.data.success) {
      suggestionId = response.data.data.suggestion._id;
      console.log('✅ Missing Presentation Suggestion Submitted!');
      console.log(`   📋 Suggestion ID: ${suggestionId}`);
      console.log(`   📧 Estimated Review Time: ${response.data.data.estimatedReviewTime}`);
      console.log(`   📊 Status: ${response.data.data.suggestion.status}`);
      console.log(`   🏷️  Priority: ${response.data.data.suggestion.priority}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Submit an incorrect information suggestion
  try {
    console.log('\n3. Submitting Incorrect Information Suggestion...');
    const correctionData = {
      suggestionType: 'incorrect_info',
      targetType: 'presentation',
      title: 'Incorrect Author Affiliation',
      description: 'My affiliation is listed incorrectly for my 2025 presentation. It should be "SOBIE Development Team" not "University of North Alabama".',
      suggestedChanges: {
        currentValue: 'University of North Alabama',
        suggestedValue: 'SOBIE Development Team',
        fieldName: 'author.affiliation.organization',
        evidence: {
          additionalNotes: 'I moved to the SOBIE Development Team in 2024.'
        }
      },
      priority: 'high',
      category: 'data_quality',
      contactPreference: 'email'
    };

    const response = await axios.post(`${BASE_URL}/suggestions`, correctionData, { headers });
    
    if (response.data.success) {
      console.log('✅ Incorrect Information Suggestion Submitted!');
      console.log(`   📋 Type: ${response.data.data.suggestion.suggestionType}`);
      console.log(`   📊 Status: ${response.data.data.suggestion.status}`);
      console.log(`   🏷️  Priority: ${response.data.data.suggestion.priority}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Submit a service record suggestion
  try {
    console.log('\n4. Submitting Service Record Suggestion...');
    const serviceData = {
      suggestionType: 'service_record',
      targetType: 'user',
      title: 'Missing Reviewer Service Record',
      description: 'I served as a paper reviewer for SOBIE 2019 and 2021, but this service is not reflected in my profile.',
      suggestedChanges: {
        serviceInfo: {
          year: 2019,
          role: 'Paper Reviewer',
          description: 'Reviewed 5 papers for the Analytics and Information Systems tracks',
          conference: 'SOBIE 2019'
        },
        evidence: {
          contactInfo: 'Can provide reviewer assignment emails from conference organizers',
          additionalNotes: 'Also reviewed for 2021 conference'
        }
      },
      priority: 'low',
      category: 'missing_content',
      contactPreference: 'email'
    };

    const response = await axios.post(`${BASE_URL}/suggestions`, serviceData, { headers });
    
    if (response.data.success) {
      console.log('✅ Service Record Suggestion Submitted!');
      console.log(`   📋 Type: ${response.data.data.suggestion.suggestionType}`);
      console.log(`   📊 Status: ${response.data.data.suggestion.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 5: Get user's suggestions
  try {
    console.log('\n5. Retrieving My Suggestions...');
    const response = await axios.get(`${BASE_URL}/suggestions/me`, { headers });
    
    if (response.data.success) {
      const suggestions = response.data.data.suggestions;
      console.log(`✅ My Suggestions Retrieved!`);
      console.log(`   📊 Total Suggestions: ${suggestions.length}`);
      
      suggestions.forEach((suggestion, index) => {
        console.log(`\n   ${index + 1}. "${suggestion.title}"`);
        console.log(`      Type: ${suggestion.suggestionType}`);
        console.log(`      Status: ${suggestion.statusDisplay}`);
        console.log(`      Priority: ${suggestion.priorityDisplay}`);
        console.log(`      Submitted: ${new Date(suggestion.createdAt).toLocaleDateString()}`);
        console.log(`      Days Since: ${suggestion.daysSinceSubmission}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 6: Update a suggestion (if we have one)
  if (suggestionId) {
    try {
      console.log('\n6. Updating Suggestion...');
      const updateData = {
        description: 'Updated: I presented a paper on "Data Analytics Applications in Small Business Decision Making" at SOBIE 2020. This was in the Analytics track, Session 2. I have the original slides and program listing as proof.',
        tags: ['2020', 'analytics', 'small-business', 'data-science', 'decision-making'],
        priority: 'high'
      };

      const response = await axios.put(`${BASE_URL}/suggestions/${suggestionId}`, updateData, { headers });
      
      if (response.data.success) {
        console.log('✅ Suggestion Updated Successfully!');
        console.log(`   📋 ID: ${suggestionId}`);
        console.log(`   🏷️  New Priority: ${response.data.data.priority}`);
        console.log(`   📝 Updated Tags: ${response.data.data.tags.join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }

    // Test 7: Get specific suggestion details
    try {
      console.log('\n7. Getting Suggestion Details...');
      const response = await axios.get(`${BASE_URL}/suggestions/${suggestionId}`, { headers });
      
      if (response.data.success) {
        const suggestion = response.data.data;
        console.log('✅ Suggestion Details Retrieved!');
        console.log(`   📋 Title: ${suggestion.title}`);
        console.log(`   📊 Status: ${suggestion.statusDisplay}`);
        console.log(`   🏷️  Priority: ${suggestion.priorityDisplay}`);
        console.log(`   📅 Submitted: ${new Date(suggestion.createdAt).toLocaleDateString()}`);
        console.log(`   👤 Submitter: ${suggestion.submitterFullName}`);
        console.log(`   📧 Contact: ${suggestion.contactPreference}`);
        console.log(`   🏷️  Tags: ${suggestion.tags.join(', ')}`);
        
        if (suggestion.suggestedChanges?.presentationInfo) {
          console.log('\n   📄 Suggested Presentation:');
          const info = suggestion.suggestedChanges.presentationInfo;
          console.log(`      Title: ${info.title}`);
          console.log(`      Authors: ${info.authors.join(', ')}`);
          console.log(`      Year: ${info.year}`);
          console.log(`      Discipline: ${info.discipline}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ USER SUGGESTION SYSTEM TEST COMPLETE!');
  console.log('\n🎯 Features Demonstrated:');
  console.log('   📝 Submit Missing Presentation Suggestions');
  console.log('   ✏️  Submit Information Correction Suggestions');
  console.log('   👔 Submit Service Record Suggestions');
  console.log('   📋 View All Personal Suggestions');
  console.log('   ✏️  Update Pending Suggestions');
  console.log('   🔍 View Detailed Suggestion Information');
  console.log('\n🔗 Available Suggestion Types:');
  console.log('   • Missing Research Presentations');
  console.log('   • Missing Authors');
  console.log('   • Incorrect Information');
  console.log('   • Missing Conference Years');
  console.log('   • Missing Sessions');
  console.log('   • Author Affiliations');
  console.log('   • Presentation Details');
  console.log('   • Service Records');
  console.log('   • Awards/Recognition');
  console.log('   • Other Suggestions');
  console.log('\n📊 Admin Features Available:');
  console.log('   • Admin Dashboard (/api/admin/suggestions)');
  console.log('   • Review & Approve/Reject Suggestions');
  console.log('   • Mark Suggestions as Implemented');
  console.log('   • Email Notifications to Users');
  console.log('   • Suggestion Statistics & Analytics');
}

async function runSuggestionTests() {
  console.log('🎉 SOBIE USER SUGGESTION SYSTEM TEST SUITE\n');
  console.log('This tests the new user suggestion/edit functionality!\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  
  if (loginSuccess) {
    // Step 2: Test suggestion system
    await testSuggestionSystem();
  } else {
    console.log('\n❌ Cannot test suggestion system without authentication');
    console.log('   Please check login credentials or reset password');
  }
  
  console.log('\n✅ Testing Complete!');
}

// Run the tests
runSuggestionTests().catch(console.error);
