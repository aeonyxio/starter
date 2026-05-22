import type { FastifyPluginAsync } from "fastify";
import { Page } from "../../types/page.js";

const resultsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/results", async (request, reply) => {
    // Both effortlessly fall back to checking the path params
    const journeyId = request.getJourneyId();
    const journey = request.getJourneyData();

    if (!journey) {
      // If ghost tab expired, send them back to the start gateway
      return reply.redirect(request.getPagePath(Page.SEARCH));
    }

    return reply.view("results.njk", {
      journeyId,
      searchTerm: journey.searchTerm,
      finishUrl: request.getPagePath(Page.SEARCH),
    });
  });
};

export default resultsRoute;
