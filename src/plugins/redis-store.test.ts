import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { RedisSessionStore } from "./redis-store.js";
import type { FastifyInstance } from "fastify";

interface MockRedisCall {
  method: string;
  args: unknown[];
}

describe("RedisSessionStore", () => {
  let mockFastify: FastifyInstance;
  let redisCalls: MockRedisCall[] = [];
  let redisGetMock: (id: string) => Promise<string | null>;
  let store: RedisSessionStore;

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
    } as unknown as FastifyInstance;

    store = new RedisSessionStore(mockFastify);
  });

  test("get() parses data on hit and returns null on miss", async () => {
    redisGetMock = async () => JSON.stringify({ user: "tester" });
    let result = await store.get("sid-123");
    assert.deepEqual(result, { user: "tester" });

    redisGetMock = async () => null;
    result = await store.get("sid-456");
    assert.strictEqual(result, null);
  });

  test("set() assigns EX parameter mathematically matching originalMaxAge", async () => {
    const mockSession = { cookie: { originalMaxAge: 15000 } };
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 15); // Bounded to 15s
  });

  test("set() omits EX parameter natively if originalMaxAge is missing", async () => {
    const mockSession = { cookie: {} }; // No originalMaxAge
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[2], undefined);
  });

  test("destroy() wipes the key correctly", async () => {
    await store.destroy("sid-123");

    assert.strictEqual(redisCalls[0].method, "del");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
  });
});
