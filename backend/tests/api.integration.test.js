const request = require('supertest');
const app = require('../src/app');

describe('API integration', () => {
  it('returns API info', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe('v1');
    expect(response.body.data.docs).toBe('/docs');
  });

  it('returns v1 root info', async () => {
    const response = await request(app).get('/api/v1/');

    expect(response.status).toBe(200);
    expect(response.headers['x-api-version']).toBe('v1');
    expect(response.body.data.version).toBe('v1');
  });

  it('protects players endpoint without token', async () => {
    const response = await request(app).get('/api/v1/players');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('protects tournaments endpoint without token', async () => {
    const response = await request(app).get('/api/v1/tournaments');

    expect(response.status).toBe(401);
  });

  it('protects stats endpoint without token', async () => {
    const response = await request(app).get('/api/v1/stats/global');

    expect(response.status).toBe(401);
  });

  it('serves swagger docs', async () => {
    const response = await request(app).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger');
  });
});
