import { FastifyInstance } from 'fastify';

export async function citizenMocks(app: FastifyInstance) {
  const db = [
    { id: '1', name: 'Jane Doe', nino: 'QQ123456C', status: 'Active' },
    { id: '2', name: 'John Smith', nino: 'AB987654D', status: 'Inactive' }
  ];

  // 1. Search citizens
  app.get('/search', async (req, reply) => {
    const q = (req.query as any).q?.toLowerCase() || '';
    return db.filter(p => p.name.toLowerCase().includes(q) || p.nino.toLowerCase().includes(q));
  });

  // 2. Get citizen by ID
  app.get('/:id', async (req, reply) => {
    const person = db.find(p => p.id === (req.params as any).id);
    return person || reply.status(404).send({ error: 'Not found' });
  });

  // 3. Get citizen address
  app.get('/:id/address', async (req, reply) => {
    return { line1: '123 Fake Street', city: 'London', postcode: 'SW1A 1AA' };
  });

  // 4. Get citizen employment history
  app.get('/:id/employment', async (req, reply) => {
    return [{ employer: 'Acme Corp', startDate: '2020-01-01', endDate: null }];
  });

  // 5. Validate NINO format and status
  app.post('/validate-nino', async (req, reply) => {
    const { nino } = req.body as any;
    const isValid = /^[A-Z]{2}\d{6}[A-Z]$/i.test(nino);
    return { valid: isValid };
  });
}