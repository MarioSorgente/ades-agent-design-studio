"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
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

export default function ProjectPage({ params }: { params: { id: string } }) {
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

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const getBoardSnapshot = useAdesBoardStore((state) => state.getBoardSnapshot);
  const isBoardInitialized = useAdesBoardStore((state) => state.isInitialized);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const addNodeWithContent = useAdesBoardStore((state) => state.addNodeWithContent);

  const hasHydratedBoardRef = useRef(false);
  const lastSavedHashRef = useRef<string | null>(null);

  useEffect(() => {
    hasHydratedBoardRef.current = false;
    lastSavedHashRef.current = null;

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

  useEffect(() => {
    if (isLoading || !project) {
      return;
    }

    if (hasHydratedBoardRef.current) {
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
    if (!user || !project || !currentBoardHash || !hasHydratedBoardRef.current) {
      return;
    }

    if (lastSavedHashRef.current === currentBoardHash) {
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

  return (
    <AppShell
      title={project?.title ?? `Project ${params.id}`}
      subtitle="Premium workspace for planning agent behavior, critique coverage, eval quality, and business impact."
      breadcrumbLabel={project?.title ?? "Studio"}
      actions={
        <Link href={`/project/${params.id}/print`} className="ades-ghost-btn">
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
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            <aside className="ades-panel h-fit space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Project panel</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{project.title}</h2>
                <p className="mt-2 text-sm text-slate-600">Generate a full board with reflections, critique seeds, evals, and business metrics.</p>
                <p
                  className={`mt-3 text-xs ${
                    saveState === "error" ? "text-rose-600" : saveState === "saving" ? "text-amber-600" : "text-slate-500"
                  }`}
                >
                  {saveStateLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generate design</h3>
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Idea
                    <textarea
                      className="ades-input mt-1 min-h-[96px] resize-y"
                      value={ideaPrompt}
                      onChange={(event) => setIdeaPrompt(event.target.value)}
                      placeholder="Describe the agent idea in plain language."
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Audience
                    <input
                      className="ades-input mt-1"
                      value={audience}
                      onChange={(event) => setAudience(event.target.value)}
                      placeholder="Who is this design for?"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Constraints (optional)
                    <textarea
                      className="ades-input mt-1 min-h-[72px] resize-y"
                      value={constraints}
                      onChange={(event) => setConstraints(event.target.value)}
                      placeholder="Policy limits, compliance, latency, budget, etc."
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleGenerateBoard()}
                    disabled={isGenerating || !ideaPrompt.trim()}
                    className="ades-primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? "Generating board..." : "Generate board"}
                  </button>
                  {generationError ? <p className="text-xs text-rose-600">{generationError}</p> : null}
                  {generationSummary ? <p className="text-xs text-slate-600">{generationSummary}</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Block types</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CORE_NODE_TYPES.map((type) => {
                    const theme = getNodeTheme(type);
                    return (
                      <span key={type} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${theme.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
                        {theme.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Studio canvas</h2>
                    <p className="text-xs text-slate-500">Miro-like board for tasks, reflections, critique loops, risks, evals, and business metrics.</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">Exports · Milestone 8</div>
                </div>
              </div>
              <StudioBoard />
            </section>

            <aside className="ades-panel space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critique</h3>
                    <p className="mt-1 text-xs text-slate-600">Run gap analysis for reflections, evals, and business metrics.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCritiqueBoard()}
                    disabled={isCritiquing || nodes.length === 0}
                    className="ades-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCritiquing ? "Running..." : "Run critique"}
                  </button>
                </div>
                {critiqueError ? <p className="mt-2 text-xs text-rose-600">{critiqueError}</p> : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Export + import</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleExportMarkdown} className="ades-ghost-btn px-2 py-2 text-xs">
                    Export Markdown
                  </button>
                  <button type="button" onClick={handleExportJson} className="ades-ghost-btn px-2 py-2 text-xs">
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportImage()}
                    className="ades-ghost-btn px-2 py-2 text-xs"
                    disabled={isExportingImage}
                  >
                    {isExportingImage ? "Exporting..." : "Export image"}
                  </button>
                  <button type="button" onClick={() => window.open(`/project/${params.id}/print`, "_blank")} className="ades-ghost-btn px-2 py-2 text-xs">
                    Print / PDF
                  </button>
                </div>
                <div className="mt-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    onChange={(event) => void handleImportJson(event)}
                    className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-2 file:py-1"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Import JSON to replace current board with a saved ADES export.</p>
                </div>
                {exportError ? <p className="mt-2 text-xs text-rose-600">{exportError}</p> : null}
              </div>

              {critiqueResult ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-600">{critiqueResult.summary}</p>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Findings</h4>
                    <ul className="mt-2 space-y-2">
                      {critiqueResult.critiqueItems.map((item) => (
                        <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.severity} severity</p>
                          <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                          <p className="mt-1 text-xs text-slate-600">{item.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <SuggestionSection title="Missing reflections" suggestions={critiqueResult.missingReflections} onAdd={handleAddSuggestionToBoard} />
                  <SuggestionSection title="Missing evals" suggestions={critiqueResult.missingEvals} onAdd={handleAddSuggestionToBoard} />
                  <SuggestionSection
                    title="Missing business metrics"
                    suggestions={critiqueResult.missingBusinessMetrics}
                    onAdd={handleAddSuggestionToBoard}
                  />
                </div>
              ) : null}

              <BoardInspector />
            </aside>
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
