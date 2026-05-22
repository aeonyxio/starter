import type { FastifyPluginAsync } from "fastify";
import { JourneyNavigator, JourneyStep } from "./navigator.js";

const resultsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/results", async (request, reply) => {
    const params = request.params as { journeyId: string };
    const journey = request.getJourneyData();

    // 1. Validate State
    if (!journey || !journey.searchId) {
      const fallbackPath = JourneyNavigator.getNextPath(
        JourneyStep.RESULTS,
        { isSessionExpired: true },
        params.journeyId,
      );
      return reply.redirect(fallbackPath);
    }

    // 2. Render
    const finishActionUrl = JourneyNavigator.getPath(
      JourneyStep.FINISH,
      params.journeyId,
    );

    return reply.view("results.njk", {
      journeyId: params.journeyId,
      searchId: journey.searchId,
      finishAction: finishActionUrl,
    });
  });

  // Dedicated finish endpoint to cleanly destroy the session
  fastify.post("/:journeyId/finish", async (request, reply) => {
    const params = request.params as { journeyId: string };

    request.deleteJourneyData();

    // Will return the user to the start ( / )
    const endPath = JourneyNavigator.getPath(JourneyStep.FINISH);

    return reply.redirect(endPath);
  });
};

export default resultsRoute;
