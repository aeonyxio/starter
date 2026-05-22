import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, RouteOptions } from "fastify";

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
    modified?: boolean;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    getJourneyData(): JourneyPayload | undefined;
    setJourneyData(payload: JourneyPayload): void;
    updateJourneyData(payload: Partial<JourneyPayload>): void;
    deleteJourneyData(): void;
  }
}

export const TAB_TTL_MS = 30 * 60 * 1000;

const journeyPluginAsync: FastifyPluginAsync = async (fastify) => {
  // --- 1. AUTOMATIC PATH PARAM VALIDATION ---
  fastify.addHook("onRoute", (routeOptions: RouteOptions) => {
    if (routeOptions.url.includes(":journeyId")) {
      const schema = routeOptions.schema ?? {};
      const existingParams = (schema.params ?? {}) as Record<string, unknown>;
      const existingProperties = (existingParams.properties ?? {}) as Record<
        string,
        unknown
      >;
      const existingRequired = (
        Array.isArray(existingParams.required) ? existingParams.required : []
      ) as string[];

      schema.params = {
        ...existingParams,
        type: "object",
        properties: {
          ...existingProperties,
          // Reject any bad characters. Allow only standard UUID/Alphanumeric formats
          journeyId: {
            type: "string",
            pattern: "^[a-zA-Z0-9-]+$",
            maxLength: 36,
          },
        },
        required: Array.from(new Set([...existingRequired, "journeyId"])),
      };

      routeOptions.schema = schema;
    }
  });

  // --- 2. GARBAGE COLLECTION HOOK ---
  fastify.addHook("preHandler", async (request: FastifyRequest) => {
    if (!request.session.journeyData) {
      request.session.journeyData = {};
      request.session.modified = true;
    }

    const now = Date.now();
    let hasDeleted = false;

    for (const [id, wrapper] of Object.entries(request.session.journeyData)) {
      if (now - wrapper.lastAccessed > TAB_TTL_MS) {
        delete request.session.journeyData[id];
        hasDeleted = true;
      }
    }

    if (hasDeleted) {
      request.session.modified = true;
    }
  });

  // --- 3. CONTEXT-AWARE DECORATORS ---

  fastify.decorateRequest("getJourneyData", function (this: FastifyRequest) {
    const params = this.params as { journeyId?: string };
    if (!params.journeyId) return undefined;

    const wrapper = this.session.journeyData[params.journeyId];
    if (!wrapper) return undefined;

    wrapper.lastAccessed = Date.now();
    this.session.modified = true;
    return wrapper.payload;
  });

  fastify.decorateRequest(
    "setJourneyData",
    function (this: FastifyRequest, payload: JourneyPayload) {
      const params = this.params as { journeyId?: string };
      if (!params.journeyId) return;

      this.session.journeyData[params.journeyId] = {
        lastAccessed: Date.now(),
        payload,
      };
      this.session.modified = true;
    },
  );

  fastify.decorateRequest(
    "updateJourneyData",
    function (this: FastifyRequest, payload: Partial<JourneyPayload>) {
      const params = this.params as { journeyId?: string };
      if (!params.journeyId) return;

      const wrapper = this.session.journeyData[params.journeyId];
      if (wrapper) {
        wrapper.payload = { ...wrapper.payload, ...payload };
        wrapper.lastAccessed = Date.now();
        this.session.modified = true;
      } else {
        this.setJourneyData(payload as JourneyPayload);
      }
    },
  );

  fastify.decorateRequest("deleteJourneyData", function (this: FastifyRequest) {
    const params = this.params as { journeyId?: string };
    if (!params.journeyId) return;

    if (this.session.journeyData[params.journeyId]) {
      delete this.session.journeyData[params.journeyId];
      this.session.modified = true;
    }
  });
};

export const journeyPlugin = fp(journeyPluginAsync);
