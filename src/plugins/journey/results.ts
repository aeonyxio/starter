import type { FastifyPluginAsync } from "fastify";

const resultsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/results", async (request, reply) => {
    const params = request.params as { journeyId: string };

    // Automatically fetches data for the CURRENT journeyId in the path
    const journey = request.getJourneyData();

    if (!journey || !journey.searchId) {
      // If session expired or was never set, restart journey
      return reply.redirect(`/${params.journeyId}/search`);
    }

    return reply.view("results.njk", {
      journeyId: params.journeyId,
      searchId: journey.searchId,
    });
  });

  // Example of using delete route at the end of a journey
  fastify.post("/:journeyId/finish", async (request, reply) => {
    // Cleans up memory manually when the user explicitly finishes
    request.deleteJourneyData();
    return reply.redirect("/"); // Start entirely new journey
  });
};

export default resultsRoute;
