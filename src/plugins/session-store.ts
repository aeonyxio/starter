import fp from "fastify-plugin";
import fastifyRedis from "@fastify/redis";
import fastifySession from "@fastify/session";
import type { FastifyPluginAsync } from "fastify";
import type { FastifySessionOptions, SessionStore } from "@fastify/session";

export interface AppSessionOptions {
  SESSION_COOKIE_NAME?: string;
  SESSION_COOKIE_SECRET?: string;
  SESSION_TTL?: number;
  SESSION_DISABLE_EXPIRY?: boolean;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_PREFIX?: string;
  REDIS_TTS?: unknown; // Maps natively to TLS config if provided
  store?: SessionStore | null;
}

export const sessionSetup: FastifyPluginAsync<AppSessionOptions> = async (
  fastify,
  options,
) => {
  const secret =
    options.SESSION_COOKIE_SECRET ||
    "a-very-strong-secret-key-that-is-at-least-32-chars";
  const cookieName = options.SESSION_COOKIE_NAME || "sessionId";

  const sessionOptions: FastifySessionOptions = {
    secret,
    cookieName,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
    saveUninitialized: false,
  };

  // Handle TTL and Expiry
  if (options.SESSION_DISABLE_EXPIRY) {
    sessionOptions.cookie!.maxAge = undefined;
  } else if (options.SESSION_TTL !== undefined) {
    sessionOptions.cookie!.maxAge = options.SESSION_TTL;
  } else {
    sessionOptions.cookie!.maxAge = 86400000; // 1 day default
  }

  // Determine Store Behavior
  if (options.store) {
    // 1. Explicit Custom Store Passed
    sessionOptions.store = options.store;
  } else if (options.REDIS_HOST) {
    // 2. Setup Redis Store Elegantly
    const redisOptions: Record<string, unknown> = {
      host: options.REDIS_HOST,
      port: options.REDIS_PORT ?? 6379,
    };

    if (options.REDIS_PASSWORD) redisOptions.password = options.REDIS_PASSWORD;
    if (options.REDIS_PREFIX) redisOptions.keyPrefix = options.REDIS_PREFIX;
    if (options.REDIS_TTS !== undefined) redisOptions.tls = options.REDIS_TTS;

    await fastify.register(fastifyRedis, redisOptions);

    sessionOptions.store = {
      get: async (sessionId: string) => {
        const result = await fastify.redis.get(sessionId);
        return result ? JSON.parse(result) : null;
      },
      set: async (sessionId: string, session: unknown) => {
        const sessionRecord = session as Record<string, unknown>;
        const cookieInfo = sessionRecord.cookie as
          | { originalMaxAge?: number | null }
          | undefined;

        // If expiry is disabled OR cookie is missing originalMaxAge, persist without EX
        if (options.SESSION_DISABLE_EXPIRY || !cookieInfo?.originalMaxAge) {
          await fastify.redis.set(sessionId, JSON.stringify(session));
        } else {
          const ttl = Math.ceil(cookieInfo.originalMaxAge / 1000);
          await fastify.redis.set(
            sessionId,
            JSON.stringify(session),
            "EX",
            ttl,
          );
        }
      },
      destroy: async (sessionId: string) => {
        await fastify.redis.del(sessionId);
      },
    } as SessionStore;
  }
  // 3. Fallback: If no REDIS_HOST and no store is provided, @fastify/session uses memory.

  await fastify.register(fastifySession, sessionOptions);
};

export default fp(sessionSetup, { name: "app-session" });
