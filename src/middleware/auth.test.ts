import { test, describe } from 'node:test';
import assert from 'node:assert';
import { authMiddleware } from './auth.js';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('Auth Middleware', () => {
  test('Returns 401 when x-id-token is missing', async () => {
    let statusCode = 200;
    let body = '';

    const req = { headers: {} } as unknown as FastifyRequest;
    const reply: any = {
      status: (code: number) => { statusCode = code; return reply; },
      send: (msg: string) => { body = msg; }
    };

    await authMiddleware(req, reply as FastifyReply);

    assert.strictEqual(statusCode, 401);
    assert.match(body, /Missing x-id-token/);
  });

  test('Populates req.user when valid token is provided', async () => {
    const payload = { sub: '123', roles: ['admin'] };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const mockToken = `header.${base64Payload}.signature`;

    const req = { headers: { 'x-id-token': mockToken } } as unknown as FastifyRequest;
    const reply: any = {}; // Shouldn't be called if successful

    await authMiddleware(req, reply as FastifyReply);

    assert.ok(req.user);
    assert.strictEqual(req.user.sub, '123');
    assert.deepStrictEqual(req.user.roles, ['admin']);
  });

  test('Returns 401 when token is invalid', async () => {
    let statusCode = 200;
    let body = '';
    let errorLogged = false;

    // Added a mock 'log.error' interface required by FastifyRequest for gold-standard mocking
    const req = { 
      headers: { 'x-id-token': 'invalid.token' },
      log: { error: () => { errorLogged = true; } }
    } as unknown as FastifyRequest;
    
    const reply: any = {
      status: (code: number) => { statusCode = code; return reply; },
      send: (msg: string) => { body = msg; }
    };

    await authMiddleware(req, reply as FastifyReply);

    assert.strictEqual(statusCode, 401);
    assert.match(body, /Invalid token/);
    assert.strictEqual(errorLogged, true);
  });
});
