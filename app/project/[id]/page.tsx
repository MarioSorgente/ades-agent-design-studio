"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { useParams, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { BOARD_VIEW_MODES, type AdesBoardSnapshot, type AdesEdge, type AdesNode, type BoardViewMode, createNode } from "@/lib/board/types";
import { createStarterBoard } from "@/lib/board/starter-board";
import { useAdesBoardStore } from "@/lib/board/store";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { getProjectForUser, saveProjectBoardForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";
import type { CritiqueResult } from "@/lib/critique/types";
import { createProjectJson, createProjectMarkdown, downloadTextFile, parseImportJson } from "@/lib/export/project-export";
import { normalizeRouteParam } from "@/lib/utils/route-params";
import { analyzeBoardQuality } from "@/lib/board/quality";

const AUTOSAVE_DELAY_MS = 900;

type GenerateResponse = {
  project: { id: string; title: string; summary: string; status: "generated" };
  board: AdesBoardSnapshot;
  quality?: { score: number; issues: string[] };
};

type CritiqueResponse = { critique: CritiqueResult };

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function normalizeMainStepPositions(nodes: AdesNode[]) {
  const ordered = nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x);
  const positionMap = new Map(ordered.map((node, index) => [node.id, { x: 180 + index * 320, y: 180 }]));
  return nodes.map((node) => (positionMap.has(node.id) ? { ...node, position: positionMap.get(node.id)! } : node));
}

function rebuildExecutionEdges(edges: AdesEdge[], orderedMainSteps: AdesNode[]) {
  const nonExecutionEdges = edges.filter((edge) => edge.data?.semanticType !== "execution");
  const executionEdges: AdesEdge[] = orderedMainSteps.slice(0, -1).map((step, index) => ({
    id: `exec-${step.id}-${orderedMainSteps[index + 1].id}`,
    source: step.id,
    target: orderedMainSteps[index + 1].id,
    data: { semanticType: "execution" },
  }));
  return [...nonExecutionEdges, ...executionEdges];
}

export default function ProjectPage() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const searchParams = useSearchParams();
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
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [dismissedFindingIds, setDismissedFindingIds] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<BoardViewMode>("flow");

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const getBoardSnapshot = useAdesBoardStore((state) => state.getBoardSnapshot);
  const isBoardInitialized = useAdesBoardStore((state) => state.isInitialized);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);
  const addConnectedNode = useAdesBoardStore((state) => state.addConnectedNode);
  const duplicateNodeById = useAdesBoardStore((state) => state.duplicateNodeById);
  const deleteNodeById = useAdesBoardStore((state) => state.deleteNodeById);

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

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "flow" || requestedView === "eval" || requestedView === "improvement") {
      setViewMode(requestedView);
    }
  }, [searchParams]);

  const currentBoardHash = useMemo(() => (!isBoardInitialized || !hasHydratedBoardRef.current ? null : JSON.stringify({ nodes, edges })), [edges, isBoardInitialized, nodes]);

  const boardSummary = useMemo(() => {
    const mainSteps = nodes.filter((node) => isMainStep(node)).length;
    const reflections = nodes.filter((node) => node.type === "reflection").length;
    const feedback = nodes.filter((node) => node.type === "feedback" || node.type === "handoff").length;
    const evals = nodes.filter((node) => node.type === "eval").length;
    return { mainSteps, reflections, feedback, evals };
  }, [nodes]);

  const qualityReport = useMemo(() => analyzeBoardQuality({ nodes, edges }), [edges, nodes]);
  const activeCritiqueItems = useMemo(() => critiqueResult?.critiqueItems.filter((item) => !dismissedFindingIds.includes(item.id)) ?? [], [critiqueResult, dismissedFindingIds]);
  const totalGuidanceCount = qualityReport.issues.length + activeCritiqueItems.length;
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

  const saveStateLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Ready";
  const hasGeneratedDesign = project?.status === "generated" || nodes.length > 0;

  function getRecommendedViewFromText(text: string): BoardViewMode {
    const clean = text.toLowerCase();
    if (/eval|test|threshold|coverage|dataset|score/.test(clean)) return "eval";
    if (/reflection|feedback|handoff|risk|safeguard|escalat/.test(clean)) return "improvement";
    return "flow";
  }

  function handleInsertMainStep(index: number) {
    const snapshot = getBoardSnapshot();
    const ordered = snapshot.nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x);
    const newNode = createNode("task", `task-${crypto.randomUUID().slice(0, 8)}`, { x: 180 + index * 320, y: 180 }, "New step");
    newNode.data.purpose = "Describe what this step is responsible for.";
    newNode.data.body = newNode.data.purpose;

    const nextOrdered = [...ordered.slice(0, index), newNode, ...ordered.slice(index)];
    const nonMainNodes = snapshot.nodes.filter((node) => !isMainStep(node));
    const nodesWithPositions = normalizeMainStepPositions([...nextOrdered, ...nonMainNodes]);
    const edgesWithExecution = rebuildExecutionEdges(snapshot.edges, nextOrdered);
    loadBoardSnapshot({ nodes: nodesWithPositions, edges: edgesWithExecution });
    setSelectedNodeId(newNode.id);
  }

  function handleReviewGaps() {
    const firstIssue = qualityReport.issues[0]?.toLowerCase() || "";
    setViewMode(getRecommendedViewFromText(firstIssue));
    setIsGuidanceOpen(true);
  }

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
      setDismissedFindingIds([]);
      setProject((previous) => (previous ? { ...previous, critique: payload.critique } : previous));
      setViewMode("improvement");
    } catch (error) {
      setCritiqueError(error instanceof Error ? error.message : "Critique failed.");
    } finally {
      setIsCritiquing(false);
    }
  }

  const handleExportMarkdown = () => project && downloadTextFile(`${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.md`, createProjectMarkdown({ ...project, board: getBoardSnapshot(), critique: critiqueResult ?? project.critique }), "text/markdown;charset=utf-8");
  const handleExportJson = () => project && downloadTextFile(`${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.json`, createProjectJson({ ...project, board: getBoardSnapshot(), ideaPrompt, audience, constraints, summary: generationSummary || project.summary, critique: critiqueResult ?? project.critique }), "application/json;charset=utf-8");

  async function handleExportImage() {
    if (isExportingImage) return;
    setExportError(null);
    setIsExportingImage(true);
    try {
      const element = document.getElementById("ades-canvas-export");
      if (!element) throw new Error("Could not find workspace area for image export.");
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
    <AppShell title={project?.title ?? (projectId ? `Project ${projectId}` : "Project")} subtitle="Design and improve your agent with a guided workspace for flow, safeguards, and eval coverage." breadcrumbLabel={project?.title ?? "Studio"} actions={<Link href={projectId ? `/project/${projectId}/print` : "/dashboard"} className="ades-ghost-btn" aria-disabled={!projectId}>Print</Link>}>
      <ProtectedRoute>
        {isLoading ? <div className="ades-panel text-sm text-slate-600">Loading project…</div> : null}

        {!isLoading && (errorMessage || !project) ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"><p>{errorMessage ?? "Project not found or you do not have access."}</p><Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">Back to dashboard</Link></div> : null}

        {!isLoading && project ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">{saveStateLabel}</span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-semibold text-violet-700">Design Readiness {qualityReport.score}/100</span>
                  </div>
                  <p className="text-sm text-slate-600">{boardSummary.mainSteps} steps · {boardSummary.evals} evals · {boardSummary.reflections} reflections · {boardSummary.feedback} feedback/handoffs</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <details className="relative">
                    <summary className="ades-ghost-btn list-none px-3 py-2 text-xs">Export</summary>
                    <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button type="button" onClick={handleExportMarkdown} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Export Markdown</button>
                      <button type="button" onClick={handleExportJson} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Export JSON</button>
                      <button type="button" onClick={() => void handleExportImage()} disabled={isExportingImage} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">{isExportingImage ? "Exporting image…" : "Export image"}</button>
                      <button type="button" onClick={() => window.open(`/project/${projectId}/print`, "_blank")} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Open PDF view</button>
                      <label className="mt-1 block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Import JSON<input ref={importInputRef} type="file" accept="application/json" onChange={(event) => void handleImportJson(event)} className="hidden" /></label>
                    </div>
                  </details>

                  <Link href="/dashboard" className="ades-ghost-btn px-3 py-2 text-xs">Back</Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {BOARD_VIEW_MODES.map((mode) => (
                    <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-lg px-2.5 py-1.5 text-left text-xs ${viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                      <span className="block font-semibold">{mode === "flow" ? "Flow" : mode === "improvement" ? "Improve" : "Evals"}</span>
                      <span className="block text-[10px] lg:hidden">{mode === "flow" ? "Main sequence" : mode === "improvement" ? "Reflection + feedback" : "Testing coverage"}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleReviewGaps} className="ades-primary-btn px-3 py-2 text-xs">Review gaps</button>
                  {!hasGeneratedDesign ? (
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-ghost-btn px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Generating…" : "Generate agent design"}</button>
                  ) : (
                    <details className="relative">
                      <summary className="ades-ghost-btn list-none px-3 py-2 text-xs">More</summary>
                      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Regenerate from idea</p>
                        <p className="mt-1 text-xs text-slate-600">Warning: this may replace your current board structure.</p>
                        <button type="button" onClick={() => setShowRegenerateForm((prev) => !prev)} className="ades-ghost-btn mt-2 w-full px-2 py-1.5 text-xs">{showRegenerateForm ? "Hide form" : "Open regenerate form"}</button>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </section>

            {showRegenerateForm ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-3">
                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Idea<textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} /></label>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Audience<input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Constraints<textarea className="ades-input mt-1 min-h-[66px] resize-y" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Policy, latency, budget..." /></label>
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-primary-btn mt-2 w-full px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Regenerating…" : "Regenerate from idea"}</button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="relative">
              <div className={`min-w-0 ${isGuidanceOpen ? "xl:pr-14" : "xl:pr-12"}`}>
                <StudioBoard
                  viewMode={viewMode}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                  }}
                  onAddStepAt={handleInsertMainStep}
                  onAddStepToEnd={() => handleInsertMainStep(nodes.filter(isMainStep).length)}
                  onDuplicateStep={duplicateNodeById}
                  onDeleteNode={deleteNodeById}
                  onAddConnectedNode={addConnectedNode}
                  onOpenDetails={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setDetailsNodeId(nodeId);
                  }}
                  className="h-[65vh] min-h-[500px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-5 pb-16 lg:h-[calc(100vh-14rem)]"
                />
              </div>

              {isGuidanceOpen ? (
                <aside className="hidden absolute right-3 top-3 bottom-12 z-30 w-[340px] overflow-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 xl:block">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Design guidance</p>
                    <button type="button" className="ades-ghost-btn px-2 py-1 text-[11px]" onClick={() => setIsGuidanceOpen(false)}>Collapse</button>
                  </div>
                  <div className="mb-3 space-y-2">
                    <button type="button" onClick={() => void handleCritiqueBoard()} disabled={isCritiquing || nodes.length === 0} className="ades-primary-btn w-full px-3 py-2 text-xs disabled:opacity-60">{isCritiquing ? "Running AI review…" : "Run AI review"}</button>
                    {critiqueError ? <p className="text-xs text-rose-600">{critiqueError}</p> : null}
                    {generationError ? <p className="text-xs text-rose-600">{generationError}</p> : null}
                    {exportError ? <p className="text-xs text-rose-600">{exportError}</p> : null}
                  </div>
                  <div className="space-y-2">
                    {qualityReport.issues.map((issue, index) => (
                      <article key={`${issue}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-xs font-semibold text-amber-900">Quality gap</p>
                        <p className="mt-1 text-xs text-amber-900">{issue}</p>
                        <button type="button" onClick={() => setViewMode(getRecommendedViewFromText(issue))} className="ades-ghost-btn mt-2 px-2 py-1 text-[11px]">Go to step/view</button>
                      </article>
                    ))}
                    {activeCritiqueItems.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.severity} severity</p>
                        <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.recommendation}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setViewMode(getRecommendedViewFromText(`${item.message} ${item.recommendation}`))}>Go to step/view</button>
                          <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setDismissedFindingIds((prev) => [...prev, item.id])}>Dismiss</button>
                        </div>
                      </article>
                    ))}
                    {!qualityReport.issues.length && !activeCritiqueItems.length ? <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">No guidance cards yet. Run AI review for deeper checks.</p> : null}
                  </div>
                </aside>
              ) : null}

              {!isGuidanceOpen ? (
                <button type="button" onClick={() => setIsGuidanceOpen(true)} className="absolute right-3 top-8 hidden h-48 w-11 rounded-xl border border-blue-200 bg-blue-50 px-1 text-center text-xs font-semibold text-blue-800 shadow-sm xl:flex xl:flex-col xl:items-center xl:justify-center">
                  <span className="[writing-mode:vertical-rl]">Guidance</span>
                  <span className="mt-2 rounded-full bg-blue-700 px-2 py-0.5 text-[11px] text-white">{totalGuidanceCount}</span>
                  <span className="mt-2 text-sm">◂</span>
                </button>
              ) : null}
            </section>

            {!hasGeneratedDesign ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Generate agent design</h3>
                    <p className="mt-1 text-xs text-slate-600">Create the first workflow, evals, and safeguards from your idea.</p>
                    <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Idea<textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} /></label>
                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Audience<input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Constraints<textarea className="ades-input mt-1 min-h-[66px] resize-y" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Policy, latency, budget..." /></label>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-primary-btn w-full px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Generating design…" : "Generate agent design"}</button>
                    {generationError ? <p className="mt-2 text-xs text-rose-600">{generationError}</p> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {isGuidanceOpen ? (
              <div className="fixed inset-0 z-30 xl:hidden">
                <button type="button" aria-label="Close guidance" className="absolute inset-0 bg-slate-900/35" onClick={() => setIsGuidanceOpen(false)} />
                <aside className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto rounded-t-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Design guidance</p>
                    <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setIsGuidanceOpen(false)}>Close</button>
                  </div>
                  <button type="button" onClick={() => void handleCritiqueBoard()} disabled={isCritiquing || nodes.length === 0} className="ades-primary-btn mb-3 w-full px-3 py-2 text-sm disabled:opacity-60">{isCritiquing ? "Running AI review…" : "Run AI review"}</button>
                  <div className="space-y-2">
                    {qualityReport.issues.map((issue, index) => (
                      <article key={`${issue}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-sm text-amber-900">{issue}</p>
                      </article>
                    ))}
                    {activeCritiqueItems.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm text-slate-800">{item.message}</p>
                      </article>
                    ))}
                  </div>
                </aside>
              </div>
            ) : null}

            {detailsNodeId ? (
              <div className="fixed inset-y-0 left-0 z-40 w-full max-w-[420px] border-r border-slate-200 bg-white/95 p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Card details</p>
                  <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setDetailsNodeId(null)}>✕</button>
                </div>
                <div className="h-[calc(100%-2.5rem)] overflow-auto pr-1">
                  <BoardInspector viewMode={viewMode} nodeId={detailsNodeId} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
