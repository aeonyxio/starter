import test from "node:test";
import assert from "node:assert";
import { journeyPlugin, TAB_TTL_MS, type JourneyPayload } from "./journey.js";

// Strict typing for our Mocks to avoid `any` or `Function`
interface MockRouteOptions {
  url: string;
  schema?: Record<string, unknown>;
}

interface MockSession {
  journeyData: Record<
    string,
    { lastAccessed: number; payload: JourneyPayload }
  >;
  modified?: boolean;
}

interface MockRequest {
  params: { journeyId?: string };
  session: MockSession;
  setJourneyData?: (payload: JourneyPayload) => void;
}

type DecoratorMethod = (this: MockRequest, payload?: unknown) => unknown;
type PreHandlerMethod = (request: MockRequest) => Promise<void>;
type OnRouteMethod = (routeOptions: MockRouteOptions) => void;

test("Journey Plugin - Pure Unit Tests (Strict Types)", async (t) => {
  const decorators: Record<string, DecoratorMethod> = {};
  const hooks: Record<string, unknown> = {};

  const mockFastify = {
    decorateRequest(name: string, fn: DecoratorMethod) {
      decorators[name] = fn;
    },
    addHook(name: string, fn: unknown) {
      hooks[name] = fn;
    },
  };

  await journeyPlugin(mockFastify as never, {});

  const onRouteHook = hooks["onRoute"] as OnRouteMethod;
  const preHandlerHook = hooks["preHandler"] as PreHandlerMethod;

  await t.test(
    "onRoute: injects journeyId validation for matching routes",
    () => {
      const routeOptions: MockRouteOptions = { url: "/foo/:journeyId/bar" };
      onRouteHook(routeOptions);

      const schema = routeOptions.schema as Record<string, unknown>;
      const params = schema.params as Record<string, unknown>;
      const properties = params.properties as Record<string, { type: string }>;
      const required = params.required as string[];

      assert.strictEqual(properties["journeyId"].type, "string");
      assert.ok(required.includes("journeyId"));
    },
  );

  await t.test("onRoute: ignores routes without journeyId", () => {
    const routeOptions: MockRouteOptions = { url: "/foo/bar" };
    onRouteHook(routeOptions);
    assert.strictEqual(routeOptions.schema, undefined);
  });

  const createReq = (journeyId?: string, sessionData = {}): MockRequest => ({
    params: journeyId ? { journeyId } : {},
    session: { journeyData: sessionData },
    setJourneyData: decorators["setJourneyData"] as (
      payload: JourneyPayload,
    ) => void,
  });

  await t.test("preHandler: Initializes journeyData", async () => {
    const req = { session: {} } as MockRequest;
    await preHandlerHook(req);
    assert.deepStrictEqual(req.session.journeyData, {});
  });

  await t.test("preHandler: Deletes expired tabs", async () => {
    const now = Date.now();
    const req = createReq("id", {
      expired: { lastAccessed: now - TAB_TTL_MS - 1000, payload: {} },
      active: { lastAccessed: now, payload: {} },
    });

    await preHandlerHook(req);
    assert.strictEqual(req.session.journeyData["expired"], undefined);
    assert.ok(req.session.journeyData["active"]);
    assert.strictEqual(req.session.modified, true);
  });

  await t.test("Decorators: setJourneyData & getJourneyData", () => {
    const req = createReq("j-123");
    const setFn = decorators["setJourneyData"];
    const getFn = decorators["getJourneyData"];

    setFn.call(req, { searchId: "foo" });
    assert.strictEqual(
      req.session.journeyData["j-123"].payload.searchId,
      "foo",
    );
    assert.strictEqual(req.session.modified, true);

    const result = getFn.call(req) as JourneyPayload;
    assert.strictEqual(result.searchId, "foo");
  });

  await t.test("Decorators: deleteJourneyData", () => {
    const req = createReq("j-123", {
      "j-123": { lastAccessed: Date.now(), payload: { searchId: "foo" } },
    });

    const delFn = decorators["deleteJourneyData"];
    delFn.call(req);

    assert.strictEqual(req.session.journeyData["j-123"], undefined);
    assert.strictEqual(req.session.modified, true);
  });
});
