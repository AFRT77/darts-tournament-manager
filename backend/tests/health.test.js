const request = require('supertest');
const app = require('../src/app');

describe('API v1 health', () => {
  it('returns ok status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.version).toBe('v1');
  });
});
