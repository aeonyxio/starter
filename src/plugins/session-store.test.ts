import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sessionSetup, type AppSessionOptions } from "./session-store.js";
import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

interface MockPluginCall {
  plugin: unknown;
  opts: Record<string, unknown>;
}

interface MockRedisCall {
  method: string;
  args: unknown[];
}

// Intersect SessionStore to explicitly type the modern Promise-based async methods
// This completely avoids utilizing the `Function` or `any` types for test assertions.
interface AsyncSessionStore extends SessionStore {
  get(sessionId: string): Promise<unknown>;
  set(sessionId: string, session: unknown): Promise<void>;
  destroy(sessionId: string): Promise<void>;
}

describe("AppSession Plugin Options Layout", () => {
  let mockFastify: FastifyInstance;
  let redisCalls: MockRedisCall[] = [];
  let registeredPlugins: MockPluginCall[] = [];
  let redisGetMock: (id: string) => Promise<string | null>;

  beforeEach(() => {
    redisCalls = [];
    registeredPlugins = [];
    redisGetMock = async () => null;

    mockFastify = {
      register: async (plugin: unknown, opts: unknown) => {
        registeredPlugins.push({
          plugin,
          opts: opts as Record<string, unknown>,
        });
      },
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

    delete process.env.NODE_ENV;
  });

  test("applies sensible fallback defaults for memory setup", async () => {
    await sessionSetup(mockFastify, { REDIS_TLS: false });
    const sessionCall = registeredPlugins[0];

    assert.strictEqual(sessionCall.opts.cookieName, "sessionId");
    assert.strictEqual(
      sessionCall.opts.secret,
      "a-very-strong-secret-key-that-is-at-least-32-chars",
    );
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).maxAge,
      86400000,
    );
    assert.strictEqual(sessionCall.opts.store, undefined);
  });

  test("prioritizes explicit options setup correctly", async () => {
    process.env.NODE_ENV = "production";

    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      SESSION_COOKIE_NAME: "customSession",
      SESSION_COOKIE_SECRET: "super-secret",
      SESSION_TTL: 3600000,
    });

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.opts.cookieName, "customSession");
    assert.strictEqual(sessionCall.opts.secret, "super-secret");
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).maxAge,
      3600000,
    );
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).secure,
      true,
    );
  });

  test("removes maxAge natively when SESSION_DISABLE_EXPIRY is true", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      SESSION_DISABLE_EXPIRY: true,
    });
    const sessionCall = registeredPlugins[0];
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).maxAge,
      undefined,
    );
  });

  test("uses explicitly passed custom store without registering redis", async () => {
    const customStore = {} as SessionStore;
    await sessionSetup(mockFastify, { REDIS_TLS: false, store: customStore });

    assert.strictEqual(registeredPlugins.length, 1);
    assert.strictEqual(registeredPlugins[0].opts.store, customStore);
  });

  test("registers redis correctly with full configuration string inputs and TLS", async () => {
    const opts: AppSessionOptions = {
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "6380", // Explicitly testing numeric string parsing
      REDIS_PASSWORD: "redis-pass",
      REDIS_PREFIX: "sess:",
      REDIS_TLS: true,
    };

    await sessionSetup(mockFastify, opts);

    const redisCall = registeredPlugins[0];
    const sessionCall = registeredPlugins[1];

    assert.strictEqual(redisCall.opts.host, "127.0.0.1");
    assert.strictEqual(redisCall.opts.port, 6380);
    assert.strictEqual(redisCall.opts.password, "redis-pass");
    assert.strictEqual(redisCall.opts.keyPrefix, "sess:");
    assert.deepEqual(redisCall.opts.tls, {});
    assert.ok(sessionCall.opts.store !== undefined);
  });

  test("registers redis correctly with null fallback values", async () => {
    const opts: AppSessionOptions = {
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: null,
      REDIS_PASSWORD: null,
      REDIS_PREFIX: null,
      REDIS_TLS: false,
    };

    await sessionSetup(mockFastify, opts);

    const redisCall = registeredPlugins[0];

    assert.strictEqual(redisCall.opts.host, "127.0.0.1");
    assert.strictEqual(redisCall.opts.port, 6379); // Default mapped
    assert.strictEqual(redisCall.opts.password, undefined);
    assert.strictEqual(redisCall.opts.keyPrefix, undefined);
    assert.strictEqual(redisCall.opts.tls, undefined);
  });

  test("store.get parses data on hit and returns null on miss", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "localhost",
    });
    const store = registeredPlugins[1].opts.store as AsyncSessionStore;

    redisGetMock = async () => JSON.stringify({ user: "typescript-dev" });
    let result = await store.get("sid-123");
    assert.deepEqual(result, { user: "typescript-dev" });

    redisGetMock = async () => null;
    result = await store.get("sid-456");
    assert.strictEqual(result, null);
  });

  test("store.set sets TTL explicitly with originalMaxAge", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "localhost",
    });
    const store = registeredPlugins[1].opts.store as AsyncSessionStore;

    const mockSession = { cookie: { originalMaxAge: 20000 } };
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 20); // 20000ms bounded to 20s
  });

  test("store.set omits EX parameter if SESSION_DISABLE_EXPIRY is true", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "localhost",
      SESSION_DISABLE_EXPIRY: true,
    });
    const store = registeredPlugins[1].opts.store as AsyncSessionStore;

    const mockSession = { cookie: { originalMaxAge: 20000 } };
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[2], undefined); // No EX mapped
  });

  test("store.set omits EX parameter if cookie info is missing completely", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "localhost",
    });
    const store = registeredPlugins[1].opts.store as AsyncSessionStore;

    const mockSession = { malformed: true }; // No cookie info
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].args[2], undefined);
  });

  test("store.destroy wipes the key correctly", async () => {
    await sessionSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "localhost",
    });
    const store = registeredPlugins[1].opts.store as AsyncSessionStore;

    await store.destroy("sid-123");

    assert.strictEqual(redisCalls[0].method, "del");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
  });
});
