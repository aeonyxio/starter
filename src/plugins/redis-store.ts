import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";
import "@fastify/redis"; // Ensures fastify.redis is strongly typed

export class RedisSessionStore implements SessionStore {
  constructor(private fastify: FastifyInstance) {}

  async get(sessionId: string): Promise<unknown> {
    const result = await this.fastify.redis.get(sessionId);
    return result ? JSON.parse(result) : null;
  }

  async set(sessionId: string, session: unknown): Promise<void> {
    const sessionRecord = session as Record<string, unknown>;
    const cookieInfo = sessionRecord.cookie as
      | { originalMaxAge?: number | null }
      | undefined;

    // originalMaxAge elegantly cascades as undefined when timeouts are disabled
    if (!cookieInfo?.originalMaxAge) {
      await this.fastify.redis.set(sessionId, JSON.stringify(session));
    } else {
      const ttl = Math.ceil(cookieInfo.originalMaxAge / 1000);
      await this.fastify.redis.set(
        sessionId,
        JSON.stringify(session),
        "EX",
        ttl,
      );
    }
  }

  async destroy(sessionId: string): Promise<void> {
    await this.fastify.redis.del(sessionId);
  }
}
