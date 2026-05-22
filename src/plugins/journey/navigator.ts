export enum JourneyStep {
  START = "START",
  SEARCH = "SEARCH",
  RESULTS = "RESULTS",
  NOT_FOUND = "NOT_FOUND",
  FINISH = "FINISH",
}

export interface NavigationContext {
  isValidEntity?: boolean;
  isSessionExpired?: boolean;
}

export class JourneyNavigator {
  /**
   * Generates the absolute URL path for a specific step.
   * Eliminates hardcoded URL strings across the app.
   */
  public static getPath(step: JourneyStep, journeyId?: string): string {
    switch (step) {
      case JourneyStep.START:
        return "/"; // Entry point creates a new journeyId
      case JourneyStep.SEARCH:
        return `/${journeyId}/search`;
      case JourneyStep.RESULTS:
        return `/${journeyId}/results`;
      case JourneyStep.NOT_FOUND:
        return `/${journeyId}/notFound`;
      case JourneyStep.FINISH:
        return "/";
      default:
        return "/";
    }
  }

  /**
   * Computes the NEXT path based on the CURRENT step and business context.
   */
  public static getNextPath(
    currentStep: JourneyStep,
    context: NavigationContext,
    journeyId: string,
  ): string {
    const nextStep = this.computeNextStep(currentStep, context);
    return this.getPath(nextStep, journeyId);
  }

  /**
   * The pure State Machine logic. Highly testable in isolation.
   */
  private static computeNextStep(
    currentStep: JourneyStep,
    context: NavigationContext,
  ): JourneyStep {
    switch (currentStep) {
      case JourneyStep.SEARCH:
        if (context.isValidEntity) {
          return JourneyStep.RESULTS;
        }
        return JourneyStep.NOT_FOUND;

      case JourneyStep.RESULTS:
      case JourneyStep.NOT_FOUND:
        if (context.isSessionExpired) {
          return JourneyStep.SEARCH;
        }
        return JourneyStep.FINISH;

      default:
        return JourneyStep.START;
    }
  }
}
