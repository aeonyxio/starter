import test from "node:test";
import assert from "node:assert";
import { journeyPlugin, TAB_TTL_MS } from "./journey-plugin";

test("Journey Plugin - Pure Unit Tests", async (t) => {
  // 1. Setup Mock Fastify Container
  const decorators: Record<string, Function> = {};
  const hooks: Record<string, Function> = {};

  const mockFastify = {
    decorateRequest(name: string, fn: Function) {
      decorators[name] = fn;
    },
    addHook(name: string, fn: Function) {
      hooks[name] = fn;
    },
  };

  // Initialize the plugin (fp wraps the function, so we cast to any for direct execution)
  await journeyPlugin(mockFastify as any, {});

  // --- Test Pre-Handler Hook ---

  await t.test(
    "preHandler: Initializes journeyData if it does not exist",
    async () => {
      const request = { session: {} as any };

      await hooks["preHandler"](request);

      assert.deepStrictEqual(request.session.journeyData, {});
      assert.strictEqual(request.session.modified, true);
    },
  );

  await t.test(
    "preHandler: Does not overwrite existing journeyData",
    async () => {
      const request = {
        session: {
          journeyData: {
            tab1: { lastAccessed: Date.now(), payload: { searchId: "A" } },
          },
        } as any,
      };

      await hooks["preHandler"](request);

      assert.strictEqual(
        request.session.journeyData["tab1"].payload.searchId,
        "A",
      );
      assert.strictEqual(request.session.modified, undefined); // Should not mark modified if nothing changed
    },
  );

  await t.test(
    "preHandler: Deletes expired tabs and marks session as modified",
    async () => {
      const now = Date.now();
      const request = {
        session: {
          journeyData: {
            expiredTab: { lastAccessed: now - TAB_TTL_MS - 1000, payload: {} },
            freshTab: { lastAccessed: now, payload: {} },
          },
        } as any,
      };

      await hooks["preHandler"](request);

      assert.strictEqual(request.session.journeyData["expiredTab"], undefined);
      assert.ok(request.session.journeyData["freshTab"]);
      assert.strictEqual(request.session.modified, true);
    },
  );

  // --- Utility to create a mock Request context ---
  const createMockRequest = (sessionData = {}) => {
    return {
      session: { journeyData: sessionData, modified: false },
      // Wire up setJourney so updateJourney can fallback to calling this.setJourney
      setJourney: decorators["setJourney"],
    };
  };

  // --- Test Decorators ---

  await t.test("setJourney: Sets data and updates modified flag", () => {
    const req = createMockRequest();
    decorators["setJourney"].call(req, "tab1", { searchId: "123" });

    assert.strictEqual(req.session.journeyData["tab1"].payload.searchId, "123");
    assert.ok(req.session.journeyData["tab1"].lastAccessed <= Date.now());
    assert.strictEqual(req.session.modified, true);
  });

  await t.test("getJourney: Returns undefined for missing tabs", () => {
    const req = createMockRequest();
    const result = decorators["getJourney"].call(req, "tabMissing");
    assert.strictEqual(result, undefined);
  });

  await t.test(
    "getJourney: Returns payload, updates lastAccessed, sets modified flag",
    () => {
      const oldTime = Date.now() - 5000;
      const req = createMockRequest({
        tab1: { lastAccessed: oldTime, payload: { searchId: "abc" } },
      });

      const result = decorators["getJourney"].call(req, "tab1");

      assert.strictEqual(result.searchId, "abc");
      assert.ok(req.session.journeyData["tab1"].lastAccessed > oldTime);
      assert.strictEqual(req.session.modified, true);
    },
  );

  await t.test(
    "updateJourney: Updates existing partial payload & modified flag",
    () => {
      const req = createMockRequest({
        tab1: {
          lastAccessed: Date.now() - 5000,
          payload: { searchId: "abc", step: 1 },
        },
      });

      // We are simulating an update where the user reaches step 2
      decorators["updateJourney"].call(req, "tab1", { step: 2 });

      const updated = req.session.journeyData["tab1"].payload;
      assert.strictEqual(updated.searchId, "abc"); // Preserved
      assert.strictEqual(updated.step, 2); // Updated
      assert.strictEqual(req.session.modified, true); // ENSURED SAVED
    },
  );

  await t.test(
    "updateJourney: Falls back to setJourney if tab does not exist",
    () => {
      const req = createMockRequest();

      // updateJourney calls this.setJourney internally if missing
      decorators["updateJourney"].call(req, "newTab", { searchId: "fallback" });

      assert.strictEqual(
        req.session.journeyData["newTab"].payload.searchId,
        "fallback",
      );
      assert.strictEqual(req.session.modified, true);
    },
  );
});
