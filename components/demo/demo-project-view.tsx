"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { AdesGuideAvatar, type GuideAvatarMood } from "@/components/demo/ades-guide-avatar";
import {
  createDemoBoardSnapshot,
  DEMO_EVAL_NODE_ID,
  DEMO_EVAL_STEP_ID,
  DEMO_PRIMARY_STEP_ID,
  demoProjectRecord,
  DEMO_REFLECTION_NODE_ID,
  DEMO_REFLECTION_STEP_ID,
  DEMO_SAFEGUARD_NODE_ID,
  DEMO_SAFEGUARD_STEP_ID,
} from "@/lib/demo/sample-project";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNode, BoardViewMode } from "@/lib/board/types";
import { analyzeBoardQuality } from "@/lib/board/quality";

type DemoStepId = "overview" | "step" | "evals" | "reflections" | "safeguards" | "readiness" | "complete";

type TourStep = {
  id: DemoStepId;
  title: string;
  message: string;
  targetSelector: string;
  viewMode: BoardViewMode;
  focusNodeId?: string;
  attachmentKind?: "evals" | "reflections" | "safeguards";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    title: "Canvas",
    message: "This is the workflow canvas. It shows how the agent operates before anything is built.",
    targetSelector: "[data-demo-target='canvas']",
    viewMode: "flow",
  },
  {
    id: "step",
    title: "Step details",
    message: "Each step defines a specific part of the workflow, including purpose, inputs, and outputs.",
    targetSelector: `[data-node-id='${DEMO_PRIMARY_STEP_ID}']`,
    viewMode: "flow",
    focusNodeId: DEMO_PRIMARY_STEP_ID,
  },
  {
    id: "evals",
    title: "Evals",
    message: "Evals define how success is measured for this design.",
    targetSelector: `[data-step-id='${DEMO_EVAL_STEP_ID}'][data-attachment-kind='evals']`,
    viewMode: "flow",
    focusNodeId: DEMO_EVAL_NODE_ID,
    attachmentKind: "evals",
  },
  {
    id: "reflections",
    title: "Reflections",
    message: "Reflections capture assumptions, open questions, and design reasoning.",
    targetSelector: `[data-step-id='${DEMO_REFLECTION_STEP_ID}'][data-attachment-kind='reflections']`,
    viewMode: "flow",
    focusNodeId: DEMO_REFLECTION_NODE_ID,
    attachmentKind: "reflections",
  },
  {
    id: "safeguards",
    title: "Safeguards",
    message: "Safeguards reduce risk and force escalation before mistakes reach customers.",
    targetSelector: `[data-step-id='${DEMO_SAFEGUARD_STEP_ID}'][data-attachment-kind='safeguards']`,
    viewMode: "flow",
    focusNodeId: DEMO_SAFEGUARD_NODE_ID,
    attachmentKind: "safeguards",
  },
  {
    id: "readiness",
    title: "Readiness",
    message: "Readiness shows how complete the design is and what still needs work.",
    targetSelector: "[data-demo-target='readiness']",
    viewMode: "flow",
  },
  {
    id: "complete",
    title: "Demo complete",
    message: "You've seen how ADES works. Ready to design your own workflow?",
    targetSelector: "[data-demo-target='completion-cta']",
    viewMode: "flow",
  },
];

export function DemoProjectView() {
  const [viewMode, setViewMode] = useState<BoardViewMode>("flow");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isFreeExplore, setIsFreeExplore] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [contextMessage, setContextMessage] = useState<string | null>(null);

  const loadBoardSnapshot = useAdesBoardStore((state) => state.loadBoardSnapshot);
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const readiness = useMemo(() => analyzeBoardQuality({ nodes, edges }), [edges, nodes]);

  const currentTourStep = TOUR_STEPS[tourStepIndex] ?? TOUR_STEPS[0];
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

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
  }, [currentTourStep.targetSelector, isTourOpen]);

  function finishTour() {
    setIsTourOpen(false);
    setIsFreeExplore(true);
    setHasCompletedTour(true);
    setHighlightRect(null);
    setContextMessage("Demo complete. You can replay the guide or keep exploring the workspace.");
  }

  function handleStartTour() {
    setIsFreeExplore(false);
    setHasCompletedTour(false);
    setIsTourOpen(true);
    setTourStepIndex(0);
    setContextMessage(null);
  }

  function handleExploreFreely() {
    setIsTourOpen(false);
    setIsFreeExplore(true);
    setHighlightRect(null);
    setContextMessage("Free explore mode is active. Click any step, eval, reflection, or safeguard.");
  }

  function handleNext() {
    if (!isTourOpen) {
      handleStartTour();
      return;
    }
    if (tourStepIndex >= TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    setTourStepIndex((prev) => prev + 1);
  }

  function handleBack() {
    setTourStepIndex((prev) => Math.max(0, prev - 1));
  }

  function handleSelectedNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
    if (!nodeId) return;

    const selectedNode = nodeById.get(nodeId);
    if (!selectedNode) return;
    setContextMessage(messageForNode(selectedNode));
  }

  const avatarMood: GuideAvatarMood = isTourOpen
    ? tourStepIndex === TOUR_STEPS.length - 1
      ? "complete"
      : "guiding"
    : hasCompletedTour
      ? "complete"
      : contextMessage
        ? "focused"
        : isFreeExplore
          ? "observing"
          : "idle";

  return (
    <div className="space-y-4">
      <section className="ades-panel px-6 py-5">
        <div className="max-w-4xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{demoProjectRecord.title}</h1>
          <p className="text-sm text-slate-700">{demoProjectRecord.summary}</p>
          <p className="text-sm text-slate-600">
            Design the workflow, inspect each step, and define evals, reflections, safeguards, and readiness before you build.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-medium text-slate-600">
            {["Workflow", "Evals", "Reflections", "Safeguards", "Readiness"].map((feature) => (
              <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        data-demo-target="completion-cta"
        className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 px-5 py-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]"
      >
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Create your own project for free</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Sign in and try ADES for free. Build your own workflow and let ADES generate evals, reflections, and safeguards for each step.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sign-in?redirect=%2Fdashboard" className="ades-primary-btn">Start free</Link>
          <button type="button" className="ades-ghost-btn" onClick={handleStartTour}>Start guided demo</button>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-600">No payment required to start.</p>
      </section>

      <section className="relative flex min-h-[700px] gap-3" data-demo-target="workspace-root">
        <div className="min-w-0 flex-1" data-demo-target="canvas">
          <div className="mb-2 flex items-center justify-end rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2" data-demo-target="readiness">
              <button
                type="button"
                onClick={() => setContextMessage("Readiness shows how complete this design is before piloting.")}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                Readiness {readiness.score}/100
              </button>
            </div>
          </div>

          <StudioBoard
            className="h-full min-h-[620px]"
            readOnly
            viewMode={viewMode}
            selectedNodeId={selectedNodeId}
            isDetailsPanelOpen={isDetailsPanelOpen}
            detailsInsetPx={420}
            onSelectNode={handleSelectedNode}
            onAddStepAt={() => undefined}
            onAddStepToEnd={() => undefined}
            onDuplicateStep={() => undefined}
            onDeleteNode={() => undefined}
            onDeleteAttachment={() => undefined}
            onAddConnectedNode={() => null}
            onOpenDetails={(nodeId) => {
              handleSelectedNode(nodeId);
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

        <aside className="hidden w-[400px] shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 xl:block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
            <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setIsDetailsPanelOpen((prev) => !prev)}>
              {isDetailsPanelOpen ? "Collapse" : "Open"}
            </button>
          </div>
          {isDetailsPanelOpen ? <BoardInspector viewMode={viewMode} nodeId={selectedNodeId} readOnly /> : <p className="text-sm text-slate-500">Inspector collapsed.</p>}
        </aside>

        <aside className="pointer-events-auto fixed bottom-4 right-4 z-[120] w-[360px] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <AdesGuideAvatar className="h-14 w-14" mood={avatarMood} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ADES</p>
                <p className="text-xs text-slate-500">
                  {isTourOpen
                    ? `Step ${tourStepIndex + 1} / ${TOUR_STEPS.length}`
                    : hasCompletedTour
                      ? "Demo completed"
                      : isFreeExplore
                        ? "Exploring freely"
                        : "Ready to guide"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ades-ghost-btn px-2.5 py-1 text-xs"
              onClick={() => {
                setIsTourOpen(false);
                setHighlightRect(null);
              }}
            >
              Skip
            </button>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">{isTourOpen ? currentTourStep.title : hasCompletedTour ? "Demo completed" : "Guided assistant"}</p>
          <p className="mt-1 text-sm text-slate-600">
            {isTourOpen
              ? currentTourStep.message
              : contextMessage ??
                (hasCompletedTour
                  ? "You've seen how ADES works. Replay the guide or keep exploring this sample workflow."
                  : isFreeExplore
                    ? "Explore the workspace freely, or replay the guide for a structured walkthrough."
                    : "Start the walkthrough to see how ADES helps teams design reliable agents.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleBack} disabled={!isTourOpen || tourStepIndex === 0}>Back</button>
            <button type="button" className="ades-primary-btn px-3 py-1.5 text-xs" onClick={handleNext}>
              {isTourOpen ? (tourStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next") : "Start"}
            </button>
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleExploreFreely}>Explore freely</button>
            <button type="button" className="ades-ghost-btn px-3 py-1.5 text-xs" onClick={handleStartTour}>Replay</button>
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

function messageForNode(node: AdesNode) {
  if (node.type === "eval") return "These evals define how quality is measured.";
  if (node.type === "reflection") return "Reflections capture the team's reasoning and open questions.";
  if (node.type === "risk") return "Safeguards reduce risk before launch.";
  if (node.type === "goal" || node.type === "task" || node.type === "handoff") return "You're looking at a workflow step.";
  return "Explore this block to understand how the design works.";
}
