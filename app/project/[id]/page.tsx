"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { CORE_NODE_TYPES, BOARD_VIEW_MODES, type AdesBoardSnapshot, type AdesNodeType, type BoardViewMode } from "@/lib/board/types";
import { getNodeTheme } from "@/lib/board/node-theme";
import { createStarterBoard } from "@/lib/board/starter-board";
import { useAdesBoardStore } from "@/lib/board/store";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { getProjectForUser, saveProjectBoardForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";
import type { CritiqueResult, CritiqueSuggestion } from "@/lib/critique/types";
import { createProjectJson, createProjectMarkdown, downloadTextFile, parseImportJson } from "@/lib/export/project-export";
import { normalizeRouteParam } from "@/lib/utils/route-params";

const AUTOSAVE_DELAY_MS = 900;

type GenerateResponse = {
  project: { id: string; title: string; summary: string; status: "generated" };
  board: AdesBoardSnapshot;
};

type CritiqueResponse = { critique: CritiqueResult };

export default function ProjectPage() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const projectId = normalizeRouteParam(routeParams?.id);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [audience, setAudience] = useState("");
  const [constraints, setConstraints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSummary, setGenerationSummary] = useState<string>("");
  const [critiqueResult, setCritiqueResult] = useState<CritiqueResult | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const [viewMode, setViewMode] = useState<BoardViewMode>("flow");
  const [isLeftToolbarExpanded, setIsLeftToolbarExpanded] = useState(false);
  const [isRightPanelPinned, setIsRightPanelPinned] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const getBoardSnapshot = useAdesBoardStore((state) => state.getBoardSnapshot);
  const isBoardInitialized = useAdesBoardStore((state) => state.isInitialized);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const addNodeWithContent = useAdesBoardStore((state) => state.addNodeWithContent);
  const addNode = useAdesBoardStore((state) => state.addNode);

  const hasHydratedBoardRef = useRef(false);
  const lastSavedHashRef = useRef<string | null>(null);

  useEffect(() => {
    hasHydratedBoardRef.current = false;
    lastSavedHashRef.current = null;

    async function loadProject() {
      if (!projectId) {
        setProject(null);
        setErrorMessage("Project not found or route is invalid.");
        setIsLoading(false);
        return;
      }
      if (!user) {
        setIsLoading(status === "loading");
        setProject(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const loadedProject = await getProjectForUser(projectId, user.uid);
        setProject(loadedProject);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load project.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId, status, user]);

  useEffect(() => {
    if (isLoading || !project || hasHydratedBoardRef.current) return;
    const initialBoard = project.board ?? createStarterBoard();
    loadBoardSnapshot(initialBoard);
    lastSavedHashRef.current = JSON.stringify(initialBoard);
    hasHydratedBoardRef.current = true;
    setSaveState("saved");
    setIdeaPrompt(project.ideaPrompt);
    setAudience(project.audience);
    setConstraints(project.constraints);
    setGenerationSummary(project.summary);
    setCritiqueResult(project.critique);
  }, [isLoading, loadBoardSnapshot, project]);

  const currentBoardHash = useMemo(() => (!isBoardInitialized || !hasHydratedBoardRef.current ? null : JSON.stringify({ nodes, edges })), [edges, isBoardInitialized, nodes]);

  const boardSummary = useMemo(() => {
    const mainSteps = nodes.filter((node) => node.type === "goal" || node.type === "task" || node.type === "handoff").length;
    const reflections = nodes.filter((node) => node.type === "reflection").length;
    const feedback = nodes.filter((node) => node.type === "feedback").length;
    const evals = nodes.filter((node) => node.type === "eval").length;
    return { mainSteps, reflections, feedback, evals };
  }, [nodes]);

  useEffect(() => {
    if (!user || !project || !currentBoardHash || !hasHydratedBoardRef.current || lastSavedHashRef.current === currentBoardHash) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const board = getBoardSnapshot();
        await saveProjectBoardForUser(project.id, user.uid, board);
        lastSavedHashRef.current = JSON.stringify(board);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [currentBoardHash, getBoardSnapshot, project, user]);

  const saveStateLabel = saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Ready";

  async function handleGenerateBoard() {
    if (!user || !project || isGenerating) return;
    if (!ideaPrompt.trim()) return setGenerationError("Add an idea before generating.");

    setGenerationError(null);
    setIsGenerating(true);
    try {
      const idToken = await getCurrentUserIdToken();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ projectId: project.id, ideaPrompt, audience, constraints }),
      });

      const payload = (await response.json()) as GenerateResponse | { error?: string };
      if (!response.ok || !("board" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "Generation failed.");

      loadBoardSnapshot(payload.board);
      lastSavedHashRef.current = JSON.stringify(payload.board);
      setSaveState("saved");
      setGenerationSummary(payload.project.summary);
      setCritiqueResult(null);
      setProject((previous) => (previous ? { ...previous, title: payload.project.title, summary: payload.project.summary, status: "generated", ideaPrompt, audience, constraints, critique: null } : previous));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCritiqueBoard() {
    if (!user || !project || isCritiquing) return;
    setCritiqueError(null);
    setIsCritiquing(true);
    try {
      const idToken = await getCurrentUserIdToken();
      const response = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ projectId: project.id, summary: generationSummary || project.summary, board: getBoardSnapshot() }),
      });

      const payload = (await response.json()) as CritiqueResponse | { error?: string };
      if (!response.ok || !("critique" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "Critique failed.");

      setCritiqueResult(payload.critique);
      setProject((previous) => (previous ? { ...previous, critique: payload.critique } : previous));
      setIsBottomPanelOpen(true);
    } catch (error) {
      setCritiqueError(error instanceof Error ? error.message : "Critique failed.");
    } finally {
      setIsCritiquing(false);
    }
  }

  const handleAddSuggestionToBoard = (suggestion: CritiqueSuggestion) => addNodeWithContent(suggestion.type as AdesNodeType, suggestion.title, suggestion.body);
  const handleExportMarkdown = () => project && downloadTextFile(`${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.md`, createProjectMarkdown({ ...project, board: getBoardSnapshot(), critique: critiqueResult ?? project.critique }), "text/markdown;charset=utf-8");
  const handleExportJson = () => project && downloadTextFile(`${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.json`, createProjectJson({ ...project, board: getBoardSnapshot(), ideaPrompt, audience, constraints, summary: generationSummary || project.summary, critique: critiqueResult ?? project.critique }), "application/json;charset=utf-8");

  async function handleExportImage() {
    if (isExportingImage) return;
    setExportError(null);
    setIsExportingImage(true);
    try {
      const element = document.getElementById("ades-canvas-export");
      if (!element) throw new Error("Could not find canvas for image export.");
      const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${(project?.title || "ades-project").replace(/\s+/g, "-").toLowerCase()}-board.png`;
      anchor.click();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export image.");
    } finally {
      setIsExportingImage(false);
    }
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    if (!project || !user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setExportError(null);
      const parsed = parseImportJson(await file.text());
      loadBoardSnapshot(parsed.board);
      lastSavedHashRef.current = JSON.stringify(parsed.board);
      setIdeaPrompt(parsed.ideaPrompt);
      setAudience(parsed.audience);
      setConstraints(parsed.constraints);
      setGenerationSummary(parsed.summary);
      setCritiqueResult(parsed.critique);
      setProject((previous) => (previous ? { ...previous, title: parsed.title || previous.title, summary: parsed.summary, ideaPrompt: parsed.ideaPrompt, audience: parsed.audience, constraints: parsed.constraints, critique: parsed.critique } : previous));
      await saveProjectBoardForUser(project.id, user.uid, parsed.board);
      setSaveState("saved");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to import JSON.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <AppShell title={project?.title ?? (projectId ? `Project ${projectId}` : "Project")} subtitle="Flow View answers the core question first: what are the main steps this agent must perform?" breadcrumbLabel={project?.title ?? "Studio"} actions={<Link href={projectId ? `/project/${projectId}/print` : "/dashboard"} className="ades-ghost-btn" aria-disabled={!projectId}>Print</Link>}>
      <ProtectedRoute>
        {isLoading ? <div className="ades-panel text-sm text-slate-600">Loading project…</div> : null}

        {!isLoading && (errorMessage || !project) ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"><p>{errorMessage ?? "Project not found or you do not have access."}</p><Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">Back to dashboard</Link></div> : null}

        {!isLoading && project ? (
          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{saveStateLabel}</span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{boardSummary.mainSteps} flow steps</span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{boardSummary.reflections} reflections</span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">{boardSummary.feedback} feedback</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{boardSummary.evals} evals</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BOARD_VIEW_MODES.map((mode) => (
                    <button key={mode} type="button" onClick={() => setViewMode(mode)} className={viewMode === mode ? "ades-primary-btn px-3 py-1.5 text-[11px]" : "ades-ghost-btn px-3 py-1.5 text-[11px]"}>
                      {mode === "flow" ? "Flow View" : mode === "eval" ? "Eval View" : "Improvement View"}
                    </button>
                  ))}
                  <button type="button" className="ades-ghost-btn px-3 py-1.5 text-[11px]" onClick={() => setIsBottomPanelOpen((prev) => !prev)}>{isBottomPanelOpen ? "Hide tools" : "Tools"}</button>
                </div>
              </div>
            </section>

            <section className="flex gap-3">
              <aside className={`rounded-2xl border border-slate-200/80 bg-white/90 p-2 ${isLeftToolbarExpanded ? "w-[220px]" : "w-[54px]"}`}>
                <button type="button" onClick={() => setIsLeftToolbarExpanded((prev) => !prev)} className="mb-2 flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600">{isLeftToolbarExpanded ? "Collapse" : "☰"}</button>
                <div className="space-y-1.5">
                  {CORE_NODE_TYPES.map((type) => {
                    const theme = getNodeTheme(type);
                    return (
                      <button key={type} type="button" onClick={() => addNode(type)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-200" title={theme.label}>
                        <span className={`h-2 w-2 rounded-full ${theme.dotClass}`} />
                        {isLeftToolbarExpanded ? theme.label : null}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="relative min-w-0 flex-1">
                <StudioBoard viewMode={viewMode} className="h-[calc(100vh-11rem)] min-h-[700px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-[#f3f5fa]" />
              </div>

              {isRightPanelPinned || selectedNodeId ? (
                <aside className="w-[340px] rounded-2xl border border-slate-200/80 bg-white/95 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</p>
                    <button type="button" onClick={() => setIsRightPanelPinned((prev) => !prev)} className="ades-ghost-btn px-2 py-1 text-[10px]">{isRightPanelPinned ? "Unpin" : "Pin"}</button>
                  </div>
                  <BoardInspector />
                </aside>
              ) : null}
            </section>

            {isBottomPanelOpen ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generate flow</h4>
                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Idea<textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} /></label>
                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Audience<input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Constraints<textarea className="ades-input mt-1 min-h-[66px] resize-y" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Policy, latency, budget..." /></label>
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-primary-btn mt-2 w-full px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Generating..." : "Generate"}</button>
                    {generationError ? <p className="mt-1 text-xs text-rose-600">{generationError}</p> : null}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critique</h4>
                      <button type="button" onClick={() => void handleCritiqueBoard()} disabled={isCritiquing || nodes.length === 0} className="ades-primary-btn px-3 py-1.5 text-[11px] disabled:opacity-60">{isCritiquing ? "Running..." : "Run"}</button>
                    </div>
                    {critiqueError ? <p className="mt-1 text-xs text-rose-600">{critiqueError}</p> : null}
                    {critiqueResult ? <p className="mt-2 text-xs text-slate-600">{critiqueResult.summary}</p> : <p className="mt-2 text-xs text-slate-500">Run critique to surface missing reflections, feedback points, and evals.</p>}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Export + import</h4>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" onClick={handleExportMarkdown} className="ades-ghost-btn px-2 py-2 text-xs">Markdown</button>
                      <button type="button" onClick={handleExportJson} className="ades-ghost-btn px-2 py-2 text-xs">JSON</button>
                      <button type="button" onClick={() => void handleExportImage()} className="ades-ghost-btn px-2 py-2 text-xs" disabled={isExportingImage}>{isExportingImage ? "Exporting..." : "Image"}</button>
                      <button type="button" onClick={() => window.open(`/project/${projectId}/print`, "_blank")} className="ades-ghost-btn px-2 py-2 text-xs" disabled={!projectId}>PDF</button>
                    </div>
                    <input ref={importInputRef} type="file" accept="application/json" onChange={(event) => void handleImportJson(event)} className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-2 file:py-1" />
                    {exportError ? <p className="mt-1 text-xs text-rose-600">{exportError}</p> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {critiqueResult ? <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">Critique findings</h3><div className="mt-3 grid gap-3 lg:grid-cols-2"><div><ul className="space-y-2">{critiqueResult.critiqueItems.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.severity} severity</p><p className="mt-1 text-sm text-slate-800">{item.message}</p><p className="mt-1 text-xs text-slate-600">{item.recommendation}</p></li>)}</ul></div><div className="space-y-3"><SuggestionSection title="Missing reflections" suggestions={critiqueResult.missingReflections} onAdd={handleAddSuggestionToBoard} /><SuggestionSection title="Missing evals" suggestions={critiqueResult.missingEvals} onAdd={handleAddSuggestionToBoard} /><SuggestionSection title="Missing business metrics" suggestions={critiqueResult.missingBusinessMetrics} onAdd={handleAddSuggestionToBoard} /></div></div></section> : null}
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}

function SuggestionSection({ title, suggestions, onAdd }: { title: string; suggestions: CritiqueSuggestion[]; onAdd: (suggestion: CritiqueSuggestion) => void }) {
  if (!suggestions.length) return null;
  return <div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4><ul className="mt-2 space-y-2">{suggestions.map((suggestion) => <li key={suggestion.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2"><p className="text-sm font-medium text-slate-800">{suggestion.title}</p><p className="mt-1 text-xs text-slate-600">{suggestion.body}</p><button type="button" className="ades-ghost-btn mt-2 px-2 py-1 text-xs" onClick={() => onAdd(suggestion)}>Add to board</button></li>)}</ul></div>;
}
