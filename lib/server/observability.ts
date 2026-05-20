import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export type GenerationMetricInput = {
  uid: string;
  projectId: string;
  success: boolean;
  model: string | null;
  promptVersion: string;
  responseId: string | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  errorMessage?: string;
};

const FAILURE_ALERT_THRESHOLD = 3;
const COST_SPIKE_USD_THRESHOLD = 0.35;

export const GENERATE_PROMPT_VERSION = "ades_generate_board_v2";

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function estimateGpt5MiniCostUsd(inputTokens: number, outputTokens: number) {
  const inputPerMillion = 0.25;
  const outputPerMillion = 2.0;
  return Number((((inputTokens / 1_000_000) * inputPerMillion) + ((outputTokens / 1_000_000) * outputPerMillion)).toFixed(6));
}

export async function recordGenerationMetric(input: GenerationMetricInput) {
  const db = getFirebaseAdminDb();
  const metricsRef = db.collection("generationMetrics").doc();

  await metricsRef.set({
    id: metricsRef.id,
    uid: input.uid,
    projectId: input.projectId,
    success: input.success,
    model: input.model,
    promptVersion: input.promptVersion,
    responseId: input.responseId,
    latencyMs: input.latencyMs,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    estimatedCostUsd: input.estimatedCostUsd,
    errorMessage: input.errorMessage ?? "",
    createdAt: FieldValue.serverTimestamp(),
  });

  const projectRef = db.collection("projects").doc(input.projectId);
  await projectRef.set(
    {
      latestGenerationMeta: {
        success: input.success,
        model: input.model,
        promptVersion: input.promptVersion,
        responseId: input.responseId,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.totalTokens,
        estimatedCostUsd: input.estimatedCostUsd,
        generatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await maybeCreateAlerts(input);
}

async function maybeCreateAlerts(input: GenerationMetricInput) {
  const db = getFirebaseAdminDb();

  if (input.estimatedCostUsd >= COST_SPIKE_USD_THRESHOLD) {
    await db.collection("monitoringAlerts").add({
      type: "cost_spike",
      severity: "high",
      projectId: input.projectId,
      uid: input.uid,
      message: `Generation cost spike detected: $${input.estimatedCostUsd}`,
      metric: input.estimatedCostUsd,
      threshold: COST_SPIKE_USD_THRESHOLD,
      createdAt: FieldValue.serverTimestamp(),
      acknowledged: false,
    });
  }

  if (!input.success) {
    const since = Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000));
    const failures = await db
      .collection("generationMetrics")
      .where("uid", "==", input.uid)
      .where("success", "==", false)
      .where("createdAt", ">=", since)
      .get();

    if (failures.size >= FAILURE_ALERT_THRESHOLD) {
      await db.collection("monitoringAlerts").add({
        type: "repeated_failures",
        severity: "high",
        projectId: input.projectId,
        uid: input.uid,
        message: `Repeated generation failures (${failures.size} in 30 minutes).`,
        metric: failures.size,
        threshold: FAILURE_ALERT_THRESHOLD,
        createdAt: FieldValue.serverTimestamp(),
        acknowledged: false,
      });
    }
  }
}

export function extractUsageMetrics(usage: unknown) {
  const usageData = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
  const inputTokens = toNumber(usageData.input_tokens);
  const outputTokens = toNumber(usageData.output_tokens);
  const totalTokens = toNumber(usageData.total_tokens) || inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}
