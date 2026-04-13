"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { createProjectForUser, renameProjectForUser, subscribeToUserProjects, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

function formatDateTimeLabel(isoString: string | null) {
  if (!isoString) return "Just now";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoString));
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsLoadingProjects(status === "loading");
      return;
    }

    const unsubscribe = subscribeToUserProjects(
      user.uid,
      (nextProjects) => {
        setProjects(nextProjects);
        setIsLoadingProjects(false);
      },
      (error) => {
        setErrorMessage(error.message || "Unable to load projects.");
        setIsLoadingProjects(false);
      },
    );

    return () => unsubscribe();
  }, [status, user]);

  const stats = useMemo(() => {
    const generated = projects.filter((project) => project.status === "generated").length;
    const drafts = projects.length - generated;
    const evalCoverage = projects.length ? Math.round((generated / projects.length) * 100) : 0;

    return {
      activeProjects: projects.length,
      recentFlows: Math.min(projects.length, 5),
      evalCoverage,
      reviewActivity: projects.filter((project) => project.critique).length,
      drafts,
    };
  }, [projects]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isCreating) return;

    setIsCreating(true);
    setErrorMessage(null);
    try {
      const projectId = await createProjectForUser(user.uid, newTitle);
      setNewTitle("");
      router.push(`/project/${projectId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRenameProject(event: FormEvent<HTMLFormElement>, projectId: string) {
    event.preventDefault();
    if (!user || isRenaming) return;

    setIsRenaming(true);
    setErrorMessage(null);
    try {
      await renameProjectForUser(projectId, user.uid, editingTitle);
      setEditingProjectId(null);
      setEditingTitle("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not rename project.");
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <AppShell title="Dashboard" subtitle="Resume active agent design work quickly: flow progress, eval coverage, and review activity." breadcrumbLabel="Dashboard">
      <ProtectedRoute>
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Design workspace</p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">From fuzzy idea to testable agent system.</h2>
              </div>
              <form onSubmit={handleCreateProject} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start a project</label>
                <div className="mt-2 flex flex-col gap-2 md:flex-row">
                  <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} type="text" placeholder="e.g., Claims Intake Agent" className="ades-input" maxLength={100} />
                  <button type="submit" disabled={isCreating || !user} className="ades-primary-btn whitespace-nowrap disabled:opacity-50">{isCreating ? "Creating..." : "Create"}</button>
                </div>
              </form>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-5">
            <MetricCard label="Active projects" value={String(stats.activeProjects)} />
            <MetricCard label="Recent flows" value={String(stats.recentFlows)} />
            <MetricCard label="Eval coverage" value={`${stats.evalCoverage}%`} />
            <MetricCard label="Feedback activity" value={String(stats.reviewActivity)} />
            <MetricCard label="Drafts needing refinement" value={String(stats.drafts)} />
          </section>

          {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div> : null}

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Projects to resume</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{projects.length} total</span>
            </div>

            {isLoadingProjects ? <p className="mt-4 text-sm text-slate-600">Loading your projects...</p> : null}

            {!isLoadingProjects && !projects.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><h4 className="text-sm font-semibold text-slate-900">No projects yet</h4><p className="mt-1 text-sm text-slate-600">Create your first flow and attach reflection loops, external feedback, and eval questions.</p></div> : null}

            {!isLoadingProjects && projects.length ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {projects.map((project) => {
                  const isEditing = editingProjectId === project.id;
                  return (
                    <li key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${project.status === "generated" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"}`}>{project.status === "generated" ? "Generated" : "Draft"}</span>
                        <span className="text-[11px] text-slate-500">Updated {formatDateTimeLabel(project.updatedAt)}</span>
                      </div>

                      {isEditing ? (
                        <form onSubmit={(event) => void handleRenameProject(event, project.id)} className="mt-3 space-y-2">
                          <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="ades-input" maxLength={100} />
                          <div className="flex items-center gap-2">
                            <button type="submit" disabled={isRenaming} className="ades-primary-btn px-3 py-2 text-xs disabled:opacity-50">{isRenaming ? "Saving..." : "Save"}</button>
                            <button type="button" onClick={() => { setEditingProjectId(null); setEditingTitle(""); }} className="ades-ghost-btn px-3 py-2 text-xs">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h4 className="mt-2 font-semibold text-slate-900">{project.title}</h4>
                          <p className="mt-1 text-xs text-slate-500">{project.summary || "Open this flow to define steps, improvement loops, and eval criteria."}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <button type="button" onClick={() => { setEditingProjectId(project.id); setEditingTitle(project.title); }} className="ades-ghost-btn px-3 py-2 text-xs">Rename</button>
                            <Link href={`/project/${project.id}`} className="ades-primary-btn px-3 py-2 text-xs">Open studio</Link>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></article>;
}
