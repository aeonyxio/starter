import IORedisMock from 'ioredis-mock';
import { buildApp } from './app';
import { CitizenService } from './services/citizen';
import { PaymentService } from './services/payment';
import { HealthService } from './services/health';
import { CommunicationService } from './services/communication';

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

  return buildApp({ redisClient: redisClient as any, services });
}