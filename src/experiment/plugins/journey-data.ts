import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, RouteOptions } from "fastify";
import { randomUUID } from "node:crypto";
import type { JourneyData } from "../types/page.js";

export interface JourneyWrapper {
  lastAccessed: number;
  payload: JourneyData;
}

declare module "@fastify/session" {
  interface FastifySessionObject {
    journeyContext: Record<string, JourneyWrapper>; // Updated name
    modified?: boolean;
  }
}

export const TAB_TTL_MS = 30 * 60 * 1000;

const journeyPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions: RouteOptions) => {
    if (routeOptions.url.includes(":journeyId")) {
      const schema = routeOptions.schema ?? {};
      const existingParams = (schema.params ?? {}) as Record<string, unknown>;
      const existingProps = (existingParams.properties ?? {}) as Record<
        string,
        unknown
      >;
      const existingReq = (
        Array.isArray(existingParams.required) ? existingParams.required : []
      ) as string[];

      schema.params = {
        ...existingParams,
        type: "object",
        properties: {
          ...existingProps,
          journeyId: {
            type: "string",
            pattern: "^[a-zA-Z0-9-]+$",
            maxLength: 36,
          },
        },
        required: Array.from(new Set([...existingReq, "journeyId"])),
      };
      routeOptions.schema = schema;
    }
  });

  fastify.addHook("preHandler", async (request: FastifyRequest) => {
    if (!request.session.journeyContext) {
      request.session.journeyContext = {};
      request.session.modified = true;
    }
    const now = Date.now();
    let hasDeleted = false;
    for (const [id, wrapper] of Object.entries(
      request.session.journeyContext,
    )) {
      if (now - wrapper.lastAccessed > TAB_TTL_MS) {
        delete request.session.journeyContext[id];
        hasDeleted = true;
      }
    }
    if (hasDeleted) request.session.modified = true;
  });

  fastify.decorateRequest("getJourneyId", function (this: FastifyRequest):
    | string
    | undefined {
    const params = this.params as { journeyId?: string };
    return params?.journeyId;
  });

  fastify.decorateRequest(
    "createJourney",
    function (this: FastifyRequest, payload: JourneyData): string {
      const journeyId = randomUUID();
      this.session.journeyContext[journeyId] = {
        lastAccessed: Date.now(),
        payload,
      };
      this.session.modified = true;
      return journeyId;
    },
  );

  fastify.decorateRequest(
    "getJourneyData",
    function (this: FastifyRequest, optId?: string) {
      const journeyId = optId || this.getJourneyId();
      if (!journeyId) return undefined;
      const wrapper = this.session.journeyContext[journeyId];
      if (!wrapper) return undefined;
      wrapper.lastAccessed = Date.now();
      this.session.modified = true;
      return wrapper.payload;
    },
  );

  fastify.decorateRequest(
    "setJourneyData",
    function (this: FastifyRequest, payload: JourneyData, optId?: string) {
      const journeyId = optId || this.getJourneyId();
      if (!journeyId) return;
      this.session.journeyContext[journeyId] = {
        lastAccessed: Date.now(),
        payload,
      };
      this.session.modified = true;
    },
  );

  fastify.decorateRequest(
    "updateJourneyData",
    function (
      this: FastifyRequest,
      payload: Partial<JourneyData>,
      optId?: string,
    ) {
      const journeyId = optId || this.getJourneyId();
      if (!journeyId) return;
      const wrapper = this.session.journeyContext[journeyId];
      if (wrapper) {
        wrapper.payload = { ...wrapper.payload, ...payload };
        wrapper.lastAccessed = Date.now();
        this.session.modified = true;
      } else {
        this.setJourneyData(payload as JourneyData, journeyId);
      }
    },
  );

  fastify.decorateRequest(
    "deleteJourneyData",
    function (this: FastifyRequest, optId?: string) {
      const journeyId = optId || this.getJourneyId();
      if (!journeyId) return;
      if (this.session.journeyContext[journeyId]) {
        delete this.session.journeyContext[journeyId];
        this.session.modified = true;
      }
    },
  );
};

export const journeyPlugin = fp(journeyPluginAsync);
