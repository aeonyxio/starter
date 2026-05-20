import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { getTestApp, createMockJwt } from '../../src/test-utils.js';

describe('Search Integration Tests (Fastify Inject)', () => {
  let app: any;
  let mockBackend: any;

  before(async () => {
    // Spin up a mock backend to catch API calls
    mockBackend = Fastify();
    mockBackend.get('/api/citizen/search', async () => {
      return [{ id: '1', name: 'Mock Person', nino: 'AA111111A', status: 'Active' }];
    });
    await mockBackend.listen({ port: 0 });
    const apiUrl = `http://localhost:${mockBackend.server.address().port}`;

    app = await getTestApp(apiUrl);
    await app.ready();
  });

  after(async () => {
    await app.close();
    await mockBackend.close();
  });

  test('GET / requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/'
    });
    assert.strictEqual(res.statusCode, 401);
  });

  test('GET / loads form when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-id-token': createMockJwt() }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.payload, /Find someone/);
  });

  test('POST /search sets session and redirects to /results', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/search',
      headers: { 'x-id-token': createMockJwt() },
      payload: { searchTerm: 'Mock Person' }
    });

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/results');
    
    // Extract session cookie for the next request
    const cookies = res.cookies;
    const sessionCookie = cookies.find((c: any) => c.name === 'dwp-find-session');
    
    // Follow redirect to /results
    const resResults = await app.inject({
      method: 'GET',
      url: '/results',
      headers: { 
        'x-id-token': createMockJwt(),
        'cookie': `${sessionCookie.name}=${sessionCookie.value}`
      }
    });

    assert.strictEqual(resResults.statusCode, 200);
    assert.match(resResults.payload, /Mock Person/);
    assert.match(resResults.payload, /AA111111A/);
  });
});