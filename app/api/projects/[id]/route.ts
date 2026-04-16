import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser, markProjectDeleted } from "@/lib/usageGate";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await getAuthenticatedUser(request);
    const { id } = await context.params;
    const projectId = typeof id === "string" ? id.trim().slice(0, 120) : "";

    if (!projectId) return NextResponse.json({ error: "Project id is required." }, { status: 400 });

    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc(projectId);
    const snapshot = await projectRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const project = snapshot.data() as { ownerUid?: string };
    if (project.ownerUid !== uid) return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });

    await projectRef.delete();
    await markProjectDeleted(uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete project.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
