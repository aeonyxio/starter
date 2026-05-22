import "fastify";

export enum Page {
  ROOT = "ROOT",
  SEARCH = "SEARCH", // Now acts as the gateway (no ID)
  RESULTS = "RESULTS",
  NO_RESULTS_FOUND = "NO_RESULTS_FOUND",
}

export interface JourneyData {
  searchTerm?: string;
  step?: number;
}

declare module "fastify" {
  interface FastifyInstance {
    config: {
      CONTEXT_PATH: string;
    };
  }

  interface FastifyRequest {
    getPagePath(page: Page, journeyId?: string): string;

    // New Journey Decorators
    createJourney(payload: JourneyData): string;
    getJourneyId(): string | undefined;
    getJourneyData(journeyId?: string): JourneyData | undefined;
    setJourneyData(payload: JourneyData, journeyId?: string): void;
    updateJourneyData(payload: Partial<JourneyData>, journeyId?: string): void;
    deleteJourneyData(journeyId?: string): void;
  }
}
