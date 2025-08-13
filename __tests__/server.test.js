const request = require('supertest');
const app = require('../src/server');

const request = require('supertest');
const app = require('../src/server');

describe('Server Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
  });
});

describe('API Root', () => {
  test('GET /api should return API information', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body.message).toBe('Welcome to the API');
    expect(response.body.version).toBe('1.0.0');
    expect(response.body.endpoints).toBeDefined();
  });
});

describe('404 Handler', () => {
  test('GET /nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});
