"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { analyzeBoardQuality } from "@/lib/board/quality";
import { createProjectForUser, deleteProjectForUser, renameProjectForUser, subscribeToUserProjects, type ProjectRecord } from "@/lib/firebase/firestore";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";

function formatDateTimeLabel(isoString: string | null) {
  if (!isoString) return "Just now";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoString));
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

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

  const stats = useMemo(() => {
    const missingEvalCoverage = qualityByProject.filter(({ quality }) => quality.evalCoveragePct < 100).length;
    const missingImprovementCoverage = qualityByProject.filter(({ quality }) => quality.improvementCoveragePct === 0).length;
    const underDefined = qualityByProject.filter(({ quality }) => quality.genericStepCount > 0 || quality.stepsMissingPurpose > 0).length;
    const readyForReview = qualityByProject.filter(({ quality }) => quality.score >= 75 && quality.hasEndToEndEval).length;

    return {
      projects: projects.length,
      missingEvalCoverage,
      missingImprovementCoverage,
      underDefined,
      readyForReview,
    };
  }, [projects.length, qualityByProject]);

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
    <AppShell title="Dashboard" subtitle="Design intelligence across your portfolio: eval depth, improvement loops, and readiness gaps." breadcrumbLabel="Dashboard">
      <ProtectedRoute>
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5">
            <div className="space-y-4">
              <form onSubmit={handleCreateProject} className="mx-auto w-full max-w-3xl rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start a project</label>
                <div className="mt-2 space-y-2">
                  <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} type="text" placeholder="Project title (optional) e.g., Claims Intake Agent" className="ades-input" maxLength={100} />
                  <textarea
                    value={newIdeaPrompt}
                    onChange={(event) => setNewIdeaPrompt(event.target.value)}
                    placeholder="Describe the agent idea. ADES will immediately break it into tasks, loops, reflections, and evals."
                    className="ades-input min-h-20"
                    maxLength={1800}
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input value={newAudience} onChange={(event) => setNewAudience(event.target.value)} type="text" placeholder="Audience (optional)" className="ades-input" maxLength={240} />
                    <input value={newConstraints} onChange={(event) => setNewConstraints(event.target.value)} type="text" placeholder="Constraints (optional)" className="ades-input" maxLength={400} />
                  </div>
                  <button type="submit" disabled={isCreating || !user || !newIdeaPrompt.trim()} className="ades-primary-btn w-full whitespace-nowrap disabled:opacity-50">{isCreating ? "Creating + Generating..." : "Create and generate"}</button>
                </div>
              </form>

              <div>
                <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Design workspace</p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">From fuzzy idea to testable agent system.</h2>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-5">
            <MetricCard label="Projects missing eval coverage" value={String(stats.missingEvalCoverage)} />
            <MetricCard label="Flows with no improvement loops" value={String(stats.missingImprovementCoverage)} />
            <MetricCard label="Under-defined projects" value={String(stats.underDefined)} />
            <MetricCard label="Projects ready for review" value={String(stats.readyForReview)} />
            <MetricCard label="Total projects" value={String(stats.projects)} />
          </section>

          {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div> : null}
          {generatingProjectId ? (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              Generating your project board now. You will see it below with a spinner until it is ready.
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Projects to resume</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{projects.length} total</span>
            </div>

            {isLoadingProjects ? <p className="mt-4 text-sm text-slate-600">Loading your projects...</p> : null}

            {!isLoadingProjects && !projects.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><h4 className="text-sm font-semibold text-slate-900">No projects yet</h4><p className="mt-1 text-sm text-slate-600">Create your first flow and attach reflection loops, external feedback, and eval questions.</p></div> : null}

            {!isLoadingProjects && qualityByProject.length ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {qualityByProject.map(({ project, quality }) => {
                  const isEditing = editingProjectId === project.id;
                  const isGenerating = generatingProjectId === project.id && project.status !== "generated";
                  return (
                    <li key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            project.status === "generated" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : isGenerating ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-600"
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
                            <button type="submit" disabled={isRenaming} className="ades-primary-btn px-3 py-2 text-xs disabled:opacity-50">{isRenaming ? "Saving..." : "Save"}</button>
                            <button type="button" onClick={() => { setEditingProjectId(null); setEditingTitle(""); }} className="ades-ghost-btn px-3 py-2 text-xs">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h4 className="mt-2 font-semibold text-slate-900">{project.title}</h4>
                          <p className="mt-1 text-xs text-slate-500">{project.summary || "Open this flow to define steps, improvement loops, and eval criteria."}</p>
                          {isGenerating ? <p className="mt-2 text-xs font-semibold text-indigo-700">AI is generating tasks, loops, reflections, and evals…</p> : null}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <span>Concrete steps: {quality.totalSteps}</span>
                            <span>Eval coverage: {quality.evalCoveragePct}%</span>
                            <span>Improvement coverage: {quality.improvementCoveragePct}%</span>
                            <span>Unresolved risks: {quality.unresolvedRisks}</span>
                          </div>
                          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">Weakest area: {quality.weakestArea}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <button type="button" onClick={() => { setEditingProjectId(project.id); setEditingTitle(project.title); }} className="ades-ghost-btn px-3 py-2 text-xs">Rename</button>
                            <button type="button" onClick={() => void handleDeleteProject(project.id)} className="ades-ghost-btn px-3 py-2 text-xs text-rose-700">Delete</button>
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
