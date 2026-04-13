import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

type OpenAIEventInput = {
  route: "/api/generate" | "/api/critique";
  projectId: string | null;
  uid: string | null;
  success: boolean;
  responseId: string | null;
  model: string | null;
  usage: unknown | null;
  hasApiKey: boolean;
  errorMessage?: string;
};

export async function recordOpenAIEvent(event: OpenAIEventInput) {
  const db = getFirebaseAdminDb();
  await db.collection("openai_events").add({
    ...event,
    createdAt: FieldValue.serverTimestamp(),
  });
}
