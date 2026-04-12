"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
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
      subtitle="Design and refine your agent map with tasks, reflections, evals, and business metrics."
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
          <div className="grid min-h-[72vh] gap-4 md:grid-cols-[220px_minmax(0,1fr)_320px]">
            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Board guide</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Drag nodes to rearrange the design.</li>
                <li>• Connect nodes to show flow and feedback loops.</li>
                <li>• Select a node to edit details in the inspector.</li>
                <li>• Keep reflection, eval, and business metrics explicit.</li>
              </ul>
            </aside>

            <section className="rounded-2xl border border-ades-soft bg-slate-50 p-3">
              <StudioBoard />
            </section>

            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <BoardInspector />
            </aside>
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
