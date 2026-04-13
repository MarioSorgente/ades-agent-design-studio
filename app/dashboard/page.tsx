"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { analyzeBoardQuality } from "@/lib/board/quality";
import {
  createProjectForUser,
  deleteProjectForUser,
  renameProjectForUser,
  subscribeToUserProjects,
  type ProjectRecord,
} from "@/lib/firebase/firestore";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";

type ProjectTab = "mine" | "recent" | "templates";

function formatDateTimeLabel(isoString: string | null) {
  if (!isoString) return "Just now";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoString));
}

function getProjectUpdatedAt(updatedAt?: string | null) {
  return updatedAt ? new Date(updatedAt).getTime() : 0;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const userName = user?.displayName?.split(" ")[0] || "there";

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newIdeaPrompt, setNewIdeaPrompt] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newConstraints, setNewConstraints] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingProjectId, setGeneratingProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("mine");

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

  const qualityByProject = useMemo(
    () =>
      projects.map((project) => ({
        project,
        quality: analyzeBoardQuality(project.board),
      })),
    [projects],
  );

  const recentProjectTitles = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 3)
      .map((project) => ({ id: project.id, title: project.title }));
  }, [projects]);

  const visibleProjects = useMemo(() => {
    if (activeTab === "recent") {
      return [...qualityByProject].sort((a, b) => {
        const aDate = getProjectUpdatedAt(a.project.updatedAt);
        const bDate = getProjectUpdatedAt(b.project.updatedAt);
        return bDate - aDate;
      });
    }

    if (activeTab === "templates") {
      return qualityByProject.filter(({ project }) => project.status === "generated");
    }

    return qualityByProject;
  }, [activeTab, qualityByProject]);

  useEffect(() => {
    if (!generatingProjectId) return;
    const generatingProject = projects.find((project) => project.id === generatingProjectId);
    if (generatingProject?.status === "generated") {
      setGeneratingProjectId(null);
    }
  }, [generatingProjectId, projects]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isCreating) return;
    if (!newIdeaPrompt.trim()) {
      setErrorMessage("Add the idea prompt so ADES can generate steps, loops, and evals.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    try {
      const projectId = await createProjectForUser(user.uid, newTitle);
      setGeneratingProjectId(projectId);
      const idToken = await getCurrentUserIdToken();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          projectId,
          ideaPrompt: newIdeaPrompt,
          audience: newAudience,
          constraints: newConstraints,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Project created, but AI generation failed.");
      setNewTitle("");
      setNewIdeaPrompt("");
      setNewAudience("");
      setNewConstraints("");
      setGeneratingProjectId(null);
    } catch (error) {
      setGeneratingProjectId(null);
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

  async function handleDeleteProject(projectId: string) {
    if (!user) return;
    const confirmed = window.confirm("Delete this project permanently?");
    if (!confirmed) return;

    setErrorMessage(null);
    try {
      await deleteProjectForUser(projectId, user.uid);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete project.");
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto flex min-h-screen w-full max-w-[1500px] gap-4 p-4 md:p-6">
        <aside className="hidden w-[270px] shrink-0 flex-col rounded-[2rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur lg:flex">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to ADES landing page">
              <Image src="/logo-ades.svg" alt="ADES logo" width={124} height={34} className="h-8 w-auto" priority />
            </Link>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700">Workspace</span>
          </div>

          <nav className="mt-6 space-y-1 text-sm">
            {["Home", "Search", "All projects", "Starred", "Created by me", "Shared with me"].map((item, idx) => (
              <button
                key={item}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${idx === 0 ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <span>{item}</span>
                {item === "Search" ? <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px]">⌘K</span> : null}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-slate-200/80 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recents</p>
            <div className="mt-2 space-y-1">
              {recentProjectTitles.length ? (
                recentProjectTitles.map((project) => (
                  <Link key={project.id} href={`/project/${project.id}`} className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                    {project.title}
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">Your recents will appear here.</p>
              )}
            </div>
          </div>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/85 p-3">
            <p className="text-sm font-semibold text-slate-900">{user?.displayName || "ADES designer"}</p>
            <p className="mt-1 text-xs text-slate-600">Designing reliable agent systems with ADES.</p>
            <div className="mt-3">
              <AuthHeaderActions />
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/90 p-4 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.22),transparent_42%),radial-gradient(circle_at_82%_20%,rgba(147,51,234,0.22),transparent_36%),radial-gradient(circle_at_50%_96%,rgba(56,189,248,0.14),transparent_38%)]" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-2 lg:hidden">
                <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to ADES landing page">
                  <Image src="/logo-ades.svg" alt="ADES logo" width={124} height={34} className="h-8 w-auto" priority />
                </Link>
                <AuthHeaderActions />
              </div>

              <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Agent design workspace</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Let&apos;s design something, {userName}.</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Turn an idea into a testable agent with structured tasks, reflection loops, eval coverage, and business metrics.</p>

              <form onSubmit={handleCreateProject} className="mt-6 rounded-[1.7rem] border border-slate-200/90 bg-white/95 p-4 shadow-[0_25px_55px_-42px_rgba(15,23,42,0.55)] md:p-5">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Start a new project</label>
                <textarea
                  value={newIdeaPrompt}
                  onChange={(event) => setNewIdeaPrompt(event.target.value)}
                  placeholder="Describe the agent you want to design… Ask ADES to draft tasks, loops, risks, and evals."
                  className="ades-input mt-3 min-h-28 rounded-2xl"
                  maxLength={1800}
                />

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} type="text" placeholder="Project title (optional)" className="ades-input" maxLength={100} />
                  <input value={newAudience} onChange={(event) => setNewAudience(event.target.value)} type="text" placeholder="Audience (optional)" className="ades-input" maxLength={240} />
                  <input value={newConstraints} onChange={(event) => setNewConstraints(event.target.value)} type="text" placeholder="Constraints (optional)" className="ades-input" maxLength={400} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">ADES will generate a first structured board so you can refine quickly.</p>
                  <button type="submit" disabled={isCreating || !user || !newIdeaPrompt.trim()} className="ades-primary-btn px-5 py-3 disabled:opacity-50">
                    {isCreating ? "Creating + Generating..." : "Create project"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {errorMessage ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div> : null}
          {generatingProjectId ? (
            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">Generating your project board now. You will see it below with a spinner until it is ready.</div>
          ) : null}

          <section className="mt-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.8)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                {[
                  { id: "mine", label: "My projects" },
                  { id: "recent", label: "Recently viewed" },
                  { id: "templates", label: "Templates" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ProjectTab)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{projects.length} total projects</span>
            </div>

            {isLoadingProjects ? <p className="mt-5 text-sm text-slate-600">Loading your projects...</p> : null}

            {!isLoadingProjects && !visibleProjects.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-sm font-semibold text-slate-900">No projects in this view</h3>
                <p className="mt-1 text-sm text-slate-600">Use the composer above to create your first agent design workspace.</p>
              </div>
            ) : null}

            {!isLoadingProjects && visibleProjects.length ? (
              <ul className="mt-5 grid gap-3 lg:grid-cols-2">
                {visibleProjects.map(({ project, quality }) => {
                  const isEditing = editingProjectId === project.id;
                  const isGenerating = generatingProjectId === project.id && project.status !== "generated";

                  return (
                    <li key={project.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_35px_-35px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:border-indigo-200">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            project.status === "generated"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : isGenerating
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : "border-slate-300 bg-white text-slate-600"
                          }`}
                        >
                          {isGenerating ? <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-indigo-600 border-t-transparent" aria-hidden /> : null}
                          {project.status === "generated" ? "Generated" : isGenerating ? "Generating" : "Draft"}
                        </span>
                        <span className="text-[11px] text-slate-500">Updated {formatDateTimeLabel(project.updatedAt)}</span>
                      </div>

                      {isEditing ? (
                        <form onSubmit={(event) => void handleRenameProject(event, project.id)} className="mt-3 space-y-2">
                          <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="ades-input" maxLength={100} />
                          <div className="flex items-center gap-2">
                            <button type="submit" disabled={isRenaming} className="ades-primary-btn px-3 py-2 text-xs disabled:opacity-50">
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
                          <h3 className="mt-3 text-lg font-semibold text-slate-900">{project.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{project.summary || "Open this flow to define steps, improvement loops, and eval criteria."}</p>
                          {isGenerating ? <p className="mt-2 text-xs font-semibold text-indigo-700">AI is generating tasks, loops, reflections, and evals…</p> : null}

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <ProjectSignal
                              label="Quality score"
                              value={`${quality.score}/100`}
                              tooltip="Overall project quality based on clarity, reflection loops, risk coverage, and eval readiness."
                            />
                            <ProjectSignal label="Readiness" value={quality.hasEndToEndEval ? "Review-ready" : "Needs evals"} tooltip="Shows whether the project has enough end-to-end eval definition to be review-ready." />
                            <ProjectSignal label="Eval coverage" value={`${quality.evalCoveragePct}%`} tooltip="Percent of core steps that have explicit evaluation criteria defined." />
                            <ProjectSignal label="Improvement" value={`${quality.improvementCoveragePct}%`} tooltip="Percent of steps that include feedback loops and concrete improvement actions." />
                          </div>

                          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">Weakest area: {quality.weakestArea}</p>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProjectId(project.id);
                                setEditingTitle(project.title);
                              }}
                              className="ades-ghost-btn px-3 py-2 text-xs"
                            >
                              Rename
                            </button>
                            <button type="button" onClick={() => void handleDeleteProject(project.id)} className="ades-ghost-btn px-3 py-2 text-xs text-rose-700">
                              Delete
                            </button>
                            <Link href={`/project/${project.id}`} className="ades-primary-btn px-3 py-2 text-xs">
                              Open studio
                            </Link>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </section>
      </main>
    </ProtectedRoute>
  );
}

function ProjectSignal({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold normal-case text-slate-600"
          title={tooltip}
          aria-label={tooltip}
        >
          i
        </span>
      </p>
      <p className="mt-1 text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}
