import type { FastifyPluginAsync } from "fastify";
import { Page } from "../../types/page.js";

interface SearchBody {
  Body: { searchTerm: string };
}

const searchRoute: FastifyPluginAsync = async (fastify) => {
  // 1. Entry route does NOT have :journeyId
  fastify.get("/search", async (request, reply) => {
    return reply.view("search.njk", {
      formAction: request.getPagePath(Page.SEARCH),
    });
  });

  // 2. Submission route generates the ID!
  fastify.post<SearchBody>("/search", async (request, reply) => {
    const { searchTerm } = request.body;

    // This generates the UUID and saves the session context securely
    const journeyId = request.createJourney({ searchTerm });

    const isValidEntity = searchTerm === "123" || searchTerm === "456";

    // We pass our dynamically generated journeyId into the path builder
    if (isValidEntity) {
      return reply.redirect(request.getPagePath(Page.RESULTS, journeyId));
    } else {
      return reply.redirect(
        request.getPagePath(Page.NO_RESULTS_FOUND, journeyId),
      );
    }
  });
};

export default searchRoute;
