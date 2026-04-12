"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { CORE_NODE_TYPES, type AdesBoardSnapshot } from "@/lib/board/types";
import { getNodeTheme } from "@/lib/board/node-theme";
import { createStarterBoard } from "@/lib/board/starter-board";
import { useAdesBoardStore } from "@/lib/board/store";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { getProjectForUser, saveProjectBoardForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

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

  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const getBoardSnapshot = useAdesBoardStore((state) => state.getBoardSnapshot);
  const isBoardInitialized = useAdesBoardStore((state) => state.isInitialized);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);

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
    setGenerationSummary("");
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
      setProject((previous) =>
        previous
          ? {
              ...previous,
              title: payload.project.title,
              summary: payload.project.summary,
              status: "generated",
              ideaPrompt,
              audience,
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

  return (
    <AppShell
      title={project?.title ?? `Project ${params.id}`}
      subtitle="Premium workspace for planning agent behavior, critique coverage, eval quality, and business impact."
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
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">AI generation · Milestone 6</div>
                </div>
              </div>
              <StudioBoard />
            </section>

            <aside className="ades-panel">
              <BoardInspector />
            </aside>
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
