import fp from "fastify-plugin";
import fastifyRedis from "@fastify/redis";
import fastifySession from "@fastify/session";
import fastifyCookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";
import type { FastifySessionOptions, SessionStore } from "@fastify/session";

export interface AppSessionOptions {
  secret?: string;
  cookieName?: string;
}

export const sessionSetup: FastifyPluginAsync<AppSessionOptions> = async (
  fastify,
  options,
) => {
  // @fastify/session strictly requires cookie parsing to function properly
  if (!fastify.hasPlugin("@fastify/cookie")) {
    await fastify.register(fastifyCookie);
  }

  const secret =
    process.env.SESSION_SECRET ||
    options.secret ||
    "a-very-strong-secret-key-that-is-at-least-32-chars";

  const sessionOptions: FastifySessionOptions = {
    secret,
    cookieName: options.cookieName || "sessionId",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000, // 1 day default
    },
    saveUninitialized: false,
  };

  // Condition: HOST is set -> Initialize Redis and attach inline store
  if (process.env.HOST) {
    const host = process.env.HOST;
    const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

    await fastify.register(fastifyRedis, { host, port });

    // Let TS infer parameters contextually from the SessionStore interface.
    // This perfectly bypasses the need to wrestle with conflicting SessionData types!
    const store: SessionStore = {
      get: async (sessionId) => {
        const result = await fastify.redis.get(sessionId);
        return result ? JSON.parse(result) : null;
      },
      set: async (sessionId, session) => {
        // Safely destructure cookie attributes without resorting to `any`
        const sessionRecord = session as unknown as Record<string, unknown>;
        const cookieInfo = sessionRecord.cookie as
          | { originalMaxAge?: number | null }
          | undefined;

        const maxAge = cookieInfo?.originalMaxAge ?? 86400000;
        const ttl = Math.ceil(maxAge / 1000);

        await fastify.redis.set(sessionId, JSON.stringify(session), "EX", ttl);
      },
      destroy: async (sessionId) => {
        await fastify.redis.del(sessionId);
      },
    };

    sessionOptions.store = store;
  }

  // If no HOST is provided, store gracefully defaults to @fastify/session in-memory.
  await fastify.register(fastifySession, sessionOptions);
};

export default fp(sessionSetup, { name: "app-session" });
