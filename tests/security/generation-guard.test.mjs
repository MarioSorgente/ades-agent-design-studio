import test from "node:test";
import assert from "node:assert/strict";

function isOutOfGenerationCredits(usage, maxLifetimeDesignGenerations = 1) {
  return usage.hasGeneratedProjectEver || usage.lifetimeDesignGenerations >= maxLifetimeDesignGenerations;
}

function evaluateGenerationReservationState({ plan, usage, maxLifetimeDesignGenerations = 1 }) {
  if (usage.generationStatus === "in_progress") return { allowed: false, reason: "in_progress" };
  if (plan === "free" && isOutOfGenerationCredits(usage, maxLifetimeDesignGenerations)) {
    return { allowed: false, reason: "limit_reached" };
  }
  return { allowed: true };
}

test("unit: free user with no prior generation is allowed", () => {
  const result = evaluateGenerationReservationState({
    plan: "free",
    usage: { generationStatus: "not_started", lifetimeDesignGenerations: 0, hasGeneratedProjectEver: false },
  });
  assert.equal(result.allowed, true);
});

test("unit: free user with prior generation is blocked", () => {
  const result = evaluateGenerationReservationState({
    plan: "free",
    usage: { generationStatus: "completed", lifetimeDesignGenerations: 1, hasGeneratedProjectEver: true },
  });
  assert.deepEqual(result, { allowed: false, reason: "limit_reached" });
});

test("unit: owner/admin bypass is allowed", () => {
  const result = evaluateGenerationReservationState({
    plan: "admin",
    usage: { generationStatus: "completed", lifetimeDesignGenerations: 5, hasGeneratedProjectEver: true },
  });
  assert.equal(result.allowed, true);
});

test("integration-like: parallel reservations yield one winner", async () => {
  let usage = { generationStatus: "not_started", lifetimeDesignGenerations: 0, hasGeneratedProjectEver: false };

  const reserve = async () => {
    const decision = evaluateGenerationReservationState({ plan: "free", usage });
    if (!decision.allowed) return decision;
    usage = { generationStatus: "in_progress", lifetimeDesignGenerations: 1, hasGeneratedProjectEver: true };
    return { allowed: true };
  };

  const [a, b] = await Promise.all([reserve(), reserve()]);
  assert.equal([a, b].filter((result) => result.allowed).length, 1);
});
