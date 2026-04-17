export type GuardPlan = "free" | "early_access" | "paid" | "admin";
export type GuardStatus = "not_started" | "in_progress" | "completed" | "failed";

export type GuardUsage = {
  generationStatus: GuardStatus;
  lifetimeDesignGenerations: number;
  hasGeneratedProjectEver: boolean;
};

export function isOutOfGenerationCredits(usage: Pick<GuardUsage, "lifetimeDesignGenerations" | "hasGeneratedProjectEver">, maxLifetimeDesignGenerations: number) {
  return usage.hasGeneratedProjectEver || usage.lifetimeDesignGenerations >= maxLifetimeDesignGenerations;
}

export function evaluateGenerationReservationState(input: {
  plan: GuardPlan;
  usage: GuardUsage;
  maxLifetimeDesignGenerations: number;
}) {
  if (input.usage.generationStatus === "in_progress") return { allowed: false as const, reason: "in_progress" as const };
  if (input.plan === "free" && isOutOfGenerationCredits(input.usage, input.maxLifetimeDesignGenerations)) {
    return { allowed: false as const, reason: "limit_reached" as const };
  }
  return { allowed: true as const };
}
