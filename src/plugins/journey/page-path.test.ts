import test from "node:test";
import assert from "node:assert";
import { pagePathPlugin } from "./page-path.js";
import { Page } from "./types/page.js";

// Strict Mocks avoiding `any`
interface MockConfig {
  CONTEXT_PATH?: unknown; // testing invalid states
}

interface MockServer {
  config?: MockConfig;
}

interface MockRequest {
  params: { journeyId?: string };
}

type DecoratorMethod = (this: MockRequest, page: Page) => string;

test("Page Path Plugin - Pure Unit Tests", async (t) => {
  await t.test("Initialization Errors", async (sub) => {
    await sub.test("Throws if fastify.config is missing", async () => {
      const mockFastify = {} as never;
      await assert.rejects(
        () => pagePathPlugin(mockFastify, {}),
        /fastify.config.CONTEXT_PATH must be defined/,
      );
    });

    await sub.test("Throws if CONTEXT_PATH is not a string", async () => {
      const mockFastify = { config: { CONTEXT_PATH: 123 } } as never;
      await assert.rejects(
        () => pagePathPlugin(mockFastify, {}),
        /fastify.config.CONTEXT_PATH must be defined/,
      );
    });
  });

  await t.test("Path Generation", async (sub) => {
    const decorators: Record<string, DecoratorMethod> = {};
    const mockFastify = {
      config: { CONTEXT_PATH: "/base/app" },
      decorateRequest(name: string, fn: DecoratorMethod) {
        decorators[name] = fn;
      },
    };

    await pagePathPlugin(mockFastify as never, {});
    const getPagePath = decorators["getPagePath"];

    await sub.test("Generates ROOT path correctly", () => {
      const req: MockRequest = { params: {} };
      assert.strictEqual(getPagePath.call(req, Page.ROOT), "/base/app/");
    });

    await sub.test("Generates SEARCH path correctly", () => {
      const req: MockRequest = { params: { journeyId: "j-123" } };
      assert.strictEqual(
        getPagePath.call(req, Page.SEARCH),
        "/base/app/j-123/search",
      );
    });

    await sub.test("Generates RESULTS path correctly", () => {
      const req: MockRequest = { params: { journeyId: "j-123" } };
      assert.strictEqual(
        getPagePath.call(req, Page.RESULTS),
        "/base/app/j-123/results",
      );
    });

    await sub.test("Generates NO_RESULTS_FOUND path correctly", () => {
      const req: MockRequest = { params: { journeyId: "j-123" } };
      assert.strictEqual(
        getPagePath.call(req, Page.NO_RESULTS_FOUND),
        "/base/app/j-123/no-results-found",
      );
    });

    await sub.test("Falls back to ROOT if journeyId missing for SEARCH", () => {
      const req: MockRequest = { params: {} };
      assert.strictEqual(getPagePath.call(req, Page.SEARCH), "/base/app/");
    });

    await sub.test(
      "Falls back to ROOT if journeyId missing for RESULTS",
      () => {
        const req: MockRequest = { params: {} };
        assert.strictEqual(getPagePath.call(req, Page.RESULTS), "/base/app/");
      },
    );

    await sub.test(
      "Falls back to ROOT if journeyId missing for NO_RESULTS_FOUND",
      () => {
        const req: MockRequest = { params: {} };
        assert.strictEqual(
          getPagePath.call(req, Page.NO_RESULTS_FOUND),
          "/base/app/",
        );
      },
    );

    await sub.test("Handles unknown default page branch safely", () => {
      const req: MockRequest = { params: { journeyId: "j-123" } };
      assert.strictEqual(
        getPagePath.call(req, "UNKNOWN" as Page),
        "/base/app/",
      );
    });
  });

  await t.test(
    "Strips trailing slashes from CONTEXT_PATH securely",
    async () => {
      const localDecorators: Record<string, DecoratorMethod> = {};
      const slashFastify = {
        config: { CONTEXT_PATH: "/trailing/" }, // Testing trailing slash
        decorateRequest(name: string, fn: DecoratorMethod) {
          localDecorators[name] = fn;
        },
      };

      await pagePathPlugin(slashFastify as never, {});
      const req: MockRequest = { params: { journeyId: "j-123" } };

      assert.strictEqual(
        localDecorators["getPagePath"].call(req, Page.SEARCH),
        "/trailing/j-123/search",
      );
    },
  );
});
