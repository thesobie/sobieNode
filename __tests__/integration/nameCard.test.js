const request = require('supertest');
const app = require('../../src/app');
const { connectDatabase, closeDatabase, clearDatabase } = require('../helpers/database');
const { createTestUser, createTestConference, createTestRegistration } = require('../helpers/testData');

describe('Name Card API', () => {
  let adminToken;
  let userToken;
  let testConference;
  let testRegistration;
  let testUser;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create test admin and user
    const adminUser = await createTestUser({
      email: 'admin@test.com',
      role: 'admin',
      name: { first: 'Admin', last: 'User' }
    });

    testUser = await createTestUser({
      email: 'attendee@test.com',
      role: 'user',
      name: { first: 'John', last: 'Doe' },
      profile: {
        preferredName: 'Johnny',
        affiliation: 'University of Test',
        university: 'University of Test',
        affiliationType: 'student'
      }
    });

    // Create test conference
    testConference = await createTestConference({
      title: 'Test SOBIE Conference 2024',
      year: 2024,
      status: 'active'
    });

    // Create test registration
    testRegistration = await createTestRegistration({
      userId: testUser._id,
      conferenceId: testConference._id,
      status: 'confirmed',
      attendeeType: 'student'
    });

    // Get auth tokens
    const adminAuth = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminAuth.body.token;

    const userAuth = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'attendee@test.com',
        password: 'password123'
      });
    userToken = userAuth.body.token;
  });

  describe('GET /api/admin/name-cards/generate', () => {
    it('should generate name cards for all confirmed attendees', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('sobie-name-cards');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require valid conference ID', async () => {
      await request(app)
        .get('/api/admin/name-cards/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle invalid conference ID', async () => {
      await request(app)
        .get('/api/admin/name-cards/generate?conferenceId=invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should accept format and includeLogos parameters', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}&format=pdf&includeLogos=false`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('GET /api/admin/name-cards/attendee/:registrationId', () => {
    it('should generate name card for specific attendee', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/attendee/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('name-card-John-Doe');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get(`/api/admin/name-cards/attendee/${testRegistration._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle invalid registration ID', async () => {
      await request(app)
        .get('/api/admin/name-cards/attendee/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle non-existent registration', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/admin/name-cards/attendee/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/admin/name-cards/preview/:registrationId', () => {
    it('should return name card preview data', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nameCard).toBeDefined();
      expect(response.body.data.attendeeHistory).toBeDefined();

      const nameCard = response.body.data.nameCard;
      expect(nameCard.preferredName).toBe('Johnny');
      expect(nameCard.fullName).toBe('John Doe');
      expect(nameCard.affiliation).toBe('University of Test');
      expect(nameCard.attendeeType).toBe('student');
      expect(nameCard.isFirstTime).toBe(true);
      expect(nameCard.sobieCount).toBe(1);
      expect(nameCard.conferenceYear).toBe(2024);

      const history = response.body.data.attendeeHistory;
      expect(history.totalSOBIEsAttended).toBe(1);
      expect(history.isFirstTime).toBe(true);
      expect(Array.isArray(history.previousConferences)).toBe(true);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle invalid registration ID', async () => {
      await request(app)
        .get('/api/admin/name-cards/preview/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/admin/name-cards/attendees/:conferenceId', () => {
    it('should return list of attendees with name card data', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendees).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.attendees)).toBe(true);
      expect(response.body.data.attendees.length).toBe(1);

      const attendee = response.body.data.attendees[0];
      expect(attendee.registrationId).toBe(testRegistration._id.toString());
      expect(attendee.nameCard).toBeDefined();
      expect(attendee.selected).toBe(false);

      const pagination = response.body.data.pagination;
      expect(pagination.current).toBe(1);
      expect(pagination.total).toBe(1);
      expect(pagination.hasNext).toBe(false);
      expect(pagination.hasPrev).toBe(false);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.pagination.current).toBe(1);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}?search=John`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.attendees.length).toBe(1);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle invalid conference ID', async () => {
      await request(app)
        .get('/api/admin/name-cards/attendees/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}?page=0`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      await request(app)
        .get(`/api/admin/name-cards/attendees/${testConference._id}?limit=101`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Attendee Type Detection', () => {
    it('should correctly identify student attendees', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.nameCard.attendeeType).toBe('student');
    });

    it('should handle academic attendees', async () => {
      // Update user profile to academic
      testUser.profile.affiliationType = 'academic';
      testUser.profile.affiliation = 'Harvard Medical School';
      await testUser.save();

      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.nameCard.attendeeType).toBe('academic');
    });

    it('should handle SOBIE affiliates', async () => {
      // Update user profile to SOBIE affiliate
      testUser.profile.affiliationType = 'sobie_affiliate';
      testUser.profile.affiliation = 'SOBIE Organization';
      await testUser.save();

      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.nameCard.attendeeType).toBe('sobie_affiliate');
    });
  });

  describe('Conference History Tracking', () => {
    it('should detect first-time attendees', async () => {
      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.nameCard.isFirstTime).toBe(true);
      expect(response.body.data.nameCard.sobieCount).toBe(1);
      expect(response.body.data.attendeeHistory.isFirstTime).toBe(true);
      expect(response.body.data.attendeeHistory.totalSOBIEsAttended).toBe(1);
    });

    it('should track repeat attendees', async () => {
      // Create additional past conference and registration
      const pastConference = await createTestConference({
        title: 'Test SOBIE Conference 2023',
        year: 2023,
        status: 'completed'
      });

      await createTestRegistration({
        userId: testUser._id,
        conferenceId: pastConference._id,
        status: 'confirmed',
        attendeeType: 'student'
      });

      const response = await request(app)
        .get(`/api/admin/name-cards/preview/${testRegistration._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.nameCard.isFirstTime).toBe(false);
      expect(response.body.data.nameCard.sobieCount).toBe(2);
      expect(response.body.data.attendeeHistory.isFirstTime).toBe(false);
      expect(response.body.data.attendeeHistory.totalSOBIEsAttended).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}`)
        .expect(401);
    });

    it('should handle invalid JWT token', async () => {
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle non-existent conference for generation', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle conference with no confirmed registrations', async () => {
      // Update registration status to pending
      testRegistration.status = 'pending';
      await testRegistration.save();

      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Data Validation', () => {
    it('should validate conference ID format in query parameters', async () => {
      await request(app)
        .get('/api/admin/name-cards/generate?conferenceId=not-a-valid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should validate registration ID format in path parameters', async () => {
      await request(app)
        .get('/api/admin/name-cards/attendee/not-a-valid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should validate format parameter', async () => {
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}&format=invalid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should validate includeLogos parameter', async () => {
      await request(app)
        .get(`/api/admin/name-cards/generate?conferenceId=${testConference._id}&includeLogos=invalid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
