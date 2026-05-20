import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  redisOrchestratorSetup,
  type RedisSessionOptions,
} from "./orchestrator.js";
import { RedisSessionStore } from "./redis-store.js";
import type { FastifyInstance } from "fastify";

interface MockPluginCall {
  plugin: unknown;
  opts: Record<string, unknown>;
}

describe("Redis Orchestrator Plugin", () => {
  let mockFastify: FastifyInstance;
  let registeredPlugins: MockPluginCall[] = [];
  let decorators: Record<string, unknown> = {};

  beforeEach(() => {
    registeredPlugins = [];
    decorators = {};

    mockFastify = {
      register: async (plugin: unknown, opts: unknown) => {
        registeredPlugins.push({
          plugin,
          opts: opts as Record<string, unknown>,
        });
      },
      decorate: (name: string, value: unknown) => {
        decorators[name] = value;
      },
    } as unknown as FastifyInstance;
  });

  test("skips setup gracefully if REDIS_HOST is missing", async () => {
    const opts: RedisSessionOptions = { REDIS_TLS: false };
    await redisOrchestratorSetup(mockFastify, opts);

    assert.strictEqual(registeredPlugins.length, 0);
    assert.strictEqual(decorators["redisSessionStore"], undefined);
  });

  test("registers redis correctly with string inputs and TLS", async () => {
    const opts: RedisSessionOptions = {
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "6380",
      REDIS_PASSWORD: "redis-pass",
      REDIS_PREFIX: "sess:",
      REDIS_TLS: true,
    };

    await redisOrchestratorSetup(mockFastify, opts);

    const redisCall = registeredPlugins[0];
    assert.strictEqual(redisCall.opts.host, "127.0.0.1");
    assert.strictEqual(redisCall.opts.port, 6380);
    assert.strictEqual(redisCall.opts.password, "redis-pass");
    assert.strictEqual(redisCall.opts.keyPrefix, "sess:");
    assert.deepEqual(redisCall.opts.tls, {});

    // Assert the isolated store is successfully constructed and attached
    assert.ok(decorators["redisSessionStore"] instanceof RedisSessionStore);
  });

  test("registers redis correctly with null fallback values", async () => {
    const opts: RedisSessionOptions = {
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: null,
      REDIS_PASSWORD: null,
      REDIS_PREFIX: null,
      REDIS_TLS: false,
    };

    await redisOrchestratorSetup(mockFastify, opts);

    const redisCall = registeredPlugins[0];
    assert.strictEqual(redisCall.opts.host, "127.0.0.1");
    assert.strictEqual(redisCall.opts.port, 6379); // Mapped properly
    assert.strictEqual(redisCall.opts.password, undefined);
    assert.strictEqual(redisCall.opts.keyPrefix, undefined);
    assert.strictEqual(redisCall.opts.tls, undefined);
    assert.ok(decorators["redisSessionStore"] instanceof RedisSessionStore);
  });
});
