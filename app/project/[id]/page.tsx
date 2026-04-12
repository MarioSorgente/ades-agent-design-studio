"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { getProjectForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

export default function ProjectPage({ params }: { params: { id: string } }) {
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

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loadedProject = await getProjectForUser(params.id, user.uid);
        setProject(loadedProject);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load project.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [params.id, status, user]);

  return (
    <AppShell
      title={project?.title ?? `Project ${params.id}`}
      subtitle="Three-panel studio shell for designing agent flow, reviewing structure, and preparing critique."
    >
      <ProtectedRoute>
        {isLoading ? (
          <div className="rounded-xl border border-ades-soft bg-white p-6 text-sm text-slate-600">Loading project…</div>
        ) : null}

        {!isLoading && (errorMessage || !project) ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p>{errorMessage ?? "Project not found or you do not have access."}</p>
            <Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">
              Back to dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <div className="grid min-h-[65vh] gap-4 md:grid-cols-[240px_minmax(0,1fr)_280px]">
            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Left panel</h2>
              <p className="mt-2 text-sm text-slate-600">Placeholder for project map, blocks, and navigation.</p>
            </aside>

            <section className="rounded-2xl border border-ades-soft bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Canvas</h2>
              <div className="mt-3 flex min-h-[48vh] items-center justify-center rounded-xl border border-dashed border-ades-soft bg-slate-50 text-sm text-slate-500">
                Center canvas placeholder
              </div>
            </section>

            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspector</h2>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                <li>• Critique placeholder</li>
                <li>• Reflection placeholder</li>
                <li>• Evals placeholder</li>
              </ul>
            </aside>
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
