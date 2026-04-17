import { NextResponse } from "next/server";
import { assertCanCreateProject, getAuthenticatedUser, getOrCreateUsage, getUserPlan, isAdminBypass } from "@/lib/usageGate";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export async function GET(request: Request) {
  try {
    const { uid, email } = await getAuthenticatedUser(request);
    const plan = await getUserPlan(uid, email);
    const usage = await getOrCreateUsage(uid);

    const db = getFirebaseAdminDb();
    const projectSnapshot = await db.collection("projects").where("ownerUid", "==", uid).limit(1).get();

    const canCreate = await assertCanCreateProject(uid, email);

    return NextResponse.json({
      ok: true,
      uid,
      email,
      plan,
      isAdminBypass: isAdminBypass(email),
      hasExistingProject: !projectSnapshot.empty,
      canCreateProject: canCreate.allowed,
      usage: {
        lifetimeProjectsCreated: usage.lifetimeProjectsCreated,
        lifetimeDesignGenerations: usage.lifetimeDesignGenerations,
        activeProjectCount: usage.activeProjectCount,
        deletedProjectCount: usage.deletedProjectCount,
        generationAttempts: usage.generationAttempts,
        hasGeneratedProjectEver: usage.hasGeneratedProjectEver,
        generationStatus: usage.generationStatus,
        regenerations: usage.regenerations,
        aiReviews: usage.aiReviews,
        improvements: usage.improvements,
        aiAdditions: usage.aiAdditions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch usage.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
