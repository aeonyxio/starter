import type { FastifyPluginAsync } from "fastify";
import { JourneyNavigator, JourneyStep } from "./navigator.js";

const notFoundRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/notFound", async (request, reply) => {
    const params = request.params as { journeyId: string };
    const journey = request.getJourneyData();

    // Generate 'Try Again' link dynamically via Navigator
    const backToSearchUrl = JourneyNavigator.getPath(
      JourneyStep.SEARCH,
      params.journeyId,
    );

    return reply.view("notFound.njk", {
      journeyId: params.journeyId,
      attemptedSearchId: journey?.searchId ?? "Unknown",
      backToSearchUrl,
    });
  });
};

export default notFoundRoute;
