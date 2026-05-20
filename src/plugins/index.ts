import fp from "fastify-plugin";
import fastifyRedis from "@fastify/redis";
import type { FastifyPluginAsync } from "fastify";
import type { SessionStore } from "@fastify/session";
import sessionSetup from "./session.js";
import { createRedisStore } from "./redis-store.js";

export interface OrchestratorOptions {
  SESSION_COOKIE_NAME?: string;
  SESSION_COOKIE_SECRET?: string;
  SESSION_TTL?: number;
  SESSION_DISABLE_EXPIRY?: boolean;
  REDIS_TLS: boolean;
  REDIS_HOST?: string | null;
  REDIS_PORT?: string | number | null;
  REDIS_PASSWORD?: string | null;
  REDIS_PREFIX?: string | null;
  store?: SessionStore | null;
}

const orchestratorSetup: FastifyPluginAsync<OrchestratorOptions> = async (
  fastify,
  options,
) => {
  let resolvedStore: SessionStore | undefined = options.store ?? undefined;

  // If no explicit store is given but REDIS_HOST exists, orchestrate Redis setup
  if (!resolvedStore && options.REDIS_HOST) {
    const redisOptions: Record<string, unknown> = {
      host: options.REDIS_HOST,
      port: options.REDIS_PORT ? Number(options.REDIS_PORT) : 6379,
    };

    if (options.REDIS_PASSWORD) redisOptions.password = options.REDIS_PASSWORD;
    if (options.REDIS_PREFIX) redisOptions.keyPrefix = options.REDIS_PREFIX;
    if (options.REDIS_TLS) redisOptions.tls = {};

    await fastify.register(fastifyRedis, redisOptions);
    resolvedStore = createRedisStore(fastify);
  }

  // Register the core session plugin using cleanly mapped arguments
  await fastify.register(sessionSetup, {
    cookieName: options.SESSION_COOKIE_NAME || "sessionId",
    secret:
      options.SESSION_COOKIE_SECRET ||
      "a-very-strong-secret-key-that-is-at-least-32-chars",
    ttl: options.SESSION_TTL ?? 86400000,
    disableTimeout: options.SESSION_DISABLE_EXPIRY ?? false,
    store: resolvedStore,
  });
};

export default fp(orchestratorSetup, { name: "app-session-orchestrator" });
