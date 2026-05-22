import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { Page } from "../types/page.js";

const pagePathPluginAsync: FastifyPluginAsync = async (fastify) => {
  if (!fastify.config || typeof fastify.config.CONTEXT_PATH !== "string") {
    throw new Error(
      "fastify.config.CONTEXT_PATH must be defined before registering pagePathPlugin",
    );
  }

  const contextPath = fastify.config.CONTEXT_PATH.replace(/\/$/, "");

  fastify.decorateRequest(
    "getPagePath",
    function (this: FastifyRequest, page: Page, optJourneyId?: string): string {
      // Falls back to request.params if an explicit ID isn't provided
      const params = this.params as { journeyId?: string };
      const journeyId = optJourneyId || params?.journeyId;

      switch (page) {
        case Page.ROOT:
          return `${contextPath}/`;

        case Page.SEARCH:
          // Search is the entry point, it no longer needs a Journey ID!
          return `${contextPath}/search`;

        case Page.RESULTS:
          if (!journeyId) return `${contextPath}/`;
          return `${contextPath}/${journeyId}/results`;

        case Page.NO_RESULTS_FOUND:
          if (!journeyId) return `${contextPath}/`;
          return `${contextPath}/${journeyId}/no-results-found`;

        default:
          return `${contextPath}/`;
      }
    },
  );
};

export const pagePathPlugin = fp(pagePathPluginAsync);
