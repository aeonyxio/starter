import { FastifyInstance } from 'fastify';
import { citizenMocks } from './citizen/index.js';
import { paymentMocks } from './payment/index.js';
import { healthMocks } from './health/index.js';
import { communicationMocks } from './communication/index.js';

/**
 * Registers all mock backend APIs. 
 * In a real environment, these would be 4 completely separate microservices/apps.
 */
export async function registerMocks(app: FastifyInstance) {
  app.register(citizenMocks, { prefix: '/api/citizen' });
  app.register(paymentMocks, { prefix: '/api/payments' });
  app.register(healthMocks, { prefix: '/api/health' });
  app.register(communicationMocks, { prefix: '/api/comms' });
}