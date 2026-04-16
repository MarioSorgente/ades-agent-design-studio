import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser, getGateResponse, logGateDeny, reserveLifetimeProjectGeneration } from "@/lib/usageGate";

type CreateProjectBody = {
  title?: string;
};

function sanitizeProjectTitle(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled design";
  return trimmed.slice(0, 100);
}

export async function POST(request: Request) {
  try {
    const { uid, email } = await getAuthenticatedUser(request);
    const reservation = await reserveLifetimeProjectGeneration(uid, email);

    if (!reservation.allowed) {
      logGateDeny({ uid, email, action: "create_project", reason: reservation.response.reason });
      return NextResponse.json(reservation.response, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateProjectBody;
    const title = sanitizeProjectTitle(body.title);
    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc();

    await projectRef.set({
      id: projectRef.id,
      ownerUid: uid,
      title,
      description: "",
      ideaPrompt: "",
      audience: "",
      status: "draft",
      board: null,
      summary: "",
      constraints: "",
      assumptions: [],
      critiqueSeed: [],
      critique: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, projectId: projectRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create project.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(getGateResponse("free_project_limit", "second_project"), { status: 405 });
}
