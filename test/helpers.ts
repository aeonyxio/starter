import IORedisMock from 'ioredis-mock';
import { buildApp } from '../src/app';

// Helper to generate a dummy base64 Kong JWT
export function createMockJwt(roles: string[] = ['agent']) {
  const payload = { sub: 'test-user', roles };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${base64Payload}.signature`;
}

// Helper to build app instance for integration tests
export function getTestApp(apiUrl: string = 'http://localhost:3001') {
  const redisClient = new IORedisMock();
  return buildApp({ redisClient: redisClient as any, apiUrl });
}