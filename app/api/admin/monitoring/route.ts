import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminBypass } from "@/lib/usageGate";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export async function GET(request: Request) {
  try {
    const { email } = await getAuthenticatedUser(request);
    if (!isAdminBypass(email)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const db = getFirebaseAdminDb();
    const [recentMetrics, recentAlerts] = await Promise.all([
      db.collection("generationMetrics").orderBy("createdAt", "desc").limit(200).get(),
      db.collection("monitoringAlerts").orderBy("createdAt", "desc").limit(100).get(),
    ]);

    const metrics = recentMetrics.docs.map((doc) => doc.data() as Record<string, unknown>);
    const alerts = recentAlerts.docs.map((doc) => doc.data() as Record<string, unknown>);

    const total = metrics.length;
    const successCount = metrics.filter((m) => m.success === true).length;
    const failureCount = total - successCount;
    const successRate = total ? Number(((successCount / total) * 100).toFixed(2)) : 0;
    const avgLatencyMs = total
      ? Math.round(metrics.reduce((sum, m) => sum + (typeof m.latencyMs === "number" ? m.latencyMs : 0), 0) / total)
      : 0;
    const totalCostUsd = Number(metrics.reduce((sum, m) => sum + (typeof m.estimatedCostUsd === "number" ? m.estimatedCostUsd : 0), 0).toFixed(4));

    return NextResponse.json({
      summary: { total, successCount, failureCount, successRate, avgLatencyMs, totalCostUsd },
      metrics,
      alerts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch monitoring data.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
