import Fastify from 'fastify';
import view from '@fastify/view';
import formbody from '@fastify/formbody';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import staticPlugin from '@fastify/static';
import fastifyRedis from '@fastify/redis';
import nunjucks from 'nunjucks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { searchRoutes } from './routes/search.js';
import { authMiddleware } from './middleware/auth.js';
import { RedisStore } from './plugins/session-store.js';

import { CitizenService } from './services/citizen.js';
import { PaymentService } from './services/payment.js';
import { HealthService } from './services/health.js';
import { CommunicationService } from './services/communication.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppServices {
  citizen: CitizenService;
  payment: PaymentService;
  health: HealthService;
  communication: CommunicationService;
}

export interface AppOptions {
  redis: { url: string } | { client: unknown; closeClient?: boolean };
  services: AppServices;
  sessionSecret: string;
  cookieSecure: boolean;
}

export async function buildApp(opts: AppOptions) {
  const app = Fastify({ logger: true });

  app.register(staticPlugin, {
    root: path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk/assets'),
    prefix: '/assets/',
  });

  app.register(view, {
    engine: { nunjucks: nunjucks },
    root: [
      path.join(__dirname, 'views'),
      path.join(__dirname, '../node_modules/govuk-frontend/dist')
    ] as unknown as string,
    options: { autoescape: true, watch: false }
  });

  app.register(formbody);
  app.register(cookie);

  // @fastify/redis manages Redis connection lifecycle (auto-close on shutdown)
  await app.register(fastifyRedis, opts.redis as Parameters<typeof fastifyRedis>[1]);

  app.register(session, {
    secret: opts.sessionSecret,
    cookieName: 'dwp-find-session',
    saveUninitialized: false,
    cookie: { secure: opts.cookieSecure },
    store: new RedisStore(app.redis) as any
  });

  app.addHook('preHandler', authMiddleware);

  // Register routes and pass the services along
  app.register(searchRoutes, { services: opts.services });

  return app;
}