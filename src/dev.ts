import Fastify from 'fastify';
import IORedisMock from 'ioredis-mock';
import { buildApp } from './app';
import { registerMocks } from './mocks';

import { CitizenService } from './services/citizen';
import { PaymentService } from './services/payment';
import { HealthService } from './services/health';
import { CommunicationService } from './services/communication';

async function startDevServer() {
  // 1. Stand up the Mock Backend resolving all 4 API Domains
  const backend = Fastify();
  await registerMocks(backend);
  await backend.listen({ port: 3001 });
  console.log('All Mock Backend APIs listening on http://localhost:3001');

  // 2. Initialize App Services (pointing to the local mock backend)
  const services = {
    citizen: new CitizenService('http://localhost:3001'),
    payment: new PaymentService('http://localhost:3001'),
    health: new HealthService('http://localhost:3001'),
    communication: new CommunicationService('http://localhost:3001')
  };

  // 3. Wrap and start the Main App
  const mockRedisClient = new IORedisMock();

  const app = buildApp({
    redisClient: mockRedisClient as any,
    services
  });

  // Inject a mock token for local development to bypass auth manually
  app.addHook('onRequest', async (req) => {
    if (!req.headers['x-id-token']) {
      const payload = { sub: 'dev-user-123', roles: ['agent'] };
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      req.headers['x-id-token'] = `header.${base64Payload}.signature`;
    }
  });

  try {
    await app.listen({ port: 3000 });
    console.log('GOV.UK App running locally at http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startDevServer();