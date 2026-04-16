import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";

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

type UsageRecord = {
  uid: string;
  lifetimeProjectsCreated: number;
  lifetimeDesignGenerations: number;
  activeProjectCount: number;
  deletedProjectCount: number;
  regenerations: number;
  aiReviews: number;
  improvements: number;
  aiAdditions: number;
  firstProjectCreatedAt: Timestamp | null;
  firstDesignGeneratedAt: Timestamp | null;
  lastProjectCreatedAt: Timestamp | null;
  lastDesignGeneratedAt: Timestamp | null;
  generationReservedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

function parseAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function clampCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function mapUsage(uid: string, data: Record<string, unknown> | undefined): UsageRecord {
  return {
    uid,
    lifetimeProjectsCreated: clampCount(data?.lifetimeProjectsCreated),
    lifetimeDesignGenerations: clampCount(data?.lifetimeDesignGenerations),
    activeProjectCount: clampCount(data?.activeProjectCount),
    deletedProjectCount: clampCount(data?.deletedProjectCount),
    regenerations: clampCount(data?.regenerations),
    aiReviews: clampCount(data?.aiReviews),
    improvements: clampCount(data?.improvements),
    aiAdditions: clampCount(data?.aiAdditions),
    firstProjectCreatedAt: data?.firstProjectCreatedAt instanceof Timestamp ? data.firstProjectCreatedAt : null,
    firstDesignGeneratedAt: data?.firstDesignGeneratedAt instanceof Timestamp ? data.firstDesignGeneratedAt : null,
    lastProjectCreatedAt: data?.lastProjectCreatedAt instanceof Timestamp ? data.lastProjectCreatedAt : null,
    lastDesignGeneratedAt: data?.lastDesignGeneratedAt instanceof Timestamp ? data.lastDesignGeneratedAt : null,
    generationReservedAt: data?.generationReservedAt instanceof Timestamp ? data.generationReservedAt : null,
    createdAt: data?.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt : null,
  };
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
      regenerations: 0,
      aiReviews: 0,
      improvements: 0,
      aiAdditions: 0,
      firstProjectCreatedAt: null,
      firstDesignGeneratedAt: null,
      lastProjectCreatedAt: null,
      lastDesignGeneratedAt: null,
      generationReservedAt: null,
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
  if (usage.lifetimeProjectsCreated >= FREE_LIMITS.maxLifetimeProjectsCreated || usage.lifetimeDesignGenerations >= FREE_LIMITS.maxLifetimeDesignGenerations || usage.generationReservedAt) {
    return deny(plan, "free_lifetime_project_limit", "second_project");
  }

  return allow(plan);
}

export async function assertCanGenerateDesign(uid: string, email?: string | null): Promise<GateAllowed | GateDenied> {
  const plan = await getUserPlan(uid, email);
  if (plan !== "free") return allow(plan);

  const usage = await getOrCreateUsage(uid);
  if (usage.lifetimeDesignGenerations >= FREE_LIMITS.maxLifetimeDesignGenerations) {
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

  const result = await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = mapUsage(uid, usageSnap.exists ? (usageSnap.data() as Record<string, unknown>) : undefined);

    if (usage.lifetimeProjectsCreated >= FREE_LIMITS.maxLifetimeProjectsCreated || usage.lifetimeDesignGenerations >= FREE_LIMITS.maxLifetimeDesignGenerations || usage.generationReservedAt) {
      return { ok: false as const, response: getGateResponse("free_lifetime_project_limit", "second_project") };
    }

    tx.set(
      usageRef,
      {
        uid,
        generationReservedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: usage.createdAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const };
  });

  if (!result.ok) return { allowed: false, plan, response: result.response };
  return { allowed: true, plan };
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
      baseUpdate.lifetimeProjectsCreated = usage.lifetimeProjectsCreated + 1;
      baseUpdate.lifetimeDesignGenerations = usage.lifetimeDesignGenerations + 1;
      baseUpdate.activeProjectCount = usage.activeProjectCount + 1;
      baseUpdate.firstProjectCreatedAt = usage.firstProjectCreatedAt ?? FieldValue.serverTimestamp();
      baseUpdate.lastProjectCreatedAt = FieldValue.serverTimestamp();
      baseUpdate.firstDesignGeneratedAt = usage.firstDesignGeneratedAt ?? FieldValue.serverTimestamp();
      baseUpdate.lastDesignGeneratedAt = FieldValue.serverTimestamp();
      baseUpdate.generationReservedAt = null;
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
  await usageRef.set({ generationReservedAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
