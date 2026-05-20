import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import orchestratorSetup, { type OrchestratorOptions } from "./index.js";
import sessionSetup from "./session.js";
import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

interface MockPluginCall {
  plugin: unknown;
  opts: Record<string, unknown>;
}

describe("Session Orchestrator", () => {
  let mockFastify: FastifyInstance;
  let registeredPlugins: MockPluginCall[] = [];

  beforeEach(() => {
    registeredPlugins = [];
    mockFastify = {
      register: async (plugin: unknown, opts: unknown) => {
        registeredPlugins.push({
          plugin,
          opts: opts as Record<string, unknown>,
        });
      },
    } as unknown as FastifyInstance;
  });

  test("falls back to memory setup safely if no REDIS_HOST or store provided", async () => {
    await orchestratorSetup(mockFastify, { REDIS_TLS: false });

    // Should only register sessionSetup (no redis registered)
    assert.strictEqual(registeredPlugins.length, 1);

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.plugin, sessionSetup);
    assert.strictEqual(sessionCall.opts.cookieName, "sessionId");
    assert.strictEqual(
      sessionCall.opts.secret,
      "a-very-strong-secret-key-that-is-at-least-32-chars",
    );
    assert.strictEqual(sessionCall.opts.ttl, 86400000);
    assert.strictEqual(sessionCall.opts.store, undefined);
  });

  test("prioritizes explicitly passed custom store without registering redis", async () => {
    const customStore = {} as SessionStore;
    await orchestratorSetup(mockFastify, {
      REDIS_TLS: false,
      REDIS_HOST: "127.0.0.1",
      store: customStore,
    });

    assert.strictEqual(registeredPlugins.length, 1);
    assert.strictEqual(registeredPlugins[0].plugin, sessionSetup);
    assert.strictEqual(registeredPlugins[0].opts.store, customStore);
  });

  test("orchestrates redis setup properly using all available inputs", async () => {
    const opts: OrchestratorOptions = {
      SESSION_COOKIE_NAME: "customName",
      SESSION_COOKIE_SECRET: "super-secret",
      SESSION_TTL: 3600000,
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "6380",
      REDIS_PASSWORD: "pass",
      REDIS_PREFIX: "sess:",
      REDIS_TLS: true,
    };

    await orchestratorSetup(mockFastify, opts);

    assert.strictEqual(registeredPlugins.length, 2);

    const redisCall = registeredPlugins[0];
    assert.strictEqual(redisCall.opts.host, "127.0.0.1");
    assert.strictEqual(redisCall.opts.port, 6380);
    assert.strictEqual(redisCall.opts.password, "pass");
    assert.strictEqual(redisCall.opts.keyPrefix, "sess:");
    assert.deepEqual(redisCall.opts.tls, {});

    const sessionCall = registeredPlugins[1];
    assert.strictEqual(sessionCall.plugin, sessionSetup);
    assert.strictEqual(sessionCall.opts.cookieName, "customName");
    assert.strictEqual(sessionCall.opts.secret, "super-secret");
    assert.strictEqual(sessionCall.opts.ttl, 3600000);
    assert.ok(sessionCall.opts.store !== undefined);
  });
});
