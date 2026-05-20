import IORedisMock from 'ioredis-mock';
import { buildApp } from './app.js';
import { CitizenService } from './services/citizen.js';
import { PaymentService } from './services/payment.js';
import { HealthService } from './services/health.js';
import { CommunicationService } from './services/communication.js';

export function createMockJwt(roles: string[] = ['agent']) {
  const payload = { sub: 'test-user', roles };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${base64Payload}.signature`;
}

export function getTestApp(apiUrl: string = 'http://localhost:3001') {
  const redisClient = new IORedisMock();

  const services = {
    citizen: new CitizenService(apiUrl),
    payment: new PaymentService(apiUrl),
    health: new HealthService(apiUrl),
    communication: new CommunicationService(apiUrl)
  };

  return buildApp({
    redis: { client: redisClient, closeClient: false },
    services,
    sessionSecret: 'test-secret-key-that-is-at-least-32-characters!!',
    cookieSecure: false,
  });
}