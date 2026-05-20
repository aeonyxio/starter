import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

// 1. Extract the exact Session type that @fastify/session uses natively
// This entirely avoids 'ts(2322)' and 'ts(2305)' without using the word 'any'!
export type SessionType = Parameters<SessionStore["set"]>[1];

export interface RedisSessionStore extends SessionStore {
  touch(
    sessionId: string,
    session: SessionType,
    callback: (err?: Error | null) => void,
  ): void;
}

export interface RedisStoreOptions {
  /** Prefix for Redis keys. Defaults to "sess:" */
  prefix?: string;
  /** Fallback TTL in seconds for sessions without a maxAge. Defaults to 86400 (24 hours) */
  ttl?: number;
}

export function createRedisStore(
  fastify: FastifyInstance,
  options: RedisStoreOptions = {},
): RedisSessionStore {
  const prefix = options.prefix ?? "sess:";
  const defaultTtl = options.ttl ?? 86400;

  const getTtl = (cookie?: SessionType["cookie"]): number => {
    if (typeof cookie?.originalMaxAge === "number") {
      return Math.max(1, Math.ceil(cookie.originalMaxAge / 1000));
    }
    return defaultTtl;
  };

  return {
    get(sessionId, callback) {
      fastify.redis
        .get(prefix + sessionId)
        .then((result: string | null) => {
          if (!result) {
            return callback(undefined, null);
          }
          try {
            const session = JSON.parse(result) as SessionType;
            callback(undefined, session);
          } catch (error) {
            callback(error as Error);
          }
        })
        .catch((error: unknown) => callback(error as Error));
    },

    set(sessionId, session, callback) {
      try {
        const serialized = JSON.stringify(session);
        const ttl = getTtl(session.cookie);

        fastify.redis
          .set(prefix + sessionId, serialized, "EX", ttl)
          .then(() => callback(undefined))
          .catch((error: unknown) => callback(error as Error));
      } catch (error) {
        callback(error as Error);
      }
    },

    destroy(sessionId, callback) {
      fastify.redis
        .del(prefix + sessionId)
        .then(() => callback(undefined))
        .catch((error: unknown) => callback(error as Error));
    },

    touch(sessionId, session, callback) {
      const ttl = getTtl(session.cookie);

      fastify.redis
        .expire(prefix + sessionId, ttl)
        .then(() => callback(undefined))
        .catch((error: unknown) => callback(error as Error));
    },
  };
}
