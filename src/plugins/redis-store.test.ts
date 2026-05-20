import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createRedisStore,
  type SessionType,
  type RedisStoreOptions,
} from "./redis-store.js";
import type { FastifyInstance } from "fastify";

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
        expire: async (...args: unknown[]) => {
          redisCalls.push({ method: "expire", args });
          return 1;
        },
      } as unknown,
    } as FastifyInstance;
  });

  function createAsyncStore(options?: RedisStoreOptions) {
    const store = createRedisStore(mockFastify, options);

    return {
      get: (id: string) =>
        new Promise<SessionType | null | undefined>((resolve, reject) =>
          store.get(id, (err, result) =>
            err
              ? reject(err)
              : resolve(result as SessionType | null | undefined),
          ),
        ),
      set: (id: string, session: SessionType) =>
        new Promise<void>((resolve, reject) =>
          store.set(id, session, (err) => (err ? reject(err) : resolve())),
        ),
      destroy: (id: string) =>
        new Promise<void>((resolve, reject) =>
          store.destroy(id, (err) => (err ? reject(err) : resolve())),
        ),
      touch: (id: string, session: SessionType) =>
        new Promise<void>((resolve, reject) =>
          store.touch(id, session, (err) => (err ? reject(err) : resolve())),
        ),
    };
  }

  test("get retrieves and parses data with correct prefix", async () => {
    const store = createAsyncStore();
    redisGetMock = async () => JSON.stringify({ user: "tester", cookie: {} });

    const result = await store.get("sid-123");

    assert.strictEqual(redisCalls[0].args[0], "sess:sid-123");
    assert.deepEqual(result, { user: "tester", cookie: {} });
  });

  test("get rejects gracefully on invalid JSON", async () => {
    const store = createAsyncStore();
    redisGetMock = async () => "{ broken json: ";
    await assert.rejects(store.get("sid-123"), SyntaxError);
  });

  test("set applies EX parameter matching originalMaxAge mathematically", async () => {
    const store = createAsyncStore();
    const mockSession = { cookie: { originalMaxAge: 15000 } } as SessionType;
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "set");
    assert.strictEqual(redisCalls[0].args[0], "sess:sid-123");
    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 15);
  });

  test("set falls back to default TTL if originalMaxAge is missing (fixes memory leak)", async () => {
    const store = createAsyncStore();
    const mockSession = { cookie: {} } as SessionType;
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "set");
    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 86400);
  });

  test("set handles zero originalMaxAge without skipping EX parameter", async () => {
    const store = createAsyncStore();
    const mockSession = { cookie: { originalMaxAge: 0 } } as SessionType;
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "set");
    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 1);
  });

  test("destroy removes the key correctly using prefix", async () => {
    const store = createAsyncStore();
    await store.destroy("sid-123");

    assert.strictEqual(redisCalls[0].method, "del");
    assert.strictEqual(redisCalls[0].args[0], "sess:sid-123");
  });

  test("touch updates TTL via expire command", async () => {
    const store = createAsyncStore();
    const mockSession = { cookie: { originalMaxAge: 25000 } } as SessionType;
    await store.touch("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "expire");
    assert.strictEqual(redisCalls[0].args[0], "sess:sid-123");
    assert.strictEqual(redisCalls[0].args[1], 25);
  });

  test("touch applies default TTL if originalMaxAge is missing", async () => {
    const store = createAsyncStore();
    const mockSession = { cookie: {} } as SessionType;
    await store.touch("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "expire");
    assert.strictEqual(redisCalls[0].args[1], 86400);
  });

  test("supports custom prefixes and TTL via options", async () => {
    const store = createAsyncStore({ prefix: "custom:", ttl: 3600 });
    const mockSession = { cookie: {} } as SessionType;
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[0], "custom:sid-123");
    assert.strictEqual(redisCalls[0].args[3], 3600);
  });
});
