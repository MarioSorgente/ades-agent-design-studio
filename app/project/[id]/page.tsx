"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { createStarterBoard } from "@/lib/board/starter-board";
import { useAdesBoardStore } from "@/lib/board/store";
import { getProjectForUser, saveProjectBoardForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";

const AUTOSAVE_DELAY_MS = 900;

export default function ProjectPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  return (
    <AppShell
      title={project?.title ?? `Project ${params.id}`}
      subtitle="Design and refine your agent map with tasks, reflections, evals, and business metrics."
    >
      <ProtectedRoute>
        {isLoading ? (
          <div className="rounded-xl border border-ades-soft bg-white p-6 text-sm text-slate-600">Loading project…</div>
        ) : null}

        {!isLoading && (errorMessage || !project) ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p>{errorMessage ?? "Project not found or you do not have access."}</p>
            <Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">
              Back to dashboard
            </Link>
          </div>
        ) : null}

        {!isLoading && project ? (
          <div className="grid min-h-[72vh] gap-4 md:grid-cols-[220px_minmax(0,1fr)_320px]">
            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Board guide</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Drag nodes to rearrange the design.</li>
                <li>• Connect nodes to show flow and feedback loops.</li>
                <li>• Select a node to edit details in the inspector.</li>
                <li>• Keep reflection, eval, and business metrics explicit.</li>
              </ul>
              <p
                className={`mt-4 text-xs ${
                  saveState === "error" ? "text-rose-600" : saveState === "saving" ? "text-amber-600" : "text-slate-500"
                }`}
              >
                {saveStateLabel}
              </p>
            </aside>

            <section className="rounded-2xl border border-ades-soft bg-slate-50 p-3">
              <StudioBoard />
            </section>

            <aside className="rounded-2xl border border-ades-soft bg-white p-4">
              <BoardInspector />
            </aside>
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
