import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

export function createRedisStore(fastify: FastifyInstance): SessionStore {
  return {
    get: async (sessionId: string) => {
      const result = await fastify.redis.get(sessionId);
      return result ? JSON.parse(result) : null;
    },
    set: async (sessionId: string, session: unknown) => {
      const sessionRecord = session as Record<string, unknown>;
      const cookieInfo = sessionRecord.cookie as
        | { originalMaxAge?: number | null }
        | undefined;

      if (!cookieInfo?.originalMaxAge) {
        await fastify.redis.set(sessionId, JSON.stringify(session));
      } else {
        const ttl = Math.ceil(cookieInfo.originalMaxAge / 1000);
        await fastify.redis.set(sessionId, JSON.stringify(session), "EX", ttl);
      }
    },
    destroy: async (sessionId: string) => {
      await fastify.redis.del(sessionId);
    },
  };
}
