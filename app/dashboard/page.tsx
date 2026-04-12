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
    return "Firestore permissions are blocking this action. In Firebase Console, verify that Firestore rules allow authenticated users to read and write only their own projects (ownerUid == auth.uid).";
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

  const projectsLabel = useMemo(() => {
    if (!projects.length) {
      return "No projects yet";
    }

    return `${projects.length} design${projects.length === 1 ? "" : "s"}`;
  }, [projects.length]);

  const generatedProjects = useMemo(
    () => projects.filter((project) => project.status === "generated").length,
    [projects]
  );

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
      subtitle="Plan, critique, and evaluate your agent designs with a clearer workflow and faster project navigation."
      breadcrumbLabel="Dashboard"
    >
      <ProtectedRoute>
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="ades-panel">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total designs</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{projects.length}</p>
              <p className="mt-1 text-xs text-slate-500">Across all drafts and generated boards.</p>
            </div>
            <div className="ades-panel">
              <p className="text-xs uppercase tracking-wide text-slate-500">Generated boards</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{generatedProjects}</p>
              <p className="mt-1 text-xs text-slate-500">Designs with AI structure, reflections, and evals.</p>
            </div>
            <div className="ades-panel">
              <p className="text-xs uppercase tracking-wide text-slate-500">Session</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">Signed in and persisted</p>
              <p className="mt-1 text-xs text-slate-500">You can close this tab and continue later on this device.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <form onSubmit={handleCreateProject} className="ades-panel">
                <h2 className="text-base font-semibold text-slate-900">Start a new design</h2>
                <p className="mt-1 text-sm text-slate-600">Use a practical project title. You can refine scope and constraints inside the studio.</p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    type="text"
                    placeholder="e.g., Customer Support Triage Agent"
                    className="ades-input"
                    maxLength={100}
                  />
                  <button type="submit" disabled={isCreating || !user} className="ades-primary-btn disabled:cursor-not-allowed disabled:opacity-50">
                    {isCreating ? "Creating..." : "Create project"}
                  </button>
                </div>
              </form>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div>
              ) : null}

              <article className="ades-panel">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Recent designs</h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{projectsLabel}</span>
                </div>

                {isLoadingProjects ? <p className="mt-4 text-sm text-slate-600">Loading your projects...</p> : null}

                {!isLoadingProjects && !projects.length ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <h3 className="text-sm font-semibold text-slate-900">No designs yet</h3>
                    <p className="mt-1 text-sm text-slate-600">Create your first board and structure tasks, reflections, risks, and evals.</p>
                  </div>
                ) : null}

                {!isLoadingProjects && projects.length ? (
                  <ul className="mt-4 space-y-3">
                    {projects.map((project) => {
                      const isEditing = editingProjectId === project.id;

                      return (
                        <li key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-indigo-200 hover:bg-white">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    project.status === "generated"
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "border-slate-300 bg-white text-slate-600"
                                  }`}
                                >
                                  {project.status === "generated" ? "Generated" : "Draft"}
                                </span>
                              </div>

                              {isEditing ? (
                                <form onSubmit={(event) => void handleRenameProject(event, project.id)} className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <input
                                    value={editingTitle}
                                    onChange={(event) => setEditingTitle(event.target.value)}
                                    className="ades-input"
                                    maxLength={100}
                                  />
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
                                  <h3 className="font-semibold text-slate-900">{project.title}</h3>
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
            </div>

            <aside className="ades-panel h-fit">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Navigation + workflow</h2>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                <li>
                  <p className="font-semibold text-slate-800">1) Create or open a design</p>
                  <p>Start with a board draft, then generate structure from your idea.</p>
                </li>
                <li>
                  <p className="font-semibold text-slate-800">2) Use critique to close gaps</p>
                  <p>Add missing reflections, evals, and business metrics with one click.</p>
                </li>
                <li>
                  <p className="font-semibold text-slate-800">3) Export for handoff</p>
                  <p>Share Markdown, JSON, image, or print/PDF with stakeholders and builders.</p>
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </ProtectedRoute>
    </AppShell>
  );
}
