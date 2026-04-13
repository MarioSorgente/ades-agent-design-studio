"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import {
  createProjectForUser,
  renameProjectForUser,
  subscribeToUserProjects,
  type ProjectRecord,
} from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

function formatDateTimeLabel(isoString: string | null) {
  if (!isoString) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function toFriendlyFirestoreError(error: Error) {
  const raw = error.message || "";

  if (raw.toLowerCase().includes("missing or insufficient permissions")) {
    return "Firestore permissions are blocking this action. In Firebase Console, verify rules allow authenticated users to access only their own projects (ownerUid == auth.uid).";
  }

  if (raw.toLowerCase().includes("requires an index")) {
    return "This query needs a Firestore composite index. Open the error link in browser console once to create the index for projects(ownerUid + updatedAt).";
  }

  return raw || "Something went wrong while loading projects.";
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
        setErrorMessage(toFriendlyFirestoreError(error));
        setIsLoadingProjects(false);
      }
    );

    return () => unsubscribe();
  }, [status, user]);

  const stats = useMemo(() => {
    const generated = projects.filter((project) => project.status === "generated").length;
    const draft = projects.length - generated;
    const mostRecent = projects[0]?.updatedAt ?? null;

    return {
      total: projects.length,
      generated,
      draft,
      mostRecent: formatDateTimeLabel(mostRecent),
    };
  }, [projects]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const projectId = await createProjectForUser(user.uid, newTitle);
      setNewTitle("");
      router.push(`/project/${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? toFriendlyFirestoreError(error) : "Could not create project.";
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRenameProject(event: FormEvent<HTMLFormElement>, projectId: string) {
    event.preventDefault();

    if (!user || isRenaming) {
      return;
    }

    setIsRenaming(true);
    setErrorMessage(null);

    try {
      await renameProjectForUser(projectId, user.uid, editingTitle);
      setEditingProjectId(null);
      setEditingTitle("");
    } catch (error) {
      const message = error instanceof Error ? toFriendlyFirestoreError(error) : "Could not rename project.";
      setErrorMessage(message);
    } finally {
      setIsRenaming(false);
    }
  }

  function startRename(project: ProjectRecord) {
    setEditingProjectId(project.id);
    setEditingTitle(project.title);
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="A calmer command center for active boards, generation progress, and quick return to your latest studio work."
      breadcrumbLabel="Dashboard"
    >
      <ProtectedRoute>
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_-35px_rgba(15,23,42,0.55)] md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                  Studio overview
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1 text-sm text-slate-600">Create, continue, and evaluate your latest agent designs with less noise.</p>
              </div>
              <form onSubmit={handleCreateProject} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New project title</label>
                <div className="mt-2 flex flex-col gap-2 md:flex-row">
                  <input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    type="text"
                    placeholder="e.g., Customer Support Triage Agent"
                    className="ades-input"
                    maxLength={100}
                  />
                  <button type="submit" disabled={isCreating || !user} className="ades-primary-btn whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50">
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Total projects" value={String(stats.total)} description="All drafts and generated boards." />
            <MetricCard label="Generated" value={String(stats.generated)} description="Boards with AI structure and critique." />
            <MetricCard label="Drafts" value={String(stats.draft)} description="Projects still shaping scope." />
            <MetricCard label="Last edited" value={stats.mostRecent} description="Most recent update across your workspace." />
          </section>

          {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div> : null}

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Recent projects</h3>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {projects.length} total
                </span>
              </div>

              {isLoadingProjects ? <p className="mt-4 text-sm text-slate-600">Loading your projects...</p> : null}

              {!isLoadingProjects && !projects.length ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <h4 className="text-sm font-semibold text-slate-900">No projects yet</h4>
                  <p className="mt-1 text-sm text-slate-600">Create your first board to structure tasks, reflections, risks, evals, and metrics.</p>
                </div>
              ) : null}

              {!isLoadingProjects && projects.length ? (
                <ul className="mt-4 space-y-3">
                  {projects.map((project) => {
                    const isEditing = editingProjectId === project.id;

                    return (
                      <li key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                project.status === "generated"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-slate-300 bg-white text-slate-600"
                              }`}
                            >
                              {project.status === "generated" ? "Generated" : "Draft"}
                            </span>

                            {isEditing ? (
                              <form onSubmit={(event) => void handleRenameProject(event, project.id)} className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                                <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="ades-input" maxLength={100} />
                                <div className="flex items-center gap-2">
                                  <button type="submit" disabled={isRenaming} className="ades-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
                                    {isRenaming ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProjectId(null);
                                      setEditingTitle("");
                                    }}
                                    className="ades-ghost-btn px-3 py-2 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <h4 className="mt-2 font-semibold text-slate-900">{project.title}</h4>
                                <p className="mt-1 text-xs text-slate-500">Updated {formatDateTimeLabel(project.updatedAt)}</p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isEditing ? (
                              <button type="button" onClick={() => startRename(project)} className="ades-ghost-btn px-3 py-2 text-xs">
                                Rename
                              </button>
                            ) : null}
                            <Link href={`/project/${project.id}`} className="ades-primary-btn px-3 py-2 text-xs">
                              Open studio
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </article>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Workflow</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>1) Start a design from the top composer.</li>
                  <li>2) Use Studio to generate board structure.</li>
                  <li>3) Run critique and add missing coverage.</li>
                  <li>4) Export Markdown / JSON / image / print.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Active status</h3>
                <p className="mt-2 text-sm text-emerald-700">Signed in and persisted</p>
                <p className="mt-1 text-xs text-slate-500">Your projects are synced to Firestore and can be reopened any time.</p>
              </div>
            </aside>
          </section>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}

function MetricCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_-28px_rgba(15,23,42,0.75)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}
