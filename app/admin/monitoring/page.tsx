"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";

type MonitoringSummary = {
  total: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
};

export default function AdminMonitoringPage() {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const token = await getCurrentUserIdToken();
        const response = await fetch("/api/admin/monitoring", { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { error?: string; summary?: MonitoringSummary; alerts?: Array<Record<string, unknown>> };
        if (!response.ok) throw new Error(payload.error || "Failed to load monitoring data.");

        if (!mounted) return;
        setSummary(payload.summary ?? null);
        setAlerts(payload.alerts ?? []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load monitoring data.");
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Internal monitoring" subtitle="Admin-only generation reliability and cost health dashboard.">
      <div className="space-y-4">
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {summary ? (
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Generation success" value={`${summary.successRate}%`} helper={`${summary.successCount}/${summary.total} successful`} />
            <StatCard label="Average latency" value={`${summary.avgLatencyMs} ms`} helper="Lower is better" />
            <StatCard label="Total estimated cost" value={`$${summary.totalCostUsd.toFixed(4)}`} helper="From OpenAI token usage" />
          </div>
        ) : null}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent alerts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.length ? alerts.map((alert, idx) => <li key={idx} className="rounded-lg border border-amber-200 bg-amber-50 p-2">{String(alert.message || "Alert")}</li>) : <li>No alerts.</li>}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{helper}</p>
    </article>
  );
}
