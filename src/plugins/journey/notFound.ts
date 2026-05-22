import type { FastifyPluginAsync } from "fastify";

const notFoundRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/notFound", async (request, reply) => {
    const params = request.params as { journeyId: string };
    const journey = request.getJourneyData();

    return reply.view("notFound.njk", {
      journeyId: params.journeyId,
      attemptedSearchId: journey?.searchId ?? "Unknown",
    });
  });
};

export default notFoundRoute;
