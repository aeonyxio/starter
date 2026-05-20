import { FastifyInstance } from 'fastify';

export async function paymentMocks(app: FastifyInstance) {
  // 1. Get payment history
  app.get('/history/:citizenId', async (req, reply) => {
    return [{ id: 'p1', amount: 350.00, date: '2024-01-15', status: 'PAID' }];
  });

  // 2. Get upcoming scheduled payments
  app.get('/upcoming/:citizenId', async (req, reply) => {
    return [{ id: 'p2', amount: 350.00, date: '2024-02-15', status: 'SCHEDULED' }];
  });

  // 3. Check specific payment status
  app.get('/status/:paymentId', async (req, reply) => {
    return { paymentId: (req.params as any).paymentId, status: 'CLEARED' };
  });

  // 4. Get active payment methods (bank accounts)
  app.get('/methods/:citizenId', async (req, reply) => {
    return [{ type: 'BACS', last4: '1234', sortCode: '10-20-30' }];
  });

  // 5. Get deductions (e.g. overpayment recoveries)
  app.get('/deductions/:citizenId', async (req, reply) => {
    return [{ type: 'Advances', amount: 20.00, remainingBalance: 140.00 }];
  });
}