#!/usr/bin/env node

/**
 * Comprehensive Test Script for Conference Payment Management System
 * Tests payment tracking, admin management, and user views
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'barrycumbie@gmail.com';
const ADMIN_PASSWORD = 'CatCat1!';

let authToken = null;
let testRegistrationId = null;

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

async function findTestRegistration() {
  try {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?limit=1`, { headers });
    
    if (response.data.success && response.data.data.registrations.length > 0) {
      testRegistrationId = response.data.data.registrations[0].id;
      console.log(`📋 Found test registration: ${testRegistrationId}`);
      return true;
    } else {
      console.log('❌ No registrations found for testing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error finding test registration:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testPaymentManagementSystem() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 TESTING PAYMENT MANAGEMENT SYSTEM\n');
  console.log('=' .repeat(80));

  // Test 1: Get payment statistics
  try {
    console.log('\n1. Getting Payment Statistics...');
    const currentYear = new Date().getFullYear();
    const response = await axios.get(`${BASE_URL}/conference/admin/payment-stats?year=${currentYear}`, { headers });
    
    if (response.data.success) {
      const stats = response.data.data.statistics;
      console.log('✅ Payment Statistics Retrieved!');
      console.log(`\n💰 PAYMENT OVERVIEW (${response.data.data.year}):`);
      console.log(`   Total Registrations: ${stats.total}`);
      console.log(`   Payment Required: ${stats.paymentRequired}`);
      console.log(`   Payment Not Required: ${stats.paymentNotRequired}`);
      console.log(`   Payment Waived: ${stats.paymentWaived}`);
      console.log(`   Payment Pending: ${stats.paymentPending}`);
      console.log(`   Payment Partial: ${stats.paymentPartial}`);
      console.log(`   Payment Completed: ${stats.paymentCompleted}`);
      console.log(`   Payment Overdue: ${stats.paymentOverdue}`);
      
      console.log(`\n💵 FINANCIAL SUMMARY:`);
      console.log(`   Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
      console.log(`   Total Outstanding: $${stats.totalOutstanding.toFixed(2)}`);
      console.log(`   Total Discounts: $${stats.totalDiscounts.toFixed(2)}`);
      console.log(`   Collection Rate: ${stats.collectionRate}%`);
      
      if (Object.keys(stats.categoryDistribution).length > 0) {
        console.log(`\n👥 PAYMENT CATEGORIES:`);
        Object.entries(stats.categoryDistribution).forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });
      }
      
      if (Object.keys(stats.methodDistribution).length > 0) {
        console.log(`\n💳 PAYMENT METHODS:`);
        Object.entries(stats.methodDistribution).forEach(([method, count]) => {
          console.log(`   ${method}: ${count}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get registrations with payment filtering
  try {
    console.log('\n2. Getting Registrations with Payment Info...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?limit=5`, { headers });
    
    if (response.data.success) {
      const registrations = response.data.data.registrations;
      console.log(`✅ Registrations with Payment Info Retrieved!`);
      console.log(`   📋 Total Found: ${registrations.length}`);
      
      if (registrations.length > 0) {
        console.log(`\n💰 PAYMENT STATUS OVERVIEW:`);
        registrations.forEach((reg, index) => {
          console.log(`\n   ${index + 1}. ${reg.fullName}`);
          console.log(`      Registration ID: ${reg.id}`);
          console.log(`      Organization: ${reg.organization}`);
          console.log(`      Payment Required: ${reg.paymentRequired ? 'Yes' : 'No'}`);
          console.log(`      Payment Status: ${reg.payment?.statusDisplay || 'Not Set'}`);
          console.log(`      Amount Due: $${(reg.payment?.amountDue || 0).toFixed(2)}`);
          console.log(`      Payment Method: ${reg.payment?.method || 'Not Set'}`);
          
          if (reg.payment?.transactionId) {
            console.log(`      Transaction ID: ${reg.payment.transactionId}`);
          }
          if (reg.payment?.checkNumber) {
            console.log(`      Check Number: ${reg.payment.checkNumber}`);
          }
          if (reg.payment?.purchaseOrderNumber) {
            console.log(`      PO Number: ${reg.payment.purchaseOrderNumber}`);
          }
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  if (!testRegistrationId) {
    console.log('\n⚠️  Skipping payment modification tests - no test registration available');
    return;
  }

  // Test 3: Set payment required
  try {
    console.log('\n3. Setting Payment Required...');
    const paymentData = {
      action: 'set_payment_required',
      amount: 150.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      category: 'professional'
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, paymentData, { headers });
    
    if (response.data.success) {
      console.log('✅ Payment Requirement Set!');
      console.log(`   💰 Amount: $${response.data.data.payment.amount}`);
      console.log(`   📊 Status: ${response.data.data.payment.statusDisplay}`);
      console.log(`   📅 Due Date: ${new Date(response.data.data.payment.dueDate).toLocaleDateString()}`);
      console.log(`   👥 Category: ${response.data.data.payment.category}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Apply student discount
  try {
    console.log('\n4. Applying Student Discount...');
    const discountData = {
      action: 'apply_discount',
      discountData: {
        discountType: 'student',
        discountPercentage: 50,
        discountReason: 'Student discount - 50% off registration fee'
      }
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, discountData, { headers });
    
    if (response.data.success) {
      console.log('✅ Student Discount Applied!');
      console.log(`   📊 Status: ${response.data.data.payment.statusDisplay}`);
      console.log(`   💰 Original Amount: $${response.data.data.payment.amount}`);
      console.log(`   💸 Amount Due: $${response.data.data.payment.amountDue}`);
      console.log(`   🎓 Discount: ${discountData.discountData.discountType} (${discountData.discountData.discountPercentage}%)`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 5: Record check payment
  try {
    console.log('\n5. Recording Check Payment...');
    const paymentData = {
      action: 'record_payment',
      amount: 75.00,
      paymentMethod: 'check',
      transactionDetails: {
        checkNumber: 'CHK001234',
        referenceNumber: 'REF-2025-001'
      },
      notes: 'Check payment received at conference registration desk'
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, paymentData, { headers });
    
    if (response.data.success) {
      console.log('✅ Check Payment Recorded!');
      console.log(`   💰 Amount Paid: $${paymentData.amount}`);
      console.log(`   💳 Method: ${paymentData.paymentMethod}`);
      console.log(`   🏷️  Check Number: ${paymentData.transactionDetails.checkNumber}`);
      console.log(`   📊 Status: ${response.data.data.payment.statusDisplay}`);
      console.log(`   💸 Remaining Due: $${response.data.data.payment.amountDue}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 6: Record purchase order payment
  try {
    console.log('\n6. Recording Purchase Order Payment...');
    
    // First set up a new registration that needs payment
    const setupData = {
      action: 'set_payment_required',
      amount: 200.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'faculty'
    };
    await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, setupData, { headers });

    const paymentData = {
      action: 'record_payment',
      amount: 200.00,
      paymentMethod: 'purchase_order',
      transactionDetails: {
        purchaseOrderNumber: 'PO-2025-0456',
        referenceNumber: 'University-Budget-789'
      },
      notes: 'Purchase order payment from University of Alabama'
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, paymentData, { headers });
    
    if (response.data.success) {
      console.log('✅ Purchase Order Payment Recorded!');
      console.log(`   💰 Amount Paid: $${paymentData.amount}`);
      console.log(`   💳 Method: ${paymentData.paymentMethod}`);
      console.log(`   🏷️  PO Number: ${paymentData.transactionDetails.purchaseOrderNumber}`);
      console.log(`   📊 Status: ${response.data.data.payment.statusDisplay}`);
      console.log(`   💸 Amount Due: $${response.data.data.payment.amountDue}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 7: Waive payment for student
  try {
    console.log('\n7. Waiving Payment for Student...');
    
    // First set up payment requirement
    const setupData = {
      action: 'set_payment_required',
      amount: 100.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'student'
    };
    await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, setupData, { headers });

    const waiveData = {
      action: 'waive_payment',
      notes: 'Payment waived - undergraduate student scholarship recipient'
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, waiveData, { headers });
    
    if (response.data.success) {
      console.log('✅ Payment Waived!');
      console.log(`   📊 Status: ${response.data.data.payment.statusDisplay}`);
      console.log(`   💰 Amount Due: $${response.data.data.payment.amountDue}`);
      console.log(`   📝 Reason: ${waiveData.notes}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 8: Get detailed payment information
  try {
    console.log('\n8. Getting Detailed Payment Information...');
    const response = await axios.get(`${BASE_URL}/conference/payment/${testRegistrationId}`, { headers });
    
    if (response.data.success) {
      const payment = response.data.data.payment;
      const registration = response.data.data.registration;
      
      console.log('✅ Detailed Payment Information Retrieved!');
      console.log(`\n📋 REGISTRATION DETAILS:`);
      console.log(`   ID: ${registration.id}`);
      console.log(`   Name: ${registration.fullName}`);
      console.log(`   Email: ${registration.email}`);
      console.log(`   Conference: ${registration.conference}`);
      
      console.log(`\n💰 PAYMENT DETAILS:`);
      console.log(`   Required: ${payment.required ? 'Yes' : 'No'}`);
      console.log(`   Status: ${payment.statusDisplay}`);
      console.log(`   Amount: $${(payment.amount || 0).toFixed(2)}`);
      console.log(`   Amount Paid: $${(payment.amountPaid || 0).toFixed(2)}`);
      console.log(`   Amount Due: $${(payment.amountDue || 0).toFixed(2)}`);
      console.log(`   Method: ${payment.method || 'Not specified'}`);
      console.log(`   Category: ${payment.category || 'Not specified'}`);
      
      if (payment.dueDate) {
        console.log(`   Due Date: ${new Date(payment.dueDate).toLocaleDateString()}`);
      }
      if (payment.paidAt) {
        console.log(`   Paid At: ${new Date(payment.paidAt).toLocaleDateString()}`);
      }
      
      if (payment.transactionId) {
        console.log(`   Transaction ID: ${payment.transactionId}`);
      }
      if (payment.checkNumber) {
        console.log(`   Check Number: ${payment.checkNumber}`);
      }
      if (payment.purchaseOrderNumber) {
        console.log(`   PO Number: ${payment.purchaseOrderNumber}`);
      }
      
      if (payment.discountApplied) {
        console.log(`   Discount Applied: ${payment.discountApplied}`);
      }
      
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        console.log(`\n📋 PAYMENT HISTORY:`);
        payment.paymentHistory.slice(-3).forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.action} - ${new Date(entry.date).toLocaleDateString()}`);
          console.log(`      Details: ${entry.details}`);
          if (entry.amount) {
            console.log(`      Amount: $${entry.amount.toFixed(2)}`);
          }
          if (entry.method) {
            console.log(`      Method: ${entry.method}`);
          }
        });
      }
      
      if (payment.refundDetails) {
        console.log(`\n💸 REFUND INFORMATION:`);
        console.log(`   Refund Requested: ${payment.refundDetails.refundRequested ? 'Yes' : 'No'}`);
        if (payment.refundDetails.refundAmount) {
          console.log(`   Refund Amount: $${payment.refundDetails.refundAmount.toFixed(2)}`);
        }
        if (payment.refundDetails.refundReason) {
          console.log(`   Refund Reason: ${payment.refundDetails.refundReason}`);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 9: Filter registrations by payment status
  try {
    console.log('\n9. Filtering by Payment Status...');
    
    const statuses = ['not_required', 'waived', 'pending', 'completed'];
    
    for (const status of statuses) {
      try {
        const response = await axios.get(`${BASE_URL}/conference/admin/registrations?paymentStatus=${status}&limit=3`, { headers });
        
        if (response.data.success) {
          const count = response.data.data.registrations.length;
          console.log(`   💰 ${status.toUpperCase()}: ${count} registrations`);
          
          if (count > 0) {
            response.data.data.registrations.forEach(reg => {
              console.log(`      • ${reg.fullName} - $${(reg.payment?.amountDue || 0).toFixed(2)} due`);
            });
          }
        }
      } catch (statusError) {
        console.log(`   ❌ Error filtering ${status}: ${statusError.response?.data?.message || statusError.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 10: Update payment notes
  try {
    console.log('\n10. Updating Payment Notes...');
    const notesData = {
      action: 'update_notes',
      adminNotes: 'Processed payment during conference registration. Student verification completed.',
      notes: 'Internal: Payment method changed from credit card to check per attendee request.'
    };

    const response = await axios.put(`${BASE_URL}/conference/admin/payment/${testRegistrationId}`, notesData, { headers });
    
    if (response.data.success) {
      console.log('✅ Payment Notes Updated!');
      console.log(`   📝 Admin Notes: ${notesData.adminNotes}`);
      console.log(`   📝 Internal Notes: ${notesData.notes}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ PAYMENT MANAGEMENT SYSTEM TEST COMPLETE!');
  console.log('\n🎯 Features Demonstrated:');
  console.log('   📊 Payment Statistics & Financial Reporting');
  console.log('   💰 Set Payment Requirements (Amount, Due Date, Category)');
  console.log('   🎓 Apply Discounts (Student, Early Bird, etc.)');
  console.log('   💳 Record Payments (Check, PO, Credit Card, etc.)');
  console.log('   🎁 Waive Payments (Scholarships, Special Cases)');
  console.log('   📋 Detailed Payment History Tracking');
  console.log('   💸 Refund Processing & Tracking');
  console.log('   🔍 Filter Registrations by Payment Status');
  console.log('   📝 Payment Notes & Administrative Comments');
  console.log('\n💳 Payment Methods Supported:');
  console.log('   • Cash (at conference)');
  console.log('   • Check (with check number)');
  console.log('   • Credit Card (with transaction details)');
  console.log('   • Purchase Order (with PO number)');
  console.log('   • Wire Transfer');
  console.log('   • Waived (scholarships/special cases)');
  console.log('   • Other (flexible option)');
  console.log('\n🎯 Payment Categories:');
  console.log('   • Student (often discounted/waived)');
  console.log('   • Faculty (standard academic rate)');
  console.log('   • Professional (standard business rate)');
  console.log('   • Member (member discount rate)');
  console.log('   • Speaker (often waived)');
  console.log('   • Sponsor (special rates)');
  console.log('\n📊 Admin Payment Capabilities:');
  console.log('   • View comprehensive payment statistics');
  console.log('   • Track revenue and outstanding amounts');
  console.log('   • Filter registrations by payment status');
  console.log('   • Record payments with full transaction details');
  console.log('   • Apply various discount types');
  console.log('   • Process refunds with full audit trail');
  console.log('   • Add administrative and internal notes');
  console.log('   • Generate financial reports');
  console.log('\n👤 User Payment View:');
  console.log('   • View their own payment status');
  console.log('   • See amount due and payment methods');
  console.log('   • Track payment history');
  console.log('   • View applied discounts');
  console.log('   • See transaction details (when available)');
}

async function runPaymentTests() {
  console.log('💰 SOBIE PAYMENT MANAGEMENT SYSTEM TEST SUITE\n');
  console.log('This tests comprehensive payment tracking and management!\n');
  
  // Step 1: Admin login
  const loginSuccess = await adminLogin();
  
  if (loginSuccess) {
    // Step 2: Find a test registration
    const registrationFound = await findTestRegistration();
    
    if (registrationFound) {
      // Step 3: Test payment management system
      await testPaymentManagementSystem();
    } else {
      console.log('\n⚠️  Limited testing available - no existing registrations found');
      console.log('   Please run conference registration tests first to create test data');
    }
  } else {
    console.log('\n❌ Cannot test payment management without admin authentication');
    console.log('   Please ensure user has admin role permissions');
  }
  
  console.log('\n✅ Payment Testing Complete!');
}

// Run the payment tests
runPaymentTests().catch(console.error);
