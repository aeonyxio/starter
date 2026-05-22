import type { FastifyPluginAsync } from "fastify";
import { Page } from "./types/page.js";

const noResultsFoundRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/no-results-found", async (request, reply) => {
    const params = request.params as { journeyId: string };
    const journey = request.getJourneyData();

    return reply.view("no-results-found.njk", {
      journeyId: params.journeyId,
      attemptedSearchId: journey?.searchId ?? "Unknown",
      backToSearchUrl: request.getPagePath(Page.SEARCH),
    });
  });
};

export default noResultsFoundRoute;
