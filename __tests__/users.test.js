const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');

describe('User Routes', () => {
  let testUserId;

  test('GET /api/users should return all users', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);
    
    // Store the first user ID for later tests
    if (response.body.data.length > 0) {
      testUserId = response.body.data[0]._id;
    }
  }, 15000);

  test('GET /api/users/:id should return a specific user', async () => {
    // Skip if no test user ID available
    if (!testUserId) {
      const users = await User.find().limit(1);
      testUserId = users[0]._id.toString();
    }

    const response = await request(app)
      .get(`/api/users/${testUserId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(testUserId);
  }, 15000);

  test('GET /api/users/invalid-id should return 400', async () => {
    const response = await request(app)
      .get('/api/users/invalid-id')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBeDefined();
  }, 15000);

  test('POST /api/users should create a new user', async () => {
    const newUser = {
      email: 'newtest@example.com',
      password: 'CatCat123!',
      name: {
        firstName: 'Test',
        lastName: 'User'
      },
      userType: 'academic',
      affiliation: {
        organization: 'Test University',
        department: 'Computer Science'
      }
    };

    const response = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name.firstName).toBe(newUser.name.firstName);
    expect(response.body.data.name.lastName).toBe(newUser.name.lastName);
    expect(response.body.data.email).toBe(newUser.email);
    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.affiliation.organization).toBe(newUser.affiliation.organization);
    
    // Clean up - delete the test user
    await User.findByIdAndDelete(response.body.data._id);
  }, 15000);
});
