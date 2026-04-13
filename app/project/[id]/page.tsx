"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { CORE_NODE_TYPES, type AdesBoardSnapshot, type AdesNodeType } from "@/lib/board/types";
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
  project: {
    id: string;
    title: string;
    summary: string;
    status: "generated";
  };
  board: AdesBoardSnapshot;
  assumptions: string[];
  critiqueSeed: string[];
};

type CritiqueResponse = {
  critique: CritiqueResult;
};

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

  const [isLeftToolbarExpanded, setIsLeftToolbarExpanded] = useState(false);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  const [isRightPanelPinned, setIsRightPanelPinned] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const getBoardSnapshot = useAdesBoardStore((state) => state.getBoardSnapshot);
  const isBoardInitialized = useAdesBoardStore((state) => state.isInitialized);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const addNodeWithContent = useAdesBoardStore((state) => state.addNodeWithContent);
  const addNode = useAdesBoardStore((state) => state.addNode);
  const deleteSelectedNode = useAdesBoardStore((state) => state.deleteSelectedNode);

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
        const message = error instanceof Error ? error.message : "Unable to load project.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId, status, user]);

  useEffect(() => {
    if (isLoading || !project || hasHydratedBoardRef.current) {
      return;
    }

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

  const currentBoardHash = useMemo(() => {
    if (!isBoardInitialized || !hasHydratedBoardRef.current) {
      return null;
    }

    return JSON.stringify({ nodes, edges });
  }, [edges, isBoardInitialized, nodes]);

  useEffect(() => {
    if (!user || !project || !currentBoardHash || !hasHydratedBoardRef.current || lastSavedHashRef.current === currentBoardHash) {
      return;
    }

    setSaveState("saving");

    const timer = window.setTimeout(async () => {
      try {
        const board = getBoardSnapshot();
        await saveProjectBoardForUser(project.id, user.uid, board);
        lastSavedHashRef.current = JSON.stringify(board);
        setSaveState("saved");
      } catch (error) {
        console.error(error);
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentBoardHash, getBoardSnapshot, project, user]);

  const saveStateLabel =
    saveState === "saving"
      ? "Saving changes…"
      : saveState === "saved"
      ? "All changes saved"
      : saveState === "error"
      ? "Save failed (retrying on next edit)"
      : "";

  async function handleGenerateBoard() {
    if (!user || !project || isGenerating) {
      return;
    }

    if (!ideaPrompt.trim()) {
      setGenerationError("Add an idea before generating.");
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    try {
      const idToken = await getCurrentUserIdToken();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          ideaPrompt,
          audience,
          constraints,
        }),
      });

      const payload = (await response.json()) as GenerateResponse | { error?: string };

      if (!response.ok || !("board" in payload)) {
        const message = "error" in payload && typeof payload.error === "string" ? payload.error : "Generation failed.";
        throw new Error(message);
      }

      loadBoardSnapshot(payload.board);
      lastSavedHashRef.current = JSON.stringify(payload.board);
      hasHydratedBoardRef.current = true;
      setSaveState("saved");
      setGenerationSummary(payload.project.summary);
      setCritiqueResult(null);
      setProject((previous) =>
        previous
          ? {
              ...previous,
              title: payload.project.title,
              summary: payload.project.summary,
              status: "generated",
              ideaPrompt,
              audience,
              constraints,
              critique: null,
            }
          : previous
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCritiqueBoard() {
    if (!user || !project || isCritiquing) {
      return;
    }

    setCritiqueError(null);
    setIsCritiquing(true);

    try {
      const idToken = await getCurrentUserIdToken();

      const response = await fetch("/api/critique", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          summary: generationSummary || project.summary,
          board: getBoardSnapshot(),
        }),
      });

      const payload = (await response.json()) as CritiqueResponse | { error?: string };

      if (!response.ok || !("critique" in payload)) {
        const message = "error" in payload && typeof payload.error === "string" ? payload.error : "Critique failed.";
        throw new Error(message);
      }

      setCritiqueResult(payload.critique);
      setProject((previous) => (previous ? { ...previous, critique: payload.critique } : previous));
      setIsBottomPanelOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Critique failed.";
      setCritiqueError(message);
    } finally {
      setIsCritiquing(false);
    }
  }

  function handleAddSuggestionToBoard(suggestion: CritiqueSuggestion) {
    addNodeWithContent(suggestion.type as AdesNodeType, suggestion.title, suggestion.body);
  }

  function handleExportMarkdown() {
    if (!project) {
      return;
    }

    const payload: ProjectRecord = { ...project, board: getBoardSnapshot(), critique: critiqueResult ?? project.critique };
    const markdown = createProjectMarkdown(payload);
    downloadTextFile(`${payload.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.md`, markdown, "text/markdown;charset=utf-8");
  }

  function handleExportJson() {
    if (!project) {
      return;
    }

    const payload: ProjectRecord = {
      ...project,
      board: getBoardSnapshot(),
      ideaPrompt,
      audience,
      constraints,
      summary: generationSummary || project.summary,
      critique: critiqueResult ?? project.critique,
    };

    downloadTextFile(`${payload.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.json`, createProjectJson(payload), "application/json;charset=utf-8");
  }

  async function handleExportImage() {
    if (isExportingImage) {
      return;
    }

    setExportError(null);
    setIsExportingImage(true);

    try {
      const element = document.getElementById("ades-canvas-export");
      if (!element) {
        throw new Error("Could not find canvas for image export.");
      }

      const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${(project?.title || "ades-project").replace(/\s+/g, "-").toLowerCase()}-board.png`;
      anchor.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to export image.";
      setExportError(message);
    } finally {
      setIsExportingImage(false);
    }
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    if (!project || !user) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setExportError(null);
      const text = await file.text();
      const parsed = parseImportJson(text);

      loadBoardSnapshot(parsed.board);
      lastSavedHashRef.current = JSON.stringify(parsed.board);
      setIdeaPrompt(parsed.ideaPrompt);
      setAudience(parsed.audience);
      setConstraints(parsed.constraints);
      setGenerationSummary(parsed.summary);
      setCritiqueResult(parsed.critique);
      setProject((previous) =>
        previous
          ? {
              ...previous,
              title: parsed.title || previous.title,
              summary: parsed.summary,
              ideaPrompt: parsed.ideaPrompt,
              audience: parsed.audience,
              constraints: parsed.constraints,
              critique: parsed.critique,
            }
          : previous
      );

      await saveProjectBoardForUser(project.id, user.uid, parsed.board);
      setSaveState("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import JSON.";
      setExportError(message);
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function handleResizeBottomPanel(event: React.MouseEvent<HTMLButtonElement>) {
    const startY = event.clientY;
    const startHeight = bottomPanelHeight;

    function onMove(moveEvent: MouseEvent) {
      const delta = startY - moveEvent.clientY;
      const nextHeight = Math.max(140, Math.min(340, startHeight + delta));
      setBottomPanelHeight(nextHeight);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <AppShell
      title={project?.title ?? (projectId ? `Project ${projectId}` : "Project")}
      subtitle="Minimal board-first studio for planning agent behavior, critique coverage, eval quality, and business impact."
      breadcrumbLabel={project?.title ?? "Studio"}
      actions={
        <Link href={projectId ? `/project/${projectId}/print` : "/dashboard"} className="ades-ghost-btn" aria-disabled={!projectId}>
          Print / export view
        </Link>
      }
    >
      <ProtectedRoute>
        {isLoading ? <div className="ades-panel text-sm text-slate-600">Loading project…</div> : null}

        {!isLoading && (errorMessage || !project) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p>{errorMessage ?? "Project not found or you do not have access."}</p>
            <Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">
              Back to dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.9)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Studio mode</p>
                  <h2 className="text-sm font-semibold text-slate-900 md:text-base">{project.title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">{saveStateLabel || "Ready"}</span>
                  <button type="button" className="ades-ghost-btn px-3 py-2 text-xs" onClick={() => setIsBottomPanelOpen((prev) => !prev)}>
                    {isBottomPanelOpen ? "Hide details" : "Show details"}
                  </button>
                  <button type="button" className="ades-ghost-btn px-3 py-2 text-xs" onClick={() => setIsRightPanelVisible((prev) => !prev)}>
                    {isRightPanelVisible ? "Hide inspector" : "Show inspector"}
                  </button>
                  <button type="button" className="ades-primary-btn px-3 py-2 text-xs" onClick={handleExportJson}>
                    Quick export
                  </button>
                </div>
              </div>
            </section>

            <section className="flex gap-3">
              <aside className={`rounded-2xl border border-slate-200/80 bg-white/85 p-2 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.8)] ${isLeftToolbarExpanded ? "w-[208px]" : "w-[64px]"}`}>
                <div className="mb-2 flex items-center justify-between">
                  {isLeftToolbarExpanded ? <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tools</p> : null}
                  <button type="button" onClick={() => setIsLeftToolbarExpanded((prev) => !prev)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {isLeftToolbarExpanded ? "←" : "→"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {CORE_NODE_TYPES.map((type) => {
                    const theme = getNodeTheme(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addNode(type)}
                        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                      >
                        <span className={`h-2 w-2 rounded-full ${theme.dotClass}`} />
                        {isLeftToolbarExpanded ? theme.label : null}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={deleteSelectedNode}
                    className="flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700"
                  >
                    {isLeftToolbarExpanded ? "Delete selected" : "×"}
                  </button>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="relative">
                  <StudioBoard className="h-[calc(100vh-15rem)] min-h-[620px] overflow-hidden rounded-[26px] border border-slate-200/90 bg-[#f3f5fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]" />

                  {!isRightPanelPinned && isRightPanelVisible ? (
                    <div className="absolute right-3 top-3 z-10 w-[320px] rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.7)] backdrop-blur">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Floating inspector</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsRightPanelPinned(true)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            Pin
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsRightPanelVisible(false)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <BoardInspector />
                    </div>
                  ) : null}
                </div>

                {isBottomPanelOpen ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-3" style={{ height: bottomPanelHeight }}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details · critique · export</h3>
                        <p className="text-xs text-slate-500">Keep this panel hidden for maximum board focus.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onMouseDown={handleResizeBottomPanel}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"
                        >
                          Resize
                        </button>
                        <button type="button" onClick={() => setIsBottomPanelOpen(false)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                          Hide
                        </button>
                      </div>
                    </div>
                    <div className="grid h-[calc(100%-2.2rem)] gap-3 overflow-y-auto md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generate</h4>
                        <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Idea
                          <textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} />
                        </label>
                        <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Audience
                          <input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} />
                        </label>
                        <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Constraints
                          <textarea
                            className="ades-input mt-1 min-h-[66px] resize-y"
                            value={constraints}
                            onChange={(event) => setConstraints(event.target.value)}
                            placeholder="Policy, compliance, latency, budget..."
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleGenerateBoard()}
                          disabled={isGenerating || !ideaPrompt.trim()}
                          className="ades-primary-btn mt-2 w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isGenerating ? "Generating..." : "Generate board"}
                        </button>
                        {generationError ? <p className="mt-1 text-xs text-rose-600">{generationError}</p> : null}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critique</h4>
                          <button
                            type="button"
                            onClick={() => void handleCritiqueBoard()}
                            disabled={isCritiquing || nodes.length === 0}
                            className="ades-primary-btn px-3 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCritiquing ? "Running..." : "Run"}
                          </button>
                        </div>
                        {critiqueError ? <p className="mt-1 text-xs text-rose-600">{critiqueError}</p> : null}
                        {critiqueResult ? <p className="mt-2 text-xs text-slate-600">{critiqueResult.summary}</p> : <p className="mt-2 text-xs text-slate-500">Run critique to surface missing reflections, evals, and metrics.</p>}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Export + import</h4>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button type="button" onClick={handleExportMarkdown} className="ades-ghost-btn px-2 py-2 text-xs">
                            Markdown
                          </button>
                          <button type="button" onClick={handleExportJson} className="ades-ghost-btn px-2 py-2 text-xs">
                            JSON
                          </button>
                          <button type="button" onClick={() => void handleExportImage()} className="ades-ghost-btn px-2 py-2 text-xs" disabled={isExportingImage}>
                            {isExportingImage ? "Exporting..." : "Image"}
                          </button>
                          <button type="button" onClick={() => window.open(`/project/${projectId}/print`, "_blank")} className="ades-ghost-btn px-2 py-2 text-xs" disabled={!projectId}>
                            PDF
                          </button>
                        </div>
                        <input
                          ref={importInputRef}
                          type="file"
                          accept="application/json"
                          onChange={(event) => void handleImportJson(event)}
                          className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-2 file:py-1"
                        />
                        {exportError ? <p className="mt-1 text-xs text-rose-600">{exportError}</p> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {isRightPanelPinned && isRightPanelVisible ? (
                <aside className="w-[336px] rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_10px_32px_-28px_rgba(15,23,42,0.8)]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setIsRightPanelPinned(false)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                        Unpin
                      </button>
                      <button type="button" onClick={() => setIsRightPanelVisible(false)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                        Collapse
                      </button>
                    </div>
                  </div>
                  <BoardInspector />
                </aside>
              ) : null}
            </section>

            {critiqueResult ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Critique findings</h3>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <ul className="space-y-2">
                      {critiqueResult.critiqueItems.map((item) => (
                        <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.severity} severity</p>
                          <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                          <p className="mt-1 text-xs text-slate-600">{item.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <SuggestionSection title="Missing reflections" suggestions={critiqueResult.missingReflections} onAdd={handleAddSuggestionToBoard} />
                    <SuggestionSection title="Missing evals" suggestions={critiqueResult.missingEvals} onAdd={handleAddSuggestionToBoard} />
                    <SuggestionSection title="Missing business metrics" suggestions={critiqueResult.missingBusinessMetrics} onAdd={handleAddSuggestionToBoard} />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}

function SuggestionSection({
  title,
  suggestions,
  onAdd,
}: {
  title: string;
  suggestions: CritiqueSuggestion[];
  onAdd: (suggestion: CritiqueSuggestion) => void;
}) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="mt-2 space-y-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-sm font-medium text-slate-800">{suggestion.title}</p>
            <p className="mt-1 text-xs text-slate-600">{suggestion.body}</p>
            <button type="button" className="ades-ghost-btn mt-2 px-2 py-1 text-xs" onClick={() => onAdd(suggestion)}>
              Add to board
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
