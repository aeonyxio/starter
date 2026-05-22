import type { FastifyPluginAsync } from "fastify";

interface SearchBody {
  Body: { searchId: string };
}

const searchRoute: FastifyPluginAsync = async (fastify) => {
  // Renders the Search form
  fastify.get("/:journeyId/search", async (request, reply) => {
    // The journeyId validation is AUTOMATICALLY injected here by our plugin!
    const params = request.params as { journeyId: string };

    // Using Nunjucks or similar view engine
    return reply.view("search.njk", { journeyId: params.journeyId });
  });

  // Handles the form submission
  fastify.post<SearchBody>("/:journeyId/search", async (request, reply) => {
    const params = request.params as { journeyId: string };
    const { searchId } = request.body;

    // Simulate database lookup
    const isValidEntity = searchId === "123" || searchId === "456";

    // No need to pass journeyId, it's inferred from request.params!
    request.setJourneyData({ searchId });

    if (!isValidEntity) {
      return reply.redirect(`/${params.journeyId}/notFound`);
    }

    return reply.redirect(`/${params.journeyId}/results`);
  });
};

export default searchRoute;
