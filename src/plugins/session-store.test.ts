import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sessionSetup } from "./session-store.js";
import type { FastifyInstance } from "fastify";

describe("AppSession Plugin", () => {
  let mockFastify: any; // Test double instance
  let redisCalls: { method: string; args: any[] }[] = [];
  let registeredPlugins: { plugin: any; opts: any }[] = [];
  let mockHasCookie = false;
  let redisGetMock: (id: string) => Promise<string | null>;

  beforeEach(() => {
    // Reset test trackers
    redisCalls = [];
    registeredPlugins = [];
    mockHasCookie = false;
    redisGetMock = async () => null;

    mockFastify = {
      hasPlugin: (name: string) =>
        name === "@fastify/cookie" ? mockHasCookie : false,
      register: async (plugin: any, opts: any) => {
        registeredPlugins.push({ plugin, opts });
      },
      redis: {
        get: async (...args: any[]) => {
          redisCalls.push({ method: "get", args });
          return redisGetMock(args[0]);
        },
        set: async (...args: any[]) => {
          redisCalls.push({ method: "set", args });
          return "OK";
        },
        del: async (...args: any[]) => {
          redisCalls.push({ method: "del", args });
          return 1;
        },
      },
    };

    // Clear dynamic environment configurations
    delete process.env.HOST;
    delete process.env.REDIS_PORT;
    delete process.env.SESSION_SECRET;
    delete process.env.NODE_ENV;
  });

  test("registers cookie plugin if not present", async () => {
    mockHasCookie = false;
    await sessionSetup(mockFastify as FastifyInstance, {});
    assert.strictEqual(registeredPlugins.length, 2); // Cookie + Session
  });

  test("skips registering cookie plugin if already present", async () => {
    mockHasCookie = true;
    await sessionSetup(mockFastify as FastifyInstance, {});
    assert.strictEqual(registeredPlugins.length, 1); // Session only
  });

  test("applies sensible defaults for development without redis", async () => {
    mockHasCookie = true;
    process.env.NODE_ENV = "development";

    await sessionSetup(mockFastify as FastifyInstance, {});

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.opts.cookieName, "sessionId");
    assert.strictEqual(
      sessionCall.opts.secret,
      "a-very-strong-secret-key-that-is-at-least-32-chars",
    );
    assert.strictEqual(sessionCall.opts.cookie.secure, false);
    assert.strictEqual(sessionCall.opts.store, undefined); // Auto fallback to in-memory mode!
  });

  test("uses environment configurations & production flags correctly", async () => {
    mockHasCookie = true;
    process.env.SESSION_SECRET = "env-secret";
    process.env.NODE_ENV = "production";

    await sessionSetup(mockFastify as FastifyInstance, {
      cookieName: "customCookie",
      secret: "option-secret", // ENV has higher precedence over this
    });

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.opts.cookieName, "customCookie");
    assert.strictEqual(sessionCall.opts.secret, "env-secret");
    assert.strictEqual(sessionCall.opts.cookie.secure, true);
  });

  test("registers redis and attaches custom store adapter when HOST is provided", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";
    process.env.REDIS_PORT = "6380";

    await sessionSetup(mockFastify as FastifyInstance, {});

    const redisCall = registeredPlugins[0];
    const sessionCall = registeredPlugins[1];

    assert.strictEqual(redisCall.opts.host, "localhost");
    assert.strictEqual(redisCall.opts.port, 6380);
    assert.ok(sessionCall.opts.store !== undefined);
  });

  test("uses default redis port when REDIS_PORT is missing", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";

    await sessionSetup(mockFastify as FastifyInstance, {});
    assert.strictEqual(registeredPlugins[0].opts.port, 6379);
  });

  test("store.get retrieves and successfully parses stringified redis data", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";
    redisGetMock = async () => JSON.stringify({ user: "typescript-dev" });

    await sessionSetup(mockFastify as FastifyInstance, {});
    const store = registeredPlugins[1].opts.store;

    const result = await store.get("sid-123");
    assert.deepEqual(result, { user: "typescript-dev" });
    assert.strictEqual(redisCalls[0].method, "get");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
  });

  test("store.get returns null gracefully when key does not exist", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";
    redisGetMock = async () => null;

    await sessionSetup(mockFastify as FastifyInstance, {});
    const store = registeredPlugins[1].opts.store;

    const result = await store.get("sid-123");
    assert.strictEqual(result, null);
  });

  test("store.set assigns correct TTL derived from cookie.originalMaxAge", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";

    await sessionSetup(mockFastify as FastifyInstance, {});
    const store = registeredPlugins[1].opts.store;

    const mockSession = { cookie: { originalMaxAge: 10000 }, viewCount: 1 };
    await store.set("sid-123", mockSession);

    assert.strictEqual(redisCalls[0].method, "set");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
    assert.strictEqual(redisCalls[0].args[1], JSON.stringify(mockSession));
    assert.strictEqual(redisCalls[0].args[2], "EX");
    assert.strictEqual(redisCalls[0].args[3], 10); // Extrapolated safely (10000ms -> 10s)
  });

  test("store.set falls back to 1-day TTL if originalMaxAge is missing", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";

    await sessionSetup(mockFastify as FastifyInstance, {});
    const store = registeredPlugins[1].opts.store;

    await store.set("sid-123", { noCookieInfo: true }); // Missing cookie attribute completely

    assert.strictEqual(redisCalls[0].method, "set");
    assert.strictEqual(redisCalls[0].args[3], 86400); // 1 Day in seconds
  });

  test("store.destroy deletes session key from redis successfully", async () => {
    mockHasCookie = true;
    process.env.HOST = "localhost";

    await sessionSetup(mockFastify as FastifyInstance, {});
    const store = registeredPlugins[1].opts.store;

    await store.destroy("sid-123");

    assert.strictEqual(redisCalls[0].method, "del");
    assert.strictEqual(redisCalls[0].args[0], "sid-123");
  });
});
