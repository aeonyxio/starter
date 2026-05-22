import "fastify";

export enum Page {
  ROOT = "ROOT",
  SEARCH = "SEARCH",
  RESULTS = "RESULTS",
  NO_RESULTS_FOUND = "NO_RESULTS_FOUND",
}

declare module "fastify" {
  interface FastifyInstance {
    config: {
      CONTEXT_PATH: string;
    };
  }

  interface FastifyRequest {
    getPagePath(page: Page): string;
  }
}
