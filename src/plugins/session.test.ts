import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sessionSetup, type AppSessionOptions } from "./session.js";
import type { FastifyInstance } from "fastify";
import type { SessionStore } from "@fastify/session";

interface MockPluginCall {
  plugin: unknown;
  opts: Record<string, unknown>;
}

describe("Session Plugin", () => {
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
    delete process.env.NODE_ENV;
  });

  test("registers session with correct ttl and development secure flag", async () => {
    const opts: AppSessionOptions = {
      cookieName: "myCookie",
      secret: "super-secret",
      ttl: 3600,
      disableTimeout: false,
    };

    await sessionSetup(mockFastify, opts);

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.opts.cookieName, "myCookie");
    assert.strictEqual(sessionCall.opts.secret, "super-secret");
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).maxAge,
      3600,
    );
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).secure,
      false,
    );
    assert.strictEqual(sessionCall.opts.store, undefined);
  });

  test("removes maxAge natively when disableTimeout is true", async () => {
    const opts: AppSessionOptions = {
      cookieName: "myCookie",
      secret: "super-secret",
      ttl: 3600,
      disableTimeout: true,
    };

    await sessionSetup(mockFastify, opts);

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).maxAge,
      undefined,
    );
  });

  test("applies production secure flag correctly", async () => {
    process.env.NODE_ENV = "production";

    const opts: AppSessionOptions = {
      cookieName: "myCookie",
      secret: "super-secret",
      ttl: 3600,
      disableTimeout: false,
    };

    await sessionSetup(mockFastify, opts);

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(
      (sessionCall.opts.cookie as Record<string, unknown>).secure,
      true,
    );
  });

  test("maps custom store explicitly if provided", async () => {
    const customStore = {} as SessionStore;

    const opts: AppSessionOptions = {
      cookieName: "myCookie",
      secret: "super-secret",
      ttl: 3600,
      disableTimeout: false,
      store: customStore,
    };

    await sessionSetup(mockFastify, opts);

    const sessionCall = registeredPlugins[0];
    assert.strictEqual(sessionCall.opts.store, customStore);
  });
});
