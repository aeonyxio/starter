import type { FastifyPluginAsync } from "fastify";
import { Page } from "./types/page.js";

interface SearchBody {
  Body: { searchId: string };
}

const searchRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:journeyId/search", async (request, reply) => {
    const params = request.params as { journeyId: string };

    return reply.view("search.njk", {
      journeyId: params.journeyId,
      formAction: request.getPagePath(Page.SEARCH),
    });
  });

  fastify.post<SearchBody>("/:journeyId/search", async (request, reply) => {
    const { searchId } = request.body;
    request.setJourneyData({ searchId });

    const isValidEntity = searchId === "123" || searchId === "456";

    if (isValidEntity) {
      return reply.redirect(request.getPagePath(Page.RESULTS));
    } else {
      return reply.redirect(request.getPagePath(Page.NO_RESULTS_FOUND));
    }
  });
};

export default searchRoute;
