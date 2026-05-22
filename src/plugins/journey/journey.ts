import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

// Added a property to demonstrate updating session state
export interface JourneyPayload {
  searchId?: string;
  step?: number;
}

export interface JourneyWrapper {
  lastAccessed: number;
  payload: JourneyPayload;
}

declare module "@fastify/session" {
  interface FastifySessionObject {
    journeyData: Record<string, JourneyWrapper>;
    // Explicitly defining this allows us to force-save deep object mutations
    modified?: boolean;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    getJourney(tabId: string): JourneyPayload | undefined;
    setJourney(tabId: string, payload: JourneyPayload): void;
    updateJourney(tabId: string, payload: Partial<JourneyPayload>): void;
  }
}

export const TAB_TTL_MS = 30 * 60 * 1000; // 30 minutes exported for tests

export const journeyPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest("getJourney", function (tabId: string) {
    const wrapper = this.session.journeyData[tabId];
    if (!wrapper) return undefined;

    wrapper.lastAccessed = Date.now();
    this.session.modified = true; // Force save to persist the new timestamp
    return wrapper.payload;
  });

  fastify.decorateRequest(
    "setJourney",
    function (tabId: string, payload: JourneyPayload) {
      this.session.journeyData[tabId] = {
        lastAccessed: Date.now(),
        payload,
      };
      this.session.modified = true; // Force save new data
    },
  );

  fastify.decorateRequest(
    "updateJourney",
    function (tabId: string, payload: Partial<JourneyPayload>) {
      const wrapper = this.session.journeyData[tabId];
      if (wrapper) {
        // Merge new data with existing data
        wrapper.payload = { ...wrapper.payload, ...payload };
        wrapper.lastAccessed = Date.now();

        // DEMONSTRATION OF SAVE:
        // Because we altered a nested property inside journeyData, we MUST set
        // modified = true to tell the session store to persist this update.
        this.session.modified = true;
      } else {
        // Fallback: If it doesn't exist, create it.
        this.setJourney(tabId, payload as JourneyPayload);
      }
    },
  );

  fastify.addHook("preHandler", async (request) => {
    // 1. Guaranteed Initialization
    if (!request.session.journeyData) {
      request.session.journeyData = {};
      request.session.modified = true;
    }

    const now = Date.now();
    let hasDeleted = false;

    // 2. Lazy Garbage Collection
    for (const [tabId, wrapper] of Object.entries(
      request.session.journeyData,
    )) {
      if (now - wrapper.lastAccessed > TAB_TTL_MS) {
        delete request.session.journeyData[tabId];
        hasDeleted = true;
      }
    }

    // 3. Only save if we actually pruned something
    if (hasDeleted) {
      request.session.modified = true;
    }
  });
});
