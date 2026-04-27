"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { useParams, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { UsageGateModal, type UsageGateTrigger } from "@/components/UsageGateModal";
import { AppShell } from "@/components/app-shell";
import { BoardInspector } from "@/components/board/board-inspector";
import { StudioBoard } from "@/components/board/studio-board";
import { type AdesBoardSnapshot, type AdesEdge, type AdesNode, type BoardViewMode, createNode } from "@/lib/board/types";
import { createStarterBoard } from "@/lib/board/starter-board";
import { useAdesBoardStore } from "@/lib/board/store";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { getProjectForUser, getUsageSummaryForUser, saveProjectBoardForUser, type ProjectRecord } from "@/lib/firebase/firestore";
import { useAuthStore } from "@/lib/auth/store";
import type { CritiqueResult } from "@/lib/critique/types";
import { createProjectJson, createProjectMarkdown, downloadTextFile, parseImportJson } from "@/lib/export/project-export";
import { normalizeRouteParam } from "@/lib/utils/route-params";
import { analyzeBoardQuality, type QualityIssue } from "@/lib/board/quality";

const AUTOSAVE_DELAY_MS = 900;

type GenerateResponse = {
  project: { id: string; title: string; summary: string; status: "generated" };
  board: AdesBoardSnapshot;
  quality?: { score: number; issues: string[] };
  gated?: boolean;
  trigger?: UsageGateTrigger;
};

type CritiqueResponse = { critique: CritiqueResult; gated?: boolean; trigger?: UsageGateTrigger };
type ReadinessDimensionItem = { key: string; label: string; ready: boolean; note: string };
const blueprintFieldTips = {
  initiative: "What agent are you designing?",
  title: "A short internal name for this project.",
  targetUser: "Who is this agent for, or who will interact with it?",
  contextProblem: "What current pain, inefficiency, or need justifies this agent?",
  desiredOutcome: "What successful change should happen if this agent works well?",
  constraints: "What limits should shape the design? For example policy, latency, budget, tools, channels, or languages.",
  humanInvolvement: "When should a human review, approve, or take over?",
  riskLevel: "How risky would failure be in this workflow? Use this only if it meaningfully affects safeguards, evals, or human oversight.",
} as const;

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

function getReadinessChecklist(qualityReport: ReturnType<typeof analyzeBoardQuality>, critiqueResult: CritiqueResult | null): ReadinessDimensionItem[] {
  const critiqueByDimension = new Map<string, number>();
  critiqueResult?.critiqueItems.forEach((item) => {
    item.affectedDimensions.forEach((dimension) => {
      critiqueByDimension.set(dimension, (critiqueByDimension.get(dimension) ?? 0) + 1);
    });
  });

  return [
    { key: "workflow_clarity", label: "Workflow clarity", ready: qualityReport.workflowClarity.passed, note: qualityReport.workflowClarity.issues[0] ?? "Main steps have clear purpose, inputs, outputs, and completion criteria." },
    { key: "decomposition_quality", label: "Decomposition quality", ready: qualityReport.decompositionQuality.passed, note: qualityReport.decompositionQuality.issues[0] ?? "Step granularity is practical for build planning." },
    { key: "reflection_logic", label: "Reflection logic", ready: qualityReport.reflectionFeedback.passed, note: qualityReport.reflectionFeedback.issues[0] ?? "Reflection points are used intentionally where uncertainty exists." },
    { key: "eval_coverage", label: "Eval coverage", ready: qualityReport.evalReadiness.passed, note: qualityReport.evalReadiness.issues[0] ?? "Evals cover end-to-end and critical-step outcomes." },
    { key: "safeguard_coverage", label: "Safeguard coverage", ready: qualityReport.safeguardsApplicable ? qualityReport.safeguardsPct >= 75 : true, note: qualityReport.safeguardsApplicable ? `Safeguarded risky steps: ${qualityReport.safeguardedRiskySteps}/${qualityReport.riskyOrUncertainSteps}.` : "No risky steps detected yet." },
    {
      key: "handoff_readiness",
      label: "Handoff readiness",
      ready: qualityReport.workflowClarity.passed && qualityReport.evalReadiness.passed,
      note: qualityReport.workflowClarity.passed && qualityReport.evalReadiness.passed ? "Workflow and eval intent are clear enough for build planning handoff." : "Clarify workflow outputs and eval plan before final handoff.",
    },
  ].map((item) => {
    const critiqueCount = critiqueByDimension.get(item.key) ?? 0;
    return critiqueCount > 0 ? { ...item, ready: false, note: `${item.note} ${critiqueCount} critique finding(s) currently affect this dimension.` } : item;
  });
}

function BlueprintLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      <span>{label}</span>
      <TooltipInfo text={tooltip} />
    </p>
  );
}

function TooltipInfo({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label={text}
        title={text}
      >
        i
      </button>
      <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
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
  const [contextProblem, setContextProblem] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [humanInvolvement, setHumanInvolvement] = useState("");
  const [riskLevel, setRiskLevel] = useState<"" | "low" | "medium" | "high">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSummary, setGenerationSummary] = useState<string>("");
  const [critiqueResult, setCritiqueResult] = useState<CritiqueResult | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [dismissedFindingIds, setDismissedFindingIds] = useState<string[]>([]);
  const [addNotice, setAddNotice] = useState<string | null>(null);
  const [gateModal, setGateModal] = useState<{ isOpen: boolean; trigger: UsageGateTrigger }>({ isOpen: false, trigger: "ai_review" });
  const [isAdminBypass, setIsAdminBypass] = useState(false);
  const [hasExistingProject, setHasExistingProject] = useState(false);

  function toUserTriggeredModal(trigger?: UsageGateTrigger): UsageGateTrigger {
    if (trigger === "generate_design") return "second_project";
    return trigger ?? "second_project";
  }

  const [viewMode, setViewMode] = useState<BoardViewMode>("flow");
  const [focusTarget, setFocusTarget] = useState<{
    nodeId: string;
    attachmentKind?: "evals" | "reflections" | "safeguards";
    nonce: number;
  } | null>(null);

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
  const selectedNode = useMemo(() => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null), [nodes, selectedNodeId]);
  const selectedAttachmentKind = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === "eval") return "eval" as const;
    if (selectedNode.type === "reflection") return "reflection" as const;
    if (selectedNode.type === "risk") return "safeguard" as const;
    return null;
  }, [selectedNode]);

  const hasHydratedBoardRef = useRef(false);
  const lastSavedHashRef = useRef<string | null>(null);

  async function handleSaveBoard() {
    if (!user || !project || !hasHydratedBoardRef.current) return;
    setSaveState("saving");
    try {
      const board = getBoardSnapshot();
      await saveProjectBoardForUser(project.id, user.uid, board);
      lastSavedHashRef.current = JSON.stringify(board);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

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
    if (!user) return;
    void getUsageSummaryForUser(user.uid).then((summary) => {
      if (!summary) return;
      setIsAdminBypass(summary.isAdminBypass);
      setHasExistingProject(summary.hasExistingProject);
    });
  }, [user]);

  useEffect(() => {
    if (isLoading || !project || hasHydratedBoardRef.current) return;
    const initialBoard = project.board ?? createStarterBoard();
    loadBoardSnapshot(initialBoard);
    lastSavedHashRef.current = JSON.stringify(initialBoard);
    hasHydratedBoardRef.current = true;
    setSaveState("saved");
    setIdeaPrompt(project.ideaPrompt);
    setAudience(project.audience);
    setContextProblem(project.contextProblem ?? "");
    setDesiredOutcome(project.desiredOutcome ?? "");
    setConstraints(project.constraints);
    setHumanInvolvement(project.humanInvolvement ?? "");
    setRiskLevel(project.riskLevel ?? "");
    setGenerationSummary(project.summary);
    setCritiqueResult(project.critique);
  }, [isLoading, loadBoardSnapshot, project]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "flow" || requestedView === "eval") {
      setViewMode(requestedView);
    }
  }, [searchParams]);

  const currentBoardHash = useMemo(() => (!isBoardInitialized || !hasHydratedBoardRef.current ? null : JSON.stringify({ nodes, edges })), [edges, isBoardInitialized, nodes]);

  const qualityReport = useMemo(() => analyzeBoardQuality({ nodes, edges }), [edges, nodes]);
  const activeCritiqueItems = useMemo(() => critiqueResult?.critiqueItems.filter((item) => !dismissedFindingIds.includes(item.id)) ?? [], [critiqueResult, dismissedFindingIds]);
  const totalGuidanceCount = qualityReport.actionableIssues.length + activeCritiqueItems.length;
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

  const saveStateLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Unsaved";
  const hasGeneratedDesign = project?.status === "generated" || nodes.length > 0;

  function handleGoToGuidanceTarget(issue: QualityIssue) {
    const target = issue.target;
    setIsGuidanceOpen(false);

    if (!target) {
      setViewMode("flow");
      return;
    }

    setViewMode(target.view);
    if (target.nodeId) {
      setSelectedNodeId(target.nodeId);
      setFocusTarget({
        nodeId: target.nodeId,
        attachmentKind: target.attachmentKind,
        nonce: Date.now(),
      });
    } else {
      setSelectedNodeId(null);
    }
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

  async function handleGenerateBoard() {
    if (!user || !project || isGenerating) return;
    if (!ideaPrompt.trim()) return setGenerationError("Add an idea before generating.");
    if (project.status === "generated" && !isAdminBypass) {
      setGateModal({ isOpen: true, trigger: "regenerate" });
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);
    try {
      const idToken = await getCurrentUserIdToken();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ projectId: project.id, ideaPrompt, audience, contextProblem, desiredOutcome, constraints, humanInvolvement, riskLevel }),
      });

      const payload = (await response.json()) as GenerateResponse | { error?: string };
      if (!response.ok || !("board" in payload)) {
        if ("gated" in payload && payload.gated) {
          setGateModal({ isOpen: true, trigger: toUserTriggeredModal(payload.trigger as UsageGateTrigger | undefined) });
          return;
        }
        throw new Error("error" in payload && payload.error ? payload.error : "Generation failed.");
      }

      loadBoardSnapshot(payload.board);
      lastSavedHashRef.current = JSON.stringify(payload.board);
      setSaveState("saved");
      setGenerationSummary(payload.project.summary);
      setCritiqueResult(null);
      setProject((previous) =>
        previous
          ? { ...previous, title: payload.project.title, summary: payload.project.summary, status: "generated", ideaPrompt, audience, contextProblem, desiredOutcome, constraints, humanInvolvement, riskLevel, critique: null }
          : previous,
      );
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCritiqueBoard() {
    if (!user || !project || isCritiquing) return;
    if (!isAdminBypass) {
      setGateModal({ isOpen: true, trigger: "ai_review" });
      return;
    }
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
      if (!response.ok || !("critique" in payload)) {
        if ("gated" in payload && payload.gated) {
          setGateModal({ isOpen: true, trigger: (payload.trigger as UsageGateTrigger) ?? "ai_review" });
          return;
        }
        throw new Error("error" in payload && payload.error ? payload.error : "Critique failed.");
      }

      setCritiqueResult(payload.critique);
      setDismissedFindingIds([]);
      setProject((previous) => (previous ? { ...previous, critique: payload.critique } : previous));
      setViewMode("flow");
    } catch (error) {
      setCritiqueError(error instanceof Error ? error.message : "Critique failed.");
    } finally {
      setIsCritiquing(false);
    }
  }

  const handleExportMarkdown = () => project && downloadTextFile(`${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.md`, createProjectMarkdown({ ...project, board: getBoardSnapshot(), critique: critiqueResult ?? project.critique }), "text/markdown;charset=utf-8");
  const handleExportJson = () =>
    project &&
    downloadTextFile(
      `${project.title.replace(/\s+/g, "-").toLowerCase() || "ades-project"}.json`,
      createProjectJson({
        ...project,
        board: getBoardSnapshot(),
        ideaPrompt,
        audience,
        contextProblem,
        desiredOutcome,
        constraints,
        humanInvolvement,
        riskLevel,
        summary: generationSummary || project.summary,
        critique: critiqueResult ?? project.critique,
      }),
      "application/json;charset=utf-8",
    );

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
      setContextProblem(parsed.contextProblem);
      setDesiredOutcome(parsed.desiredOutcome);
      setConstraints(parsed.constraints);
      setHumanInvolvement(parsed.humanInvolvement);
      setRiskLevel(parsed.riskLevel);
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
              contextProblem: parsed.contextProblem,
              desiredOutcome: parsed.desiredOutcome,
              constraints: parsed.constraints,
              humanInvolvement: parsed.humanInvolvement,
              riskLevel: parsed.riskLevel,
              critique: parsed.critique,
            }
          : previous,
      );
      await saveProjectBoardForUser(project.id, user.uid, parsed.board);
      setSaveState("saved");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to import JSON.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function handleOpenDetails(nodeId: string) {
    setSelectedNodeId(nodeId);
    setIsDetailsPanelOpen(true);
  }

  function handleDeleteAttachment(nodeId: string, kind: "eval" | "reflection" | "safeguard") {
    const confirmed = window.confirm(`Delete this ${kind}?`);
    if (!confirmed) return;

    const parentStepId = edges.find((edge) => edge.target === nodeId)?.source ?? null;
    const wasSelected = selectedNodeId === nodeId;

    deleteNodeById(nodeId);

    if (wasSelected) {
      setSelectedNodeId(parentStepId);
      setIsDetailsPanelOpen(false);
    }
  }

  useEffect(() => {
    if (!addNotice) return;
    const timer = window.setTimeout(() => setAddNotice(null), 1700);
    return () => window.clearTimeout(timer);
  }, [addNotice]);

  return (
    <AppShell title={project?.title ?? (projectId ? `Project ${projectId}` : "Project")} actions={<Link href={projectId ? `/project/${projectId}/print` : "/dashboard"} className="ades-ghost-btn px-2.5 py-1.5 text-xs" aria-disabled={!projectId}>Print</Link>} compact>
      <ProtectedRoute>
        <UsageGateModal
          isOpen={gateModal.isOpen}
          trigger={gateModal.trigger}
          hasExistingProject={hasExistingProject}
          onClose={() => setGateModal((prev) => ({ ...prev, isOpen: false }))}
          onOpenExisting={() => setGateModal((prev) => ({ ...prev, isOpen: false }))}
        />
        {isLoading ? <div className="ades-panel text-sm text-slate-600">Loading project…</div> : null}

        {!isLoading && (errorMessage || !project) ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"><p>{errorMessage ?? "Project not found or you do not have access."}</p><Link href="/dashboard" className="mt-3 inline-block font-semibold text-rose-900 underline">Back to dashboard</Link></div> : null}

        {!isLoading && project ? (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <section className="sticky top-2 z-20 rounded-xl border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{saveStateLabel}</span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Readiness checklist</span>
                  <div className="ml-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setViewMode("flow")} className={`rounded-md px-2 py-1 text-xs font-medium ${viewMode === "flow" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                      Flow
                    </button>
                    <button type="button" onClick={() => setViewMode("eval")} className={`rounded-md px-2 py-1 text-xs font-medium ${viewMode === "eval" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                      Evals
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void handleCritiqueBoard()} disabled={isCritiquing || !hasGeneratedDesign} className="ades-ghost-btn px-2.5 py-1.5 text-xs disabled:opacity-60">
                    {isCritiquing ? "Running critique…" : "Run critique"}
                  </button>
                  <details className="relative">
                    <summary className="ades-ghost-btn list-none cursor-pointer select-none px-2.5 py-1.5 text-xs [&::-webkit-details-marker]:hidden">Export</summary>
                    <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button type="button" onClick={handleExportMarkdown} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Export Markdown</button>
                      <button type="button" onClick={handleExportJson} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Export JSON</button>
                      <button type="button" onClick={() => void handleExportImage()} disabled={isExportingImage} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">{isExportingImage ? "Exporting image…" : "Export image"}</button>
                      <button type="button" onClick={() => window.open(`/project/${projectId}/print`, "_blank")} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Open PDF view</button>
                      <label className="mt-1 block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">Import JSON<input ref={importInputRef} type="file" accept="application/json" onChange={(event) => void handleImportJson(event)} className="hidden" /></label>
                    </div>
                  </details>

                  <Link href="/dashboard" className="ades-ghost-btn px-2.5 py-1.5 text-xs">Back</Link>
                  {!hasGeneratedDesign ? (
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-ghost-btn px-2.5 py-1.5 text-xs disabled:opacity-60">{isGenerating ? "Generating…" : "Generate"}</button>
                  ) : (
                    <details className="relative">
                      <summary className="ades-ghost-btn list-none cursor-pointer select-none px-2.5 py-1.5 text-xs [&::-webkit-details-marker]:hidden">More</summary>
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
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-2">
                  <div>
                    <BlueprintLabel label="Initiative" tooltip={blueprintFieldTips.initiative} />
                    <textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} placeholder="Example: Agent for triaging support tickets" />
                  </div>
                  <div>
                    <BlueprintLabel label="Project title (optional)" tooltip={blueprintFieldTips.title} />
                    <input className="ades-input mt-1" value={project.title} readOnly aria-label="Project title (optional)" />
                  </div>
                  <div>
                    <BlueprintLabel label="Target user" tooltip={blueprintFieldTips.targetUser} />
                    <input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Example: Support operations leads" />
                  </div>
                  <div>
                    <BlueprintLabel label="Context / problem" tooltip={blueprintFieldTips.contextProblem} />
                    <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={contextProblem} onChange={(event) => setContextProblem(event.target.value)} placeholder="Example: Slow ticket routing and uneven quality" />
                  </div>
                  <div>
                    <BlueprintLabel label="Desired outcome" tooltip={blueprintFieldTips.desiredOutcome} />
                    <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} placeholder="Example: Faster triage with consistent escalation quality" />
                  </div>
                  <div>
                    <BlueprintLabel label="Constraints (optional)" tooltip={blueprintFieldTips.constraints} />
                    <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Example: PII policy, 2s latency, existing CRM only" />
                  </div>
                  <div>
                    <BlueprintLabel label="Human involvement / escalation" tooltip={blueprintFieldTips.humanInvolvement} />
                    <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={humanInvolvement} onChange={(event) => setHumanInvolvement(event.target.value)} placeholder="Example: Human review for low confidence or policy flags" />
                  </div>
                  <div>
                    <BlueprintLabel label="Risk level (optional)" tooltip={blueprintFieldTips.riskLevel} />
                    <select className="ades-input mt-1" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as "" | "low" | "medium" | "high")}><option value="">Not specified</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-primary-btn mt-2 w-full px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Regenerating…" : "Regenerate from blueprint"}</button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Readiness review (checklist-first)</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {getReadinessChecklist(qualityReport, critiqueResult).map((item) => (
                  <article key={item.key} className={`rounded-xl border p-2.5 ${item.ready ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                    <p className="text-xs font-semibold text-slate-900">{item.ready ? "✓" : "•"} {item.label}</p>
                    <p className="mt-1 text-[11px] text-slate-700">{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="relative flex min-h-0 flex-1">
              <div className={`min-w-0 flex-1 ${isGuidanceOpen ? "xl:pr-16" : "xl:pr-14"}`}>
                <StudioBoard
                  viewMode={viewMode}
                  focusTarget={focusTarget}
                  selectedNodeId={selectedNodeId}
                  isDetailsPanelOpen={isDetailsPanelOpen}
                  detailsInsetPx={444}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                  }}
                  onAddStepAt={handleInsertMainStep}
                  onAddStepToEnd={() => handleInsertMainStep(nodes.filter(isMainStep).length)}
                  onDuplicateStep={duplicateNodeById}
                  onDeleteNode={deleteNodeById}
                  onDeleteAttachment={handleDeleteAttachment}
                  onAddConnectedNode={addConnectedNode}
                  onOpenDetails={handleOpenDetails}
                  onAddNotice={(message) => setAddNotice(message)}
                  className="h-full min-h-[480px] overflow-visible rounded-2xl border border-slate-200/90 bg-white p-3 pb-12"
                />
              </div>

              {isGuidanceOpen ? (
                <aside className="hidden absolute bottom-10 right-4 top-3 z-[90] w-[320px] overflow-y-auto rounded-2xl border border-blue-200 bg-white/95 shadow-lg xl:block">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white/95 px-4 py-3 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Design guidance</p>
                    <button type="button" className="ades-ghost-btn px-2 py-1 text-[11px]" onClick={() => setIsGuidanceOpen(false)}>Collapse</button>
                  </div>
                  <div className="space-y-2 p-4">
                    {critiqueError ? <p className="text-xs text-rose-600">{critiqueError}</p> : null}
                    {generationError ? <p className="text-xs text-rose-600">{generationError}</p> : null}
                    {exportError ? <p className="text-xs text-rose-600">{exportError}</p> : null}
                    {qualityReport.actionableIssues.map((issue) => (
                      <article key={issue.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-amber-900">{issue.title}</p>
                          <span className="rounded-full border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">{issue.severity}</span>
                        </div>
                        <p className="mt-1 text-xs text-amber-900">{issue.message}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-800/80">{issue.category}</p>
                        <button type="button" onClick={() => handleGoToGuidanceTarget(issue)} className="ades-ghost-btn mt-2 px-2 py-1 text-[11px]">{issue.target?.nodeId ? "Go to step" : "Go to view"}</button>
                      </article>
                    ))}
                    {activeCritiqueItems.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.severity} severity</p>
                        <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                        <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Why it matters:</span> {item.whyItMatters}</p>
                        <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Affected dimensions:</span> {item.affectedDimensions.map((dimension) => dimension.replaceAll("_", " ")).join(", ")}</p>
                        <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Fix next:</span> {item.recommendation}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setViewMode("flow")}>Go to view</button>
                          <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setAddNotice("Add to board is contextual — use + on any step to apply this recommendation.")}>Add to board</button>
                          <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setDismissedFindingIds((prev) => [...prev, item.id])}>Dismiss</button>
                        </div>
                      </article>
                    ))}
                    {!qualityReport.actionableIssues.length && !activeCritiqueItems.length ? <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">No guidance cards yet.</p> : null}
                  </div>
                </aside>
              ) : null}

              {!isGuidanceOpen ? (
                <button type="button" onClick={() => setIsGuidanceOpen(true)} className="absolute right-4 top-8 z-[90] hidden h-44 w-11 rounded-xl border border-blue-300 bg-blue-100 px-1 text-center text-xs font-semibold text-blue-800 shadow-sm xl:flex xl:flex-col xl:items-center xl:justify-center">
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
                    <h3 className="text-sm font-semibold text-slate-900">Blueprint</h3>
                    <p className="mt-1 text-xs text-slate-600">Create the first workflow, evals, and safeguards from your idea.</p>
                    <div className="mt-3">
                      <BlueprintLabel label="Initiative" tooltip={blueprintFieldTips.initiative} />
                      <textarea className="ades-input mt-1 min-h-[84px] resize-y" value={ideaPrompt} onChange={(event) => setIdeaPrompt(event.target.value)} placeholder="Example: Agent for triaging support tickets" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Project title (optional)" tooltip={blueprintFieldTips.title} />
                      <input className="ades-input mt-1" value={project.title} readOnly aria-label="Project title (optional)" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Target user" tooltip={blueprintFieldTips.targetUser} />
                      <input className="ades-input mt-1" value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Example: Support operations leads" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Context / problem" tooltip={blueprintFieldTips.contextProblem} />
                      <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={contextProblem} onChange={(event) => setContextProblem(event.target.value)} placeholder="Example: Slow ticket routing and uneven quality" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Desired outcome" tooltip={blueprintFieldTips.desiredOutcome} />
                      <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} placeholder="Example: Faster triage with consistent escalation quality" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Constraints (optional)" tooltip={blueprintFieldTips.constraints} />
                      <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Example: PII policy, 2s latency, existing CRM only" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Human involvement / escalation" tooltip={blueprintFieldTips.humanInvolvement} />
                      <textarea className="ades-input mt-1 min-h-[66px] resize-y" value={humanInvolvement} onChange={(event) => setHumanInvolvement(event.target.value)} placeholder="Example: Human review for low confidence or policy flags" />
                    </div>
                    <div className="mt-2">
                      <BlueprintLabel label="Risk level (optional)" tooltip={blueprintFieldTips.riskLevel} />
                      <select className="ades-input mt-1" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as "" | "low" | "medium" | "high")}><option value="">Not specified</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <button type="button" onClick={() => void handleGenerateBoard()} disabled={isGenerating || !ideaPrompt.trim()} className="ades-primary-btn w-full px-3 py-2 text-xs disabled:opacity-60">{isGenerating ? "Generating design…" : "Generate board from blueprint"}</button>
                    {generationError ? <p className="mt-2 text-xs text-rose-600">{generationError}</p> : null}
                    <p className="mt-2 text-xs text-slate-600">Build-ready handoff pulls from: design intent (blueprint), board workflow, eval coverage, and safeguards.</p>
                  </div>
                </div>
              </section>
            ) : null}

            {isGuidanceOpen ? (
              <div className="fixed inset-0 z-[90] xl:hidden">
                <button type="button" aria-label="Close guidance" className="absolute inset-0 bg-slate-900/35" onClick={() => setIsGuidanceOpen(false)} />
                <aside className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto rounded-t-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Design guidance</p>
                    <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setIsGuidanceOpen(false)}>Close</button>
                  </div>
                  <div className="space-y-2">
                    {qualityReport.actionableIssues.map((issue) => (
                      <article key={issue.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-sm font-semibold text-amber-900">{issue.title}</p>
                        <p className="mt-1 text-sm text-amber-900">{issue.message}</p>
                        <button type="button" onClick={() => handleGoToGuidanceTarget(issue)} className="ades-ghost-btn mt-2 px-2 py-1 text-xs">{issue.target?.nodeId ? "Go to step" : "Go to view"}</button>
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

            {isDetailsPanelOpen ? (
              <div className="pointer-events-none fixed inset-0 z-[95]">
                <div className="pointer-events-auto absolute inset-y-0 left-0 w-full border-r border-slate-200 bg-white shadow-xl sm:max-w-[420px]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-base font-semibold text-slate-900">Card details</p>
                    <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => setIsDetailsPanelOpen(false)}>✕</button>
                  </div>
                  <div className="h-[calc(100%-7.75rem)] overflow-auto p-4">
                    <BoardInspector viewMode={viewMode} nodeId={selectedNodeId} />
                  </div>
                  <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-600">
                        {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Unsaved (save failed)" : "Unsaved"}
                      </p>
                      <div className="flex items-center gap-2">
                        {selectedNode && selectedAttachmentKind ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(selectedNode.id, selectedAttachmentKind)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            {selectedAttachmentKind === "eval" ? "Delete eval" : selectedAttachmentKind === "reflection" ? "Delete reflection" : "Delete safeguard"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleSaveBoard()}
                          disabled={saveState === "saving" || !project || !user}
                          className="ades-primary-btn min-w-[116px] px-4 py-2 text-sm disabled:opacity-60"
                        >
                          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {addNotice ? (
              <div className="pointer-events-none fixed left-1/2 top-16 z-[75] -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow">
                {addNotice}
              </div>
            ) : null}
          </div>
        ) : null}
      </ProtectedRoute>
    </AppShell>
  );
}
