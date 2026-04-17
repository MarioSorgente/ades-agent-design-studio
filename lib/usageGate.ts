import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { evaluateGenerationReservationState, isOutOfGenerationCredits } from "@/lib/security/generation-guard";

export const ADMIN_EMAILS = ["ms.sorgente@gmail.com"] as const;

export const FREE_LIMITS = {
  maxLifetimeProjectsCreated: 1,
  maxLifetimeDesignGenerations: 1,
  maxRegenerations: 0,
  maxAiReviews: 0,
  maxImprovements: 0,
  maxAiAdditions: 0,
} as const;

export type UserPlan = "free" | "early_access" | "paid" | "admin";

export type GenerationStatus = "not_started" | "in_progress" | "completed" | "failed";

export type UsageAction =
  | "create_project"
  | "generate_design"
  | "regenerate_design"
  | "ai_review"
  | "improve_design"
  | "add_eval"
  | "add_reflection"
  | "add_safeguard"
  | "ai_addition";

export type GateReason =
  | "free_lifetime_project_limit"
  | "free_lifetime_generation_limit"
  | "free_project_limit"
  | "free_generation_limit"
  | "free_regeneration_blocked"
  | "free_ai_review_blocked"
  | "free_improve_blocked"
  | "free_ai_addition_blocked";

export type GateTrigger =
  | "second_project"
  | "generate_design"
  | "regenerate"
  | "ai_review"
  | "improve_design"
  | "add_eval"
  | "add_reflection"
  | "add_safeguard"
  | "ai_addition";

export type GateResponse = {
  ok: false;
  gated: true;
  reason: GateReason;
  trigger: GateTrigger;
  message: "Free beta limit reached";
};

type GateAllowed = { allowed: true; plan: UserPlan };
type GateDenied = { allowed: false; plan: UserPlan; reason: GateReason; trigger: GateTrigger };

export type UsageRecord = {
  uid: string;
  lifetimeProjectsCreated: number;
  lifetimeDesignGenerations: number;
  activeProjectCount: number;
  deletedProjectCount: number;
  generationAttempts: number;
  regenerations: number;
  aiReviews: number;
  improvements: number;
  aiAdditions: number;
  hasGeneratedProjectEver: boolean;
  generationStatus: GenerationStatus;
  generationReservedAt: Timestamp | null;
  generationInProgressAt: Timestamp | null;
  generationInProgressProjectId: string | null;
  firstGeneratedAt: Timestamp | null;
  lastGenerationAttemptAt: Timestamp | null;
  firstProjectCreatedAt: Timestamp | null;
  firstDesignGeneratedAt: Timestamp | null;
  lastProjectCreatedAt: Timestamp | null;
  lastDesignGeneratedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type ReservationFailure = { allowed: false; response: GateResponse };
export type ReservationConflict = { allowed: false; conflict: true; message: string; status: 409 };
export type GenerationReservation = { allowed: true; plan: UserPlan } | ReservationFailure | ReservationConflict;
type ReservationTransactionResult =
  | { ok: true }
  | { ok: false; conflict: true; message: string }
  | { ok: false; response: GateResponse };

function parseAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function clampCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function parseGenerationStatus(value: unknown): GenerationStatus {
  if (value === "in_progress" || value === "completed" || value === "failed") return value;
  return "not_started";
}

export function mapUsage(uid: string, data: Record<string, unknown> | undefined): UsageRecord {
  return {
    uid,
    lifetimeProjectsCreated: clampCount(data?.lifetimeProjectsCreated),
    lifetimeDesignGenerations: clampCount(data?.lifetimeDesignGenerations),
    activeProjectCount: clampCount(data?.activeProjectCount),
    deletedProjectCount: clampCount(data?.deletedProjectCount),
    generationAttempts: clampCount(data?.generationAttempts),
    regenerations: clampCount(data?.regenerations),
    aiReviews: clampCount(data?.aiReviews),
    improvements: clampCount(data?.improvements),
    aiAdditions: clampCount(data?.aiAdditions),
    hasGeneratedProjectEver: data?.hasGeneratedProjectEver === true,
    generationStatus: parseGenerationStatus(data?.generationStatus),
    generationReservedAt: data?.generationReservedAt instanceof Timestamp ? data.generationReservedAt : null,
    generationInProgressAt: data?.generationInProgressAt instanceof Timestamp ? data.generationInProgressAt : null,
    generationInProgressProjectId: typeof data?.generationInProgressProjectId === "string" ? data.generationInProgressProjectId : null,
    lastGenerationAttemptAt: data?.lastGenerationAttemptAt instanceof Timestamp ? data.lastGenerationAttemptAt : null,
    firstGeneratedAt: data?.firstGeneratedAt instanceof Timestamp ? data.firstGeneratedAt : null,
    firstProjectCreatedAt: data?.firstProjectCreatedAt instanceof Timestamp ? data.firstProjectCreatedAt : null,
    firstDesignGeneratedAt: data?.firstDesignGeneratedAt instanceof Timestamp ? data.firstDesignGeneratedAt : null,
    lastProjectCreatedAt: data?.lastProjectCreatedAt instanceof Timestamp ? data.lastProjectCreatedAt : null,
    lastDesignGeneratedAt: data?.lastDesignGeneratedAt instanceof Timestamp ? data.lastDesignGeneratedAt : null,
    createdAt: data?.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt : null,
  };
}

export function isFreeUserOutOfGenerationCredits(usage: Pick<UsageRecord, "lifetimeDesignGenerations" | "hasGeneratedProjectEver">) {
  return isOutOfGenerationCredits(usage, FREE_LIMITS.maxLifetimeDesignGenerations);
}

export function isAdminBypass(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}

export async function getAuthenticatedUser(request: Request): Promise<{ uid: string; email: string | null; token: DecodedIdToken }> {
  const token = parseAuthToken(request);
  if (!token) throw new Error("Missing Firebase auth token.");

  const auth = getFirebaseAdminAuth();
  const decodedToken = await auth.verifyIdToken(token);
  return {
    uid: decodedToken.uid,
    email: typeof decodedToken.email === "string" ? decodedToken.email : null,
    token: decodedToken,
  };
}

export async function getUserPlan(uid: string, email?: string | null): Promise<UserPlan> {
  if (isAdminBypass(email)) return "admin";
  const db = getFirebaseAdminDb();
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();
  const data = snapshot.data() as { plan?: string; email?: string | null; createdAt?: unknown } | undefined;
  const normalizedEmail = email ?? data?.email ?? null;

  const plan: UserPlan = data?.plan === "paid" || data?.plan === "early_access" || data?.plan === "admin" ? data.plan : "free";

  await userRef.set(
    {
      uid,
      email: normalizedEmail,
      plan: isAdminBypass(normalizedEmail) ? "admin" : plan,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snapshot.exists ? data?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (isAdminBypass(normalizedEmail)) return "admin";
  return plan;
}

export async function getOrCreateUsage(uid: string): Promise<UsageRecord> {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  const snapshot = await usageRef.get();

  if (!snapshot.exists) {
    const payload = {
      uid,
      lifetimeProjectsCreated: 0,
      lifetimeDesignGenerations: 0,
      activeProjectCount: 0,
      deletedProjectCount: 0,
      generationAttempts: 0,
      regenerations: 0,
      aiReviews: 0,
      improvements: 0,
      aiAdditions: 0,
      hasGeneratedProjectEver: false,
      generationStatus: "not_started" as const,
      generationReservedAt: null,
      generationInProgressAt: null,
      generationInProgressProjectId: null,
      firstGeneratedAt: null,
      lastGenerationAttemptAt: null,
      firstProjectCreatedAt: null,
      firstDesignGeneratedAt: null,
      lastProjectCreatedAt: null,
      lastDesignGeneratedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await usageRef.set(payload, { merge: true });
    return mapUsage(uid, payload as unknown as Record<string, unknown>);
  }

  return mapUsage(uid, snapshot.data() as Record<string, unknown>);
}

function allow(plan: UserPlan): GateAllowed {
  return { allowed: true, plan };
}

function deny(plan: UserPlan, reason: GateReason, trigger: GateTrigger): GateDenied {
  return { allowed: false, plan, reason, trigger };
}

export async function assertCanCreateProject(uid: string, email?: string | null): Promise<GateAllowed | GateDenied> {
  const plan = await getUserPlan(uid, email);
  if (plan !== "free") return allow(plan);

  const usage = await getOrCreateUsage(uid);
  if (
    usage.lifetimeProjectsCreated >= FREE_LIMITS.maxLifetimeProjectsCreated ||
    isFreeUserOutOfGenerationCredits(usage) ||
    usage.generationReservedAt ||
    usage.generationStatus === "in_progress"
  ) {
    return deny(plan, "free_lifetime_project_limit", "second_project");
  }

  return allow(plan);
}

export async function assertCanGenerateDesign(uid: string, email?: string | null): Promise<GateAllowed | GateDenied> {
  const plan = await getUserPlan(uid, email);
  if (plan !== "free") return allow(plan);

  const usage = await getOrCreateUsage(uid);
  if (isFreeUserOutOfGenerationCredits(usage)) {
    return deny(plan, "free_lifetime_generation_limit", "generate_design");
  }

  return allow(plan);
}

export async function assertCanUseAi(uid: string, email: string | null | undefined, action: UsageAction): Promise<GateAllowed | GateDenied> {
  const plan = await getUserPlan(uid, email);
  if (plan !== "free") return allow(plan);

  switch (action) {
    case "regenerate_design":
      return deny(plan, "free_regeneration_blocked", "regenerate");
    case "ai_review":
      return deny(plan, "free_ai_review_blocked", "ai_review");
    case "improve_design":
      return deny(plan, "free_improve_blocked", "improve_design");
    case "add_eval":
      return deny(plan, "free_ai_addition_blocked", "add_eval");
    case "add_reflection":
      return deny(plan, "free_ai_addition_blocked", "add_reflection");
    case "add_safeguard":
      return deny(plan, "free_ai_addition_blocked", "add_safeguard");
    case "ai_addition":
      return deny(plan, "free_ai_addition_blocked", "ai_addition");
    case "create_project":
      return assertCanCreateProject(uid, email);
    case "generate_design":
      return assertCanGenerateDesign(uid, email);
    default:
      return deny(plan, "free_generation_limit", "generate_design");
  }
}

export async function reserveLifetimeProjectGeneration(uid: string, email?: string | null): Promise<{ allowed: true; plan: UserPlan } | { allowed: false; plan: UserPlan; response: GateResponse }> {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  const plan = await getUserPlan(uid, email);
  if (plan !== "free") return { allowed: true, plan };

  const result = await db.runTransaction<ReservationTransactionResult>(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = mapUsage(uid, usageSnap.exists ? (usageSnap.data() as Record<string, unknown>) : undefined);

    if (
      usage.lifetimeProjectsCreated >= FREE_LIMITS.maxLifetimeProjectsCreated ||
      isFreeUserOutOfGenerationCredits(usage) ||
      usage.generationReservedAt ||
      usage.generationStatus === "in_progress"
    ) {
      return { ok: false as const, response: getGateResponse("free_lifetime_project_limit", "second_project") };
    }

    tx.set(
      usageRef,
      {
        uid,
        generationReservedAt: FieldValue.serverTimestamp(),
        generationStatus: "not_started",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: usage.createdAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const };
  });

  if (!result.ok) {
    if ("response" in result) return { allowed: false, plan, response: result.response };
    return { allowed: false, plan, response: getGateResponse("free_lifetime_project_limit", "second_project") };
  }
  return { allowed: true, plan };
}

// Security-critical guard: acquire a server-side lock before any paid generation call.
export async function reserveGenerationAttempt(uid: string, email?: string | null, projectId?: string): Promise<GenerationReservation> {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  const plan = await getUserPlan(uid, email);

  const result = await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = mapUsage(uid, usageSnap.exists ? (usageSnap.data() as Record<string, unknown>) : undefined);

    const decision = evaluateGenerationReservationState({ plan, usage, maxLifetimeDesignGenerations: FREE_LIMITS.maxLifetimeDesignGenerations });
    if (!decision.allowed && decision.reason === "in_progress") {
      return { ok: false as const, conflict: true as const, message: "A generation is already in progress. Please wait." };
    }

    const baseUpdate: Record<string, unknown> = {
      uid,
      generationStatus: "in_progress",
      generationInProgressAt: FieldValue.serverTimestamp(),
      generationInProgressProjectId: projectId ?? null,
      generationAttempts: usage.generationAttempts + 1,
      lastGenerationAttemptAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: usage.createdAt ?? FieldValue.serverTimestamp(),
    };

    if (plan === "free") {
      if (!decision.allowed && decision.reason === "limit_reached") {
        return { ok: false as const, response: getGateResponse("free_lifetime_generation_limit", "generate_design") };
      }

      // Count the lifetime free generation at reservation time so retries cannot loop on failures.
      baseUpdate.hasGeneratedProjectEver = true;
      baseUpdate.lifetimeDesignGenerations = Math.max(usage.lifetimeDesignGenerations, 1);
      baseUpdate.lifetimeProjectsCreated = Math.max(usage.lifetimeProjectsCreated, 1);
      baseUpdate.firstGeneratedAt = usage.firstGeneratedAt ?? FieldValue.serverTimestamp();
      baseUpdate.firstDesignGeneratedAt = usage.firstDesignGeneratedAt ?? FieldValue.serverTimestamp();
      baseUpdate.lastDesignGeneratedAt = FieldValue.serverTimestamp();
      baseUpdate.firstProjectCreatedAt = usage.firstProjectCreatedAt ?? FieldValue.serverTimestamp();
      baseUpdate.lastProjectCreatedAt = FieldValue.serverTimestamp();
      baseUpdate.generationReservedAt = null;
    }

    tx.set(usageRef, baseUpdate, { merge: true });
    return { ok: true as const };
  });

  if (!result.ok && "conflict" in result) {
    return { allowed: false, conflict: true, message: result.message ?? "A generation is already in progress. Please wait.", status: 409 };
  }
  if (!result.ok) {
    return { allowed: false, response: result.response };
  }
  return { allowed: true, plan };
}

export async function markGenerationCompleted(uid: string, plan: UserPlan) {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  await usageRef.set(
    {
      uid,
      generationStatus: "completed",
      generationInProgressAt: null,
      generationInProgressProjectId: null,
      generationReservedAt: null,
      hasGeneratedProjectEver: plan === "free" ? true : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markGenerationFailed(uid: string) {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  await usageRef.set(
    {
      uid,
      generationStatus: "failed",
      generationInProgressAt: null,
      generationInProgressProjectId: null,
      generationReservedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function incrementUsage(uid: string, action: UsageAction): Promise<void> {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);

  await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = mapUsage(uid, usageSnap.exists ? (usageSnap.data() as Record<string, unknown>) : undefined);

    const baseUpdate: Record<string, unknown> = {
      uid,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: usage.createdAt ?? FieldValue.serverTimestamp(),
    };

    if (action === "generate_design") {
      baseUpdate.activeProjectCount = usage.activeProjectCount + 1;
      baseUpdate.generationReservedAt = null;
      baseUpdate.generationStatus = "completed";
      baseUpdate.generationInProgressAt = null;
      baseUpdate.generationInProgressProjectId = null;
    } else if (action === "regenerate_design") {
      baseUpdate.regenerations = usage.regenerations + 1;
    } else if (action === "ai_review") {
      baseUpdate.aiReviews = usage.aiReviews + 1;
    } else if (action === "improve_design") {
      baseUpdate.improvements = usage.improvements + 1;
    } else if (action === "add_eval" || action === "add_reflection" || action === "add_safeguard" || action === "ai_addition") {
      baseUpdate.aiAdditions = usage.aiAdditions + 1;
    }

    tx.set(usageRef, baseUpdate, { merge: true });
  });
}

export async function releaseGenerationReservation(uid: string) {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  await usageRef.set({ generationReservedAt: null, generationStatus: "not_started", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function markProjectDeleted(uid: string) {
  const db = getFirebaseAdminDb();
  const usageRef = db.collection("usage").doc(uid);
  await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = mapUsage(uid, usageSnap.exists ? (usageSnap.data() as Record<string, unknown>) : undefined);
    tx.set(
      usageRef,
      {
        uid,
        activeProjectCount: Math.max(usage.activeProjectCount - 1, 0),
        deletedProjectCount: usage.deletedProjectCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: usage.createdAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export function getGateResponse(reason: GateReason, trigger: GateTrigger): GateResponse {
  return {
    ok: false,
    gated: true,
    reason,
    trigger,
    message: "Free beta limit reached",
  };
}

export function logGateDeny(params: { uid: string; email: string | null | undefined; action: UsageAction; reason: GateReason }) {
  console.info("[usage-gate] blocked", {
    uid: params.uid,
    email: params.email ?? null,
    action: params.action,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  });
}
