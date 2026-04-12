import { FieldValue, type Firestore } from "firebase-admin/firestore";

export const DAILY_USAGE_LIMITS = {
  generate: 5,
  critique: 10,
} as const;

export type UsageAction = keyof typeof DAILY_USAGE_LIMITS;

type DailyUsageRecord = {
  uid: string;
  dateKey: string;
  generateCount: number;
  critiqueCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
};

type UsageCapResult = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  dateKey: string;
};

function getDateKeyUtc(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseUsageRecord(uid: string, dateKey: string, value: unknown): DailyUsageRecord {
  if (!value || typeof value !== "object") {
    return {
      uid,
      dateKey,
      generateCount: 0,
      critiqueCount: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
    };
  }

  const record = value as Record<string, unknown>;

  return {
    uid,
    dateKey,
    generateCount: asNumber(record.generateCount),
    critiqueCount: asNumber(record.critiqueCount),
    estimatedInputTokens: asNumber(record.estimatedInputTokens),
    estimatedOutputTokens: asNumber(record.estimatedOutputTokens),
  };
}

function getUsageDocRef(db: Firestore, uid: string, dateKey: string) {
  return db.collection("usage").doc(`${uid}_${dateKey}`);
}

export async function checkUsageCap(db: Firestore, uid: string, action: UsageAction): Promise<UsageCapResult> {
  const dateKey = getDateKeyUtc();
  const usageRef = getUsageDocRef(db, uid, dateKey);
  const snapshot = await usageRef.get();
  const usage = parseUsageRecord(uid, dateKey, snapshot.data());
  const used = action === "generate" ? usage.generateCount : usage.critiqueCount;
  const limit = DAILY_USAGE_LIMITS[action];
  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    dateKey,
  };
}

export async function incrementUsageCount(
  db: Firestore,
  uid: string,
  action: UsageAction,
  estimatedInputTokens = 0,
  estimatedOutputTokens = 0
) {
  const dateKey = getDateKeyUtc();
  const usageRef = getUsageDocRef(db, uid, dateKey);

  await usageRef.set(
    {
      uid,
      dateKey,
      generateCount: action === "generate" ? FieldValue.increment(1) : FieldValue.increment(0),
      critiqueCount: action === "critique" ? FieldValue.increment(1) : FieldValue.increment(0),
      estimatedInputTokens: FieldValue.increment(Math.max(estimatedInputTokens, 0)),
      estimatedOutputTokens: FieldValue.increment(Math.max(estimatedOutputTokens, 0)),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
