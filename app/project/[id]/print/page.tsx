"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/lib/auth/store";
import type { AdesNode } from "@/lib/board/types";
import { getProjectForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { normalizeRouteParam } from "@/lib/utils/route-params";

export default function ProjectPrintPage({ params }: { params: { id: string } }) {
  const projectId = normalizeRouteParam(params?.id);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!user) {
        setIsLoading(status === "loading");
        setProject(null);
        return;
      }

      if (!projectId) {
        setProject(null);
        setErrorMessage("Project not found or route is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await getProjectForUser(projectId, user.uid);
        setProject(loaded);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load project.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId, status, user]);

  const sections = useMemo(() => {
    const nodes = project?.board?.nodes ?? [];
    const byType = (type: AdesNode["type"]) => nodes.filter((node) => node.type === type);

    return [
      { title: "Goal and scope", nodes: byType("goal") },
      { title: "Task map", nodes: byType("task") },
      { title: "Reflections + safeguards", nodes: [...byType("reflection"), ...byType("risk")] },
      { title: "Eval + business metrics", nodes: [...byType("eval"), ...byType("business_metric")] },
      { title: "Assumptions + handoff", nodes: [...byType("assumption"), ...byType("handoff")] },
    ];
  }, [project?.board?.nodes]);

  return (
    <AppShell
      title={project?.title ? `${project.title} · Print + export` : `Project ${projectId} · Print + export`}
      subtitle="Print-ready view for design summary, reflections, critique, eval signals, and business outcomes."
      actions={
        <button type="button" onClick={() => window.print()} className="ades-ghost-btn">
          Print now
        </button>
      }
    >
      <ProtectedRoute>
        {isLoading ? <div className="ades-panel text-sm text-slate-600">Loading print view…</div> : null}

        {!isLoading && (errorMessage || !project) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p>{errorMessage ?? "Project not found or you do not have access."}</p>
            <Link href="/dashboard" className="mt-3 inline-block underline">
              Back to dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <section className="ades-panel">
                <h2 className="text-base font-semibold text-slate-900">Summary</h2>
                <p className="mt-2 text-sm text-slate-700">{project.summary || "No summary yet."}</p>
                <p className="mt-2 text-xs text-slate-500">Audience: {project.audience || "Not specified"}</p>
              </section>

              {sections.map((section) => (
                <PrintSection key={section.title} title={section.title} nodes={section.nodes} />
              ))}

              {project.critique ? (
                <section className="ades-panel">
                  <h2 className="text-base font-semibold text-slate-900">Critique findings</h2>
                  <p className="mt-1 text-sm text-slate-600">{project.critique.summary}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {project.critique.critiqueItems.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold">[{item.severity}]</span> {item.message}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="ades-panel h-fit">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Export checklist</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Keep heading hierarchy concise for PDF readability.</li>
                <li>• Verify reflection loops and critique signals are visible.</li>
                <li>• Include at least one measurable business KPI.</li>
              </ul>
            </aside>
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}

function PrintSection({ title, nodes }: { title: string; nodes: AdesNode[] }) {
  return (
    <section className="ades-panel break-inside-avoid">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {nodes.length ? (
        <ul className="mt-3 space-y-2">
          {nodes.map((node) => (
            <li key={node.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{node.data.label}</p>
              {node.data.body ? <p className="mt-1 text-sm text-slate-700">{node.data.body}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No entries yet.</div>
      )}
    </section>
  );
}
