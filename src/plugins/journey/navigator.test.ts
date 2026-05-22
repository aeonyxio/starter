import test from "node:test";
import assert from "node:assert";
import {
  JourneyNavigator,
  JourneyStep,
  type NavigationContext,
} from "./navigator.js";

test("JourneyNavigator - Pure Unit Tests", async (t) => {
  const mockJourneyId = "j-12345";

  await t.test(
    "getPath(): generates correct absolute paths for each step",
    async (sub) => {
      await sub.test("returns root path for START", () => {
        const path = JourneyNavigator.getPath(JourneyStep.START, mockJourneyId);
        assert.strictEqual(path, "/");
      });

      await sub.test("returns specific path for SEARCH", () => {
        const path = JourneyNavigator.getPath(
          JourneyStep.SEARCH,
          mockJourneyId,
        );
        assert.strictEqual(path, "/j-12345/search");
      });

      await sub.test("returns specific path for RESULTS", () => {
        const path = JourneyNavigator.getPath(
          JourneyStep.RESULTS,
          mockJourneyId,
        );
        assert.strictEqual(path, "/j-12345/results");
      });

      await sub.test("returns specific path for NOT_FOUND", () => {
        const path = JourneyNavigator.getPath(
          JourneyStep.NOT_FOUND,
          mockJourneyId,
        );
        assert.strictEqual(path, "/j-12345/notFound");
      });

      await sub.test("returns root path for FINISH", () => {
        const path = JourneyNavigator.getPath(
          JourneyStep.FINISH,
          mockJourneyId,
        );
        assert.strictEqual(path, "/");
      });

      await sub.test(
        "returns root path for an unknown step (default branch)",
        () => {
          // Bypassing TypeScript strictly for this one test to guarantee 100% branch coverage
          // on the `default:` fallback inside the getPath switch statement.
          const unknownStep = "UNKNOWN_STEP" as unknown as JourneyStep;
          const path = JourneyNavigator.getPath(unknownStep, mockJourneyId);
          assert.strictEqual(path, "/");
        },
      );
    },
  );

  await t.test(
    "getNextPath(): computes correct next step based on state machine rules",
    async (sub) => {
      // --- Transitions from SEARCH ---
      await sub.test("SEARCH -> RESULTS (when entity is valid)", () => {
        const context: NavigationContext = { isValidEntity: true };
        const nextPath = JourneyNavigator.getNextPath(
          JourneyStep.SEARCH,
          context,
          mockJourneyId,
        );

        // We expect it to route to RESULTS
        assert.strictEqual(nextPath, "/j-12345/results");
      });

      await sub.test(
        "SEARCH -> NOT_FOUND (when entity is invalid/missing)",
        () => {
          const context: NavigationContext = { isValidEntity: false };
          const nextPath = JourneyNavigator.getNextPath(
            JourneyStep.SEARCH,
            context,
            mockJourneyId,
          );

          // We expect it to route to NOT_FOUND
          assert.strictEqual(nextPath, "/j-12345/notFound");
        },
      );

      // --- Transitions from RESULTS ---
      await sub.test("RESULTS -> SEARCH (when session is expired)", () => {
        const context: NavigationContext = { isSessionExpired: true };
        const nextPath = JourneyNavigator.getNextPath(
          JourneyStep.RESULTS,
          context,
          mockJourneyId,
        );

        // Routes back to search to restart the flow
        assert.strictEqual(nextPath, "/j-12345/search");
      });

      await sub.test("RESULTS -> FINISH (when session is active)", () => {
        const context: NavigationContext = { isSessionExpired: false };
        const nextPath = JourneyNavigator.getNextPath(
          JourneyStep.RESULTS,
          context,
          mockJourneyId,
        );

        // Routes to FINISH, which maps to '/'
        assert.strictEqual(nextPath, "/");
      });

      // --- Transitions from NOT_FOUND ---
      await sub.test("NOT_FOUND -> SEARCH (when session is expired)", () => {
        const context: NavigationContext = { isSessionExpired: true };
        const nextPath = JourneyNavigator.getNextPath(
          JourneyStep.NOT_FOUND,
          context,
          mockJourneyId,
        );

        assert.strictEqual(nextPath, "/j-12345/search");
      });

      await sub.test("NOT_FOUND -> FINISH (when session is active)", () => {
        const context: NavigationContext = { isSessionExpired: false };
        const nextPath = JourneyNavigator.getNextPath(
          JourneyStep.NOT_FOUND,
          context,
          mockJourneyId,
        );

        assert.strictEqual(nextPath, "/");
      });

      // --- Transitions from other states (Default Branch) ---
      await sub.test(
        "START -> START (fallback for unhandled source steps)",
        () => {
          const context: NavigationContext = {};
          const nextPath = JourneyNavigator.getNextPath(
            JourneyStep.START,
            context,
            mockJourneyId,
          );

          // Default rule returns JourneyStep.START, which maps to '/'
          assert.strictEqual(nextPath, "/");
        },
      );

      await sub.test(
        "FINISH -> START (fallback for unhandled source steps)",
        () => {
          const context: NavigationContext = {};
          const nextPath = JourneyNavigator.getNextPath(
            JourneyStep.FINISH,
            context,
            mockJourneyId,
          );

          assert.strictEqual(nextPath, "/");
        },
      );
    },
  );
});
