import type { FastifyPluginAsync } from "fastify";
import { Page } from "../../types/page.js";

const noResultsFoundRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/no-results-found", async (request, reply) => {
    const journeyId = request.getJourneyId();
    const journey = request.getJourneyData();

    if (!journey) {
      return reply.redirect(request.getPagePath(Page.SEARCH));
    }

    return reply.view("no-results-found.njk", {
      journeyId,
      attemptedSearchTerm: journey.searchTerm,
      backToSearchUrl: request.getPagePath(Page.SEARCH),
    });
  });
};

export default noResultsFoundRoute;
