import fp from "fastify-plugin";
import fastifyRedis from "@fastify/redis";
import type { FastifyPluginAsync } from "fastify";
import type { SessionStore } from "@fastify/session";
import { RedisSessionStore } from "./redis-store.js";

declare module "fastify" {
  interface FastifyInstance {
    redisSessionStore?: SessionStore;
  }
}

export interface RedisSessionOptions {
  REDIS_TLS: boolean;
  REDIS_HOST?: string | null;
  REDIS_PORT?: string | number | null;
  REDIS_PASSWORD?: string | null;
  REDIS_PREFIX?: string | null;
}

export const redisOrchestratorSetup: FastifyPluginAsync<
  RedisSessionOptions
> = async (fastify, options) => {
  if (!options.REDIS_HOST) {
    return; // Gracefully bypass redis setup if no host is configured
  }

  const redisOptions: Record<string, unknown> = {
    host: options.REDIS_HOST,
    port: options.REDIS_PORT ? Number(options.REDIS_PORT) : 6379,
  };

  if (options.REDIS_PASSWORD) redisOptions.password = options.REDIS_PASSWORD;
  if (options.REDIS_PREFIX) redisOptions.keyPrefix = options.REDIS_PREFIX;
  if (options.REDIS_TLS) redisOptions.tls = {};

  await fastify.register(fastifyRedis, redisOptions);

  // Utilize our newly isolated class
  const store = new RedisSessionStore(fastify);
  fastify.decorate("redisSessionStore", store);
};

export default fp(redisOrchestratorSetup, { name: "app-redis-orchestrator" });
