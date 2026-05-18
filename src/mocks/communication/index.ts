import { FastifyInstance } from 'fastify';

export async function communicationMocks(app: FastifyInstance) {
  // 1. Get comms preferences (paper vs digital)
  app.get('/preferences/:citizenId', async (req, reply) => {
    return { format: 'Digital', braille: false, largePrint: false, language: 'en' };
  });

  // 2. Get sent letters
  app.get('/letters/:citizenId', async (req, reply) => {
    return [{ id: 'L1', title: 'Award Notice', sentDate: '2024-01-10' }];
  });

  // 3. Get sent SMS
  app.get('/sms/:citizenId', async (req, reply) => {
    return [{ id: 'S1', message: 'Your payment has been issued', sentDate: '2024-01-14' }];
  });

  // 4. Get sent Emails
  app.get('/emails/:citizenId', async (req, reply) => {
    return [{ id: 'E1', subject: 'Journal Update', sentDate: '2024-01-12' }];
  });

  // 5. Trigger a new communication
  app.post('/send', async (req, reply) => {
    const { citizenId, type, message } = req.body as any;
    return { status: 'Queued', trackingId: 'TRK999888' };
  });
}