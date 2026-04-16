import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser } from "@/lib/usageGate";

const ALLOWED_TRIGGERS = ["second_project", "generate_design", "regenerate", "ai_review", "improve_design", "add_eval", "add_reflection", "add_safeguard", "ai_addition"] as const;
const ALLOWED_INTENTS = ["yes", "maybe", "no"] as const;
const ALLOWED_ANCHORS = ["coffee", "cinema", "shoes", "dinner", "custom", null] as const;

type PaymentInterestBody = {
  trigger?: (typeof ALLOWED_TRIGGERS)[number];
  intent?: (typeof ALLOWED_INTENTS)[number];
  priceAnchor?: (typeof ALLOWED_ANCHORS)[number];
  customAmount?: string | null;
  feedback?: string;
};

export async function POST(request: Request) {
  try {
    const { uid, email } = await getAuthenticatedUser(request);
    const body = (await request.json()) as PaymentInterestBody;

    if (!ALLOWED_TRIGGERS.includes(body.trigger as (typeof ALLOWED_TRIGGERS)[number])) {
      return NextResponse.json({ error: "Invalid trigger." }, { status: 400 });
    }
    if (!ALLOWED_INTENTS.includes(body.intent as (typeof ALLOWED_INTENTS)[number])) {
      return NextResponse.json({ error: "Invalid intent." }, { status: 400 });
    }

    const priceAnchor = ALLOWED_ANCHORS.includes((body.priceAnchor ?? null) as (typeof ALLOWED_ANCHORS)[number]) ? (body.priceAnchor ?? null) : null;

    const db = getFirebaseAdminDb();
    const ref = db.collection("paymentInterest").doc();
    await ref.set({
      uid,
      email: email ?? null,
      trigger: body.trigger,
      intent: body.intent,
      priceAnchor,
      customAmount: typeof body.customAmount === "string" ? body.customAmount.trim().slice(0, 60) : null,
      feedback: typeof body.feedback === "string" ? body.feedback.trim().slice(0, 4000) : "",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit feedback.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
