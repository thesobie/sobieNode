const axios = require('axios');

// Configuration for API base URL
const API_BASE_URL = 'http://localhost:3000/api';

console.log('🧪 API Registration & Login Test\n');

async function testApiRegisterAndLogin() {
  try {
    const testEmail = 'register-test@test.com';
    const testPassword = 'TestPassword123!';

    console.log('📝 Step 1: Register new user via API...');
    
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        name: {
          firstName: 'Register',
          lastName: 'Test'
        },
        userType: 'academic',
        affiliation: {
          organization: 'Test University',
          department: 'Testing'
        }
      });

      console.log('✅ Registration successful:', registerResponse.data.success);
      console.log('👤 User ID:', registerResponse.data.data?.user?.id);

    } catch (registerError) {
      if (registerError.response?.status === 409) {
        console.log('ℹ️ User already exists, proceeding to login...');
      } else {
        console.log('❌ Registration failed:', registerError.response?.data);
        throw registerError;
      }
    }

    console.log('\n🔑 Step 2: Login via API...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    console.log('✅ Login successful!');
    console.log('🎯 Full login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('🔑 Token found:', !!token);
    
    if (!token) {
      console.log('❌ No token found in response!');
      return;
    }

    console.log('\n🔒 Step 3: Test authenticated request...');
    const profileResponse = await axios.get(`${API_BASE_URL}/profiles/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Authenticated request successful!');
    console.log('📧 User email:', profileResponse.data.data.email);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testApiRegisterAndLogin();
