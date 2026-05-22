import test from "node:test";
import assert from "node:assert";
import { journeyPlugin } from "./journey-plugin.js";
import type { JourneyData } from "../types/page.js";

interface MockSession {
  journeyContext: Record<
    string,
    { payload: JourneyData; lastAccessed: number }
  >;
  modified?: boolean;
}
interface MockRequest {
  params: { journeyId?: string };
  session: MockSession;
  getJourneyId: () => string | undefined;
  setJourneyData?: unknown;
}

test("Journey Plugin - Decorators & Overrides", async (t) => {
  const decorators: Record<string, (...args: never[]) => unknown> = {};
  const mockFastify = {
    decorateRequest(name: string, fn: never) {
      decorators[name] = fn;
    },
    addHook() {},
  };

  await journeyPlugin(mockFastify as never, {});

  const createJourney = decorators["createJourney"] as (
    this: MockRequest,
    p: JourneyData,
  ) => string;
  const getJourneyId = decorators["getJourneyId"] as (
    this: MockRequest,
  ) => string | undefined;
  const getJourneyData = decorators["getJourneyData"] as (
    this: MockRequest,
    opt?: string,
  ) => JourneyData | undefined;

  const req: MockRequest = {
    params: { journeyId: "path-123" },
    session: { journeyContext: {} },
    getJourneyId: function () {
      return getJourneyId.call(this);
    },
  };

  await t.test("createJourney generates UUID and stores data", () => {
    const newId = createJourney.call(req, { searchTerm: "foo" });
    assert.ok(newId.length > 20); // Basic UUID check
    assert.strictEqual(
      req.session.journeyContext[newId].payload.searchTerm,
      "foo",
    );
    assert.strictEqual(req.session.modified, true);
  });

  await t.test("getJourneyId returns from params", () => {
    assert.strictEqual(getJourneyId.call(req), "path-123");
  });

  await t.test(
    "getJourneyData uses explicit override instead of path param",
    () => {
      req.session.journeyContext["override-123"] = {
        lastAccessed: Date.now(),
        payload: { searchTerm: "bar" },
      };

      // By passing 'override-123', it ignores 'path-123' mapped in req.params
      const result = getJourneyData.call(req, "override-123");
      assert.strictEqual(result?.searchTerm, "bar");
    },
  );
});
