import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRedisStore } from "./redis-store.js";
import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

interface AsyncSessionStore extends SessionStore {
  get(sessionId: string): Promise<unknown>;
  set(sessionId: string, session: unknown): Promise<void>;
  destroy(sessionId: string): Promise<void>;
}

describe("Redis Store Factory", () => {
  let mockFastify: FastifyInstance;
  let redisCalls: { method: string; args: unknown[] }[] = [];
  let redisGetMock: (id: string) => Promise<string | null>;

  beforeEach(() => {
    redisCalls = [];
    redisGetMock = async () => null;

    mockFastify = {
      redis: {
        get: async (id: string) => {
          redisCalls.push({ method: "get", args: [id] });
          return redisGetMock(id);
        },
        set: async (...args: unknown[]) => {
          redisCalls.push({ method: "set", args });
          return "OK";
        },
        del: async (...args: unknown[]) => {
          redisCalls.push({ method: "del", args });
          return 1;
        },
      } as unknown,
    } as FastifyInstance;
  });

  test("get retrieves and parses data", async () => {
    const store = createRedisStore(mockFastify) as AsyncSessionStore;
    redisGetMock = async () => JSON.stringify({ user: "tester" });

    const result = await store.get("sid-123");
    assert.deepEqual(result, { user: "tester" });
  });

  test("get returns null on miss", async () => {
    const store = createRedisStore(mockFastify) as AsyncSessionStore;
    const result = await store.get("sid-456");
    assert.strictEqual(result, null);
  });

  test("set applies EX parameter matching originalMaxAge mathematically", async () => {
    const store = createRedisStore(mockFastify) as AsyncSessionStore;
    await store.set("sid-123", { cookie: { originalMaxAge: 15000 } });

    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 15);
  });

  test("set omits EX if originalMaxAge is missing", async () => {
    const store = createRedisStore(mockFastify) as AsyncSessionStore;
    await store.set("sid-123", { cookie: {} });

    assert.strictEqual(redisCalls[0].args[2], undefined);
  });

  test("destroy removes the key correctly", async () => {
    const store = createRedisStore(mockFastify) as AsyncSessionStore;
    await store.destroy("sid-123");

    assert.strictEqual(redisCalls[0].method, "del");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
  });
});
