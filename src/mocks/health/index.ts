import { FastifyInstance } from 'fastify';

export async function healthMocks(app: FastifyInstance) {
  // 1. Get capability for work assessments
  app.get('/assessments/:citizenId', async (req, reply) => {
    return [{ date: '2023-11-10', outcome: 'LCWRA', nextReview: '2025-11-10' }];
  });

  // 2. Get declared health conditions
  app.get('/conditions/:citizenId', async (req, reply) => {
    return [{ condition: 'Asthma', severity: 'Moderate', declaredDate: '2020-05-01' }];
  });

  // 3. Get upcoming health assessment appointments
  app.get('/appointments/:citizenId', async (req, reply) => {
    return [{ id: 'a1', datetime: '2024-03-20T14:00:00Z', type: 'Telephone', status: 'Booked' }];
  });

  // 4. Get fit notes/medical certificates
  app.get('/certificates/:citizenId', async (req, reply) => {
    return [{ startDate: '2024-01-01', endDate: '2024-04-01', doctor: 'Dr. Hibbert' }];
  });

  // 5. Get full medical evidence history summary
  app.get('/history/:citizenId', async (req, reply) => {
    return { totalDocuments: 5, lastUpdated: '2024-01-05T10:00:00Z' };
  });
}