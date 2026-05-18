import Fastify from 'fastify';
import IORedisMock from 'ioredis-mock';
import { buildApp } from '../src/app';

// 1. Stand up a Fake Backend API
async function startFakeBackend() {
  const backend = Fastify();
  
  backend.get('/api/people', async (req, reply) => {
    const q = (req.query as any).q?.toLowerCase() || '';
    
    // Mock Database
    const db = [
      { id: '1', name: 'Jane Doe', nino: 'QQ123456C', status: 'Active' },
      { id: '2', name: 'John Smith', nino: 'AB987654D', status: 'Inactive' }
    ];

    const results = db.filter(p => p.name.toLowerCase().includes(q) || p.nino.toLowerCase().includes(q));
    return results;
  });

  await backend.listen({ port: 3001 });
  console.log('Mock Backend API listening on http://localhost:3001');
}

// 2. Wrap and start the Main App
async function startDevServer() {
  await startFakeBackend();

  // Mock Redis for Session handling
  const mockRedisClient = new IORedisMock();

  const app = buildApp({
    redisClient: mockRedisClient as any,
    apiUrl: 'http://localhost:3001'
  });

  try {
    await app.listen({ port: 3000 });
    console.log('GOV.UK Find Someone running locally at http://localhost:3000');
    console.log('Ensure you pass the x-id-token header for manual API testing!');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startDevServer();