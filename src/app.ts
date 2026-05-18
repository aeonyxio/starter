import Fastify from 'fastify';
import view from '@fastify/view';
import formbody from '@fastify/formbody';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import staticPlugin from '@fastify/static';
import nunjucks from 'nunjucks';
import path from 'path';
import Redis from 'ioredis';

import { searchRoutes } from './routes/search';
import { authMiddleware } from './middleware/auth';
import { RedisStore } from './plugins/session-store';

import { CitizenService } from './services/citizen';
import { PaymentService } from './services/payment';
import { HealthService } from './services/health';
import { CommunicationService } from './services/communication';

export interface AppServices {
  citizen: CitizenService;
  payment: PaymentService;
  health: HealthService;
  communication: CommunicationService;
}

export function buildApp(opts: { redisClient: Redis; services: AppServices }) {
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
    ],
    options: { autoescape: true, watch: false }
  });

  app.register(formbody);
  app.register(cookie);

  app.register(session, {
    secret: 'a-very-long-and-secure-secret-key-that-is-at-least-32-chars',
    cookieName: 'dwp-find-session',
    saveUninitialized: false,
    cookie: { secure: false }, 
    store: new RedisStore(opts.redisClient) as any
  });

  app.addHook('preHandler', authMiddleware);

  // Register routes and pass the services along
  app.register(searchRoutes, { services: opts.services });

  return app;
}