import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { Page } from "./types/page.js";

const pagePathPluginAsync: FastifyPluginAsync = async (fastify) => {
  // 1. Context validation (fail fast if config isn't loaded)
  if (!fastify.config || typeof fastify.config.CONTEXT_PATH !== "string") {
    throw new Error(
      "fastify.config.CONTEXT_PATH must be defined before registering pagePathPlugin",
    );
  }

  // 2. Ensure context path is cleanly formatted (no trailing slash)
  const contextPath = fastify.config.CONTEXT_PATH.replace(/\/$/, "");

  // 3. Register the decorator
  fastify.decorateRequest(
    "getPagePath",
    function (this: FastifyRequest, page: Page): string {
      const params = this.params as { journeyId?: string };
      const journeyId = params?.journeyId;

      switch (page) {
        case Page.ROOT:
          return `${contextPath}/`;

        case Page.SEARCH:
          if (!journeyId) return `${contextPath}/`;
          return `${contextPath}/${journeyId}/search`;

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
