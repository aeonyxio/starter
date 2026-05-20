import { buildApp } from './app.js';
import { CitizenService } from './services/citizen.js';
import { PaymentService } from './services/payment.js';
import { HealthService } from './services/health.js';
import { CommunicationService } from './services/communication.js';

const requiredEnv = ['REDIS_URL', 'SESSION_SECRET', 'API_BASE_URL'] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const services = {
  citizen: new CitizenService(process.env.API_BASE_URL!),
  payment: new PaymentService(process.env.API_BASE_URL!),
  health: new HealthService(process.env.API_BASE_URL!),
  communication: new CommunicationService(process.env.API_BASE_URL!),
};

const app = await buildApp({
  redis: { url: process.env.REDIS_URL! },
  services,
  sessionSecret: process.env.SESSION_SECRET!,
  cookieSecure: IS_PRODUCTION,
});

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
}
