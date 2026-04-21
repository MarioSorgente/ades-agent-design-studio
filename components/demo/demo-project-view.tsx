"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { AdesGuideAvatar, type GuideAvatarMood } from "@/components/demo/ades-guide-avatar";
import {
  createDemoBoardSnapshot,
  DEMO_EVAL_NODE_ID,
  DEMO_PRIMARY_STEP_ID,
  demoProjectRecord,
  DEMO_SAFEGUARD_NODE_ID,
} from "@/lib/demo/sample-project";
import { useAdesBoardStore } from "@/lib/board/store";
import type { BoardViewMode } from "@/lib/board/types";
import { analyzeBoardQuality } from "@/lib/board/quality";

type DemoStepId = "overview" | "first-step" | "evals" | "safeguards" | "readiness" | "complete";

type TourStep = {
  id: DemoStepId;
  title: string;
  message: string;
  targetSelector: string;
  viewMode: BoardViewMode;
  focusNodeId?: string;
  attachmentKind?: "evals" | "safeguards";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    title: "Canvas overview",
    message: "Start here — this is the real ADES workspace shown in read-only public demo mode.",
    targetSelector: "[data-demo-target='canvas']",
    viewMode: "flow",
  },
  {
    id: "first-step",
    title: "First step",
    message: "Each step defines part of the workflow with purpose, inputs, outputs, and completion criteria.",
    targetSelector: `[data-node-id='${DEMO_PRIMARY_STEP_ID}']`,
    viewMode: "flow",
    focusNodeId: DEMO_PRIMARY_STEP_ID,
  },
  {
    id: "evals",
    title: "Evals",
    message: "Evals define how success is measured before this agent ships.",
    targetSelector: `[data-step-id='${DEMO_PRIMARY_STEP_ID}'][data-attachment-kind='evals']`,
    viewMode: "flow",
    focusNodeId: DEMO_EVAL_NODE_ID,
    attachmentKind: "evals",
  },
  {
    id: "safeguards",
    title: "Safeguards",
    message: "Safeguards control risk and force escalation before mistakes reach customers.",
    targetSelector: `[data-step-id='${DEMO_PRIMARY_STEP_ID}'][data-attachment-kind='safeguards']`,
    viewMode: "flow",
    focusNodeId: DEMO_SAFEGUARD_NODE_ID,
    attachmentKind: "safeguards",
  },
  {
    id: "readiness",
    title: "Readiness",
    message: "Readiness summarizes whether the design is safe and complete enough for a pilot.",
    targetSelector: "[data-demo-target='readiness']",
    viewMode: "flow",
  },
  {
    id: "complete",
    title: "Demo complete",
    message: "You just explored the real ADES canvas. Ready to build your own agent design?",
    targetSelector: "[data-demo-target='cta']",
    viewMode: "flow",
  },
];

export function DemoProjectView() {
  const [viewMode, setViewMode] = useState<BoardViewMode>("flow");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isFreeExplore, setIsFreeExplore] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const readiness = useMemo(() => analyzeBoardQuality({ nodes, edges }), [edges, nodes]);

  const currentTourStep = TOUR_STEPS[tourStepIndex] ?? TOUR_STEPS[0];

  useEffect(() => {
    const snapshot = createDemoBoardSnapshot();
    loadBoardSnapshot(snapshot);
    setSelectedNodeId(DEMO_PRIMARY_STEP_ID);
  }, [loadBoardSnapshot]);

  useEffect(() => {
    if (!isTourOpen) return;

    setViewMode(currentTourStep.viewMode);
    if (currentTourStep.focusNodeId) {
      setSelectedNodeId(currentTourStep.focusNodeId);
      setIsDetailsPanelOpen(true);
      setFocusNonce(Date.now());
    }
  }, [currentTourStep, isTourOpen]);

  useEffect(() => {
    if (!isTourOpen) {
      setHighlightRect(null);
      return;
    }

    let raf = 0;
    let observer: ResizeObserver | null = null;

    const update = () => {
      const element = document.querySelector(currentTourStep.targetSelector) as HTMLElement | null;
      if (!element) {
        setHighlightRect(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      setHighlightRect(rect);
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    };

    raf = window.requestAnimationFrame(update);
    const root = document.querySelector("[data-demo-target='workspace-root']") as HTMLElement | null;
    observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(update);
    });
    if (root) observer.observe(root);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [currentTourStep.targetSelector, isTourOpen, tourStepIndex]);

  const avatarMood: GuideAvatarMood = !isTourOpen
    ? isFreeExplore
      ? "observing"
      : "idle"
    : currentTourStep.id === "complete"
      ? "complete"
      : "guiding";

  function handleStartTour() {
    setIsFreeExplore(false);
    setIsTourOpen(true);
    setTourStepIndex(0);
  }

  function handleExploreFreely() {
    setIsTourOpen(false);
    setIsFreeExplore(true);
  }

  function handleNext() {
    setTourStepIndex((prev) => {
      const next = Math.min(prev + 1, TOUR_STEPS.length - 1);
      if (next === TOUR_STEPS.length - 1) setIsTourOpen(true);
      return next;
    });
  }

  function handleBack() {
    setTourStepIndex((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="space-y-4">
      <section className="ades-panel flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Public demo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Try ADES in 60 seconds</h1>
          <p className="mt-1 text-sm text-slate-600">This is the actual ADES project workspace in safe read-only mode.</p>
        </div>
        <div className="flex flex-wrap gap-2" data-demo-target="cta">
          <button type="button" className="ades-primary-btn" onClick={handleStartTour}>Start guided demo</button>
          <button type="button" className="ades-ghost-btn" onClick={handleExploreFreely}>Explore freely</button>
          <Link href="/sign-in?redirect=%2Fdashboard" className="ades-ghost-btn">Create your own project</Link>
        </div>
      </section>

      <section className="relative flex min-h-[700px] gap-3" data-demo-target="workspace-root">
        <div className="min-w-0 flex-1" data-demo-target="canvas">
          <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{demoProjectRecord.title}</p>
              <p className="text-xs text-slate-500">Read-only demo project · no sign in required</p>
            </div>
            <div className="flex items-center gap-2" data-demo-target="readiness">
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">Readiness {readiness.score}/100</span>
            </div>
          </div>

          <StudioBoard
            className="h-full min-h-[620px]"
            readOnly
            viewMode={viewMode}
            selectedNodeId={selectedNodeId}
            isDetailsPanelOpen={isDetailsPanelOpen}
            detailsInsetPx={420}
            onSelectNode={setSelectedNodeId}
            onAddStepAt={() => undefined}
            onAddStepToEnd={() => undefined}
            onDuplicateStep={() => undefined}
            onDeleteNode={() => undefined}
            onDeleteAttachment={() => undefined}
            onAddConnectedNode={() => null}
            onOpenDetails={(nodeId) => {
              setSelectedNodeId(nodeId);
              setIsDetailsPanelOpen(true);
            }}
            focusTarget={
              isTourOpen && currentTourStep.focusNodeId
                ? {
                    nodeId: currentTourStep.focusNodeId,
                    attachmentKind: currentTourStep.attachmentKind,
                    nonce: focusNonce,
                  }
                : null
            }
          />
        </div>

        <aside className="hidden w-[400px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 xl:block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
            <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setIsDetailsPanelOpen((prev) => !prev)}>
              {isDetailsPanelOpen ? "Collapse" : "Open"}
            </button>
          </div>
          {isDetailsPanelOpen ? <BoardInspector viewMode={viewMode} nodeId={selectedNodeId} readOnly /> : <p className="text-sm text-slate-500">Inspector collapsed.</p>}
        </aside>

        <aside className="pointer-events-auto fixed bottom-4 right-4 z-[120] w-[330px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <AdesGuideAvatar className="h-10 w-10" mood={avatarMood} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ADES</p>
              <p className="text-xs text-slate-500">
                {isTourOpen ? `Step ${tourStepIndex + 1} / ${TOUR_STEPS.length}` : isFreeExplore ? "Exploring freely" : "Idle"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">{currentTourStep.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {isTourOpen
              ? currentTourStep.message
              : isFreeExplore
                ? "You're exploring the live workspace freely. Click Replay to restart the guided path."
                : "Start here — this canvas is the real ADES design workspace."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleBack} disabled={!isTourOpen || tourStepIndex === 0}>Back</button>
            <button type="button" className="ades-primary-btn px-3 py-1.5 text-xs" onClick={isTourOpen ? handleNext : handleStartTour}>
              {isTourOpen ? (tourStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next") : "Start"}
            </button>
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleExploreFreely}>Explore freely</button>
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleStartTour}>Replay</button>
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={() => setIsTourOpen(false)}>Skip</button>
          </div>
        </aside>

        {isTourOpen && highlightRect ? (
          <div
            className="pointer-events-none fixed z-[110] rounded-2xl border border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.26)]"
            style={{
              top: Math.max(6, highlightRect.top - 8),
              left: Math.max(6, highlightRect.left - 8),
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
