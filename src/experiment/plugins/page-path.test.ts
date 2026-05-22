import test from "node:test";
import assert from "node:assert";
import { pagePathPlugin } from "./page-path-plugin.js";
import { Page } from "../types/page.js";

interface MockRequest {
  params: { journeyId?: string };
}
type DecoratorMethod = (
  this: MockRequest,
  page: Page,
  optJourneyId?: string,
) => string;

test("Page Path Plugin - Pure Unit Tests", async (t) => {
  const decorators: Record<string, DecoratorMethod> = {};
  const mockFastify = {
    config: { CONTEXT_PATH: "/app" },
    decorateRequest(name: string, fn: DecoratorMethod) {
      decorators[name] = fn;
    },
  };
  await pagePathPlugin(mockFastify as never, {});
  const getPagePath = decorators["getPagePath"];

  await t.test("SEARCH ignores journeyId (Entry Point)", () => {
    const req: MockRequest = { params: { journeyId: "should-ignore" } };
    assert.strictEqual(getPagePath.call(req, Page.SEARCH), "/app/search");
  });

  await t.test("RESULTS uses optional override ID", () => {
    const req: MockRequest = { params: { journeyId: "old-id" } };
    assert.strictEqual(
      getPagePath.call(req, Page.RESULTS, "new-id"),
      "/app/new-id/results",
    );
  });

  await t.test("RESULTS falls back to path param ID", () => {
    const req: MockRequest = { params: { journeyId: "path-id" } };
    assert.strictEqual(
      getPagePath.call(req, Page.RESULTS),
      "/app/path-id/results",
    );
  });

  await t.test("Missing IDs fall back to ROOT for protected routes", () => {
    const req: MockRequest = { params: {} };
    assert.strictEqual(getPagePath.call(req, Page.RESULTS), "/app/");
    assert.strictEqual(getPagePath.call(req, Page.NO_RESULTS_FOUND), "/app/");
  });
});
