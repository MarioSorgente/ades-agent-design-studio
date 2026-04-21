"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdesNode, AdesNodeType, BoardViewMode } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

type StudioBoardProps = {
  className?: string;
  readOnly?: boolean;
  viewMode?: BoardViewMode;
  focusTarget?: {
    nodeId: string;
    attachmentKind?: "evals" | "reflections" | "safeguards";
    nonce: number;
  } | null;
  selectedNodeId: string | null;
  isDetailsPanelOpen?: boolean;
  detailsInsetPx?: number;
  onSelectNode: (nodeId: string | null) => void;
  onAddStepAt: (index: number) => void;
  onAddStepToEnd: () => void;
  onDuplicateStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteAttachment: (nodeId: string, kind: "eval" | "reflection" | "safeguard") => void;
  onAddConnectedNode: (sourceId: string, type: AdesNodeType) => string | null;
  onOpenDetails: (nodeId: string) => void;
  onAddNotice?: (message: string) => void;
  expandedByStepOverride?: Record<string, AttachmentExpansionState>;
  navigationHint?: string;
};

type EvalFilter = "all" | "missing" | "end_to_end" | "tool_use" | "safety";
type AttachmentKind = "evals" | "reflections" | "safeguards";
type AttachmentExpansionState = Partial<Record<AttachmentKind, boolean>>;

const EVAL_GROUPS: Array<{ key: string; title: string; matches: (node: AdesNode) => boolean }> = [
  { key: "end_to_end", title: "End-to-end evals", matches: (node) => node.data.evalScope === "flow" },
  { key: "step_level", title: "Step-level evals", matches: (node) => node.data.evalScope !== "flow" },
  { key: "tool_use", title: "Tool-use evals", matches: (node) => node.data.evalCategory === "tool_accuracy" },
  { key: "safety", title: "Safety/compliance evals", matches: (node) => node.data.evalCategory === "safety" || /safety|compliance|policy/i.test(`${node.data.evalName} ${node.data.evalQuestion}`) },
];

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function isWeakEval(node: AdesNode) {
  return !node.data.evalQuestion.trim() || !node.data.evalCriteria.trim() || !node.data.evalThreshold.trim();
}

const MAX_VISIBLE_EVALS = 3;

export function StudioBoard({
  className,
  readOnly = false,
  viewMode = "flow",
  focusTarget,
  selectedNodeId,
  isDetailsPanelOpen = false,
  detailsInsetPx = 0,
  onSelectNode,
  onAddStepAt,
  onAddStepToEnd,
  onDuplicateStep,
  onDeleteNode,
  onDeleteAttachment,
  onAddConnectedNode,
  onOpenDetails,
  onAddNotice,
  expandedByStepOverride,
  navigationHint,
}: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");
  const [flowZoom, setFlowZoom] = useState(1);
  const [expandedByStep, setExpandedByStep] = useState<Record<string, AttachmentExpansionState>>({});
  const [showAllEvalsByStep, setShowAllEvalsByStep] = useState<Record<string, boolean>>({});
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<{ stepId: string; kind: AttachmentKind } | null>(null);

  const flowViewportRef = useRef<HTMLDivElement | null>(null);
  const flowContentRef = useRef<HTMLDivElement | null>(null);
  const stepRefMap = useRef<Record<string, HTMLDivElement | null>>({});
  const hasInitialFocusAppliedRef = useRef(false);
  const previousSelectedNodeIdRef = useRef<string | null>(null);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedMainSteps = useMemo(() => nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x), [nodes]);
  const evalNodes = useMemo(() => nodes.filter((node) => node.type === "eval"), [nodes]);

  const flowRows = useMemo(
    () =>
      orderedMainSteps.map((step) => {
        const connected = edges
          .filter((edge) => edge.source === step.id)
          .map((edge) => nodeById.get(edge.target))
          .filter((node): node is AdesNode => Boolean(node));

        return {
          step,
          evalNodes: connected.filter((node) => node.type === "eval"),
          reflectionNodes: connected.filter((node) => node.type === "reflection"),
          riskNodes: connected.filter((node) => node.type === "risk"),
        };
      }),
    [edges, nodeById, orderedMainSteps],
  );

  const selectedAttachmentParentStepId = useMemo(() => {
    if (!selectedNodeId) return null;
    const direct = edges.find((edge) => edge.target === selectedNodeId);
    return direct?.source ?? null;
  }, [edges, selectedNodeId]);
  const selectedFlowStepId = selectedAttachmentParentStepId ?? selectedNodeId;

  const evalRows = useMemo(() => {
    const rows = evalNodes.map((evalNode) => {
      const relatedStepEdge = edges.find((edge) => edge.target === evalNode.id);
      const relatedStep = relatedStepEdge ? nodeById.get(relatedStepEdge.source) ?? null : null;
      return { evalNode, relatedStep };
    });

    if (evalFilter === "missing") return rows.filter((row) => isWeakEval(row.evalNode));
    if (evalFilter === "end_to_end") return rows.filter((row) => row.evalNode.data.evalScope === "flow");
    if (evalFilter === "tool_use") return rows.filter((row) => row.evalNode.data.evalCategory === "tool_accuracy");
    if (evalFilter === "safety") return rows.filter((row) => row.evalNode.data.evalCategory === "safety" || /safety|compliance|policy/i.test(`${row.evalNode.data.evalName} ${row.evalNode.data.evalQuestion}`));
    return rows;
  }, [edges, evalFilter, evalNodes, nodeById]);

  function getParentStepId(nodeId: string) {
    return edges.find((edge) => edge.target === nodeId)?.source;
  }

  const fitFlow = useCallback(() => {
    const viewport = flowViewportRef.current;
    if (!viewport || !orderedMainSteps.length) return;
    const minX = Math.min(...orderedMainSteps.map((step) => step.position.x));
    const maxX = Math.max(...orderedMainSteps.map((step) => step.position.x));
    const boardWidth = Math.max(620, maxX - minX + 780);
    const inset = isDetailsPanelOpen ? detailsInsetPx : 0;
    const availableWidth = Math.max(280, viewport.clientWidth - inset - 96);
    const nextZoom = Math.max(0.25, Math.min(1.6, Number((availableWidth / boardWidth).toFixed(2))));
    setFlowZoom(nextZoom);
    window.requestAnimationFrame(() => {
      const centerLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      const centerTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
      viewport.scrollTo({ left: centerLeft, top: centerTop, behavior: "smooth" });
    });
  }, [detailsInsetPx, isDetailsPanelOpen, orderedMainSteps]);

  const focusStep = useCallback(
    (stepId: string, options?: { behavior?: ScrollBehavior; mode?: "center" | "ensureVisible" }) => {
      const viewport = flowViewportRef.current;
      const stepNode = stepRefMap.current[stepId];
      if (!viewport || !stepNode) return;

      const behavior = options?.behavior ?? "smooth";
      const mode = options?.mode ?? "center";
      const viewportRect = viewport.getBoundingClientRect();
      const stepRect = stepNode.getBoundingClientRect();
      const leftInset = isDetailsPanelOpen ? detailsInsetPx : 0;
      const safeLeft = viewportRect.left + leftInset + 20;
      const safeRight = viewportRect.right - 20;
      const safeTop = viewportRect.top + 16;
      const safeBottom = viewportRect.bottom - 20;

      const stepCenterX = stepRect.left + stepRect.width / 2;
      const stepCenterY = stepRect.top + stepRect.height / 2;
      const viewportCenterX = (safeLeft + safeRight) / 2;
      const viewportCenterY = (safeTop + safeBottom) / 2;

      const outOfHorizontalView = stepRect.left < safeLeft || stepRect.right > safeRight;
      const outOfVerticalView = stepRect.top < safeTop || stepRect.bottom > safeBottom;
      const shouldAdjust = mode === "center" || outOfHorizontalView || outOfVerticalView;
      if (!shouldAdjust) return;

      viewport.scrollBy({
        left: stepCenterX - viewportCenterX,
        top: stepCenterY - viewportCenterY,
        behavior,
      });
    },
    [detailsInsetPx, isDetailsPanelOpen],
  );

  const resetView = useCallback(() => {
    setFlowZoom(1);
    window.requestAnimationFrame(() => {
      const preferredStepId = selectedFlowStepId ?? orderedMainSteps[0]?.id;
      if (preferredStepId) {
        focusStep(preferredStepId, { behavior: "smooth", mode: "center" });
        return;
      }
      fitFlow();
    });
  }, [fitFlow, focusStep, orderedMainSteps, selectedFlowStepId]);

  function handleAddConnected(stepId: string, kind: AttachmentKind) {
    const map: Record<AttachmentKind, { type: AdesNodeType; message: string }> = {
      evals: { type: "eval", message: "Eval added" },
      reflections: { type: "reflection", message: "Reflection loop added" },
      safeguards: { type: "risk", message: "Safeguard added" },
    };
    const result = map[kind];
    const newId = onAddConnectedNode(stepId, result.type);
    if (!newId) return;

    onSelectNode(newId);
    setExpandedByStep((prev) => ({
      ...prev,
      [stepId]: { ...(prev[stepId] ?? {}), [kind]: true },
    }));
    onOpenDetails(newId);
    onAddNotice?.(result.message);
  }

  function isCategoryExpanded(stepId: string, kind: AttachmentKind) {
    const override = expandedByStepOverride?.[stepId]?.[kind];
    if (typeof override === "boolean") return override;
    const explicit = expandedByStep[stepId]?.[kind];
    if (typeof explicit === "boolean") return explicit;
    return selectedFlowStepId === stepId;
  }

  function toggleCategory(stepId: string, kind: AttachmentKind) {
    setExpandedByStep((prev) => {
      const current = isCategoryExpanded(stepId, kind);
      return {
        ...prev,
        [stepId]: {
          ...(prev[stepId] ?? {}),
          [kind]: !current,
        },
      };
    });
  }

  useEffect(() => {
    if (viewMode !== "flow") return;
    if (!orderedMainSteps.length) return;
    if (hasInitialFocusAppliedRef.current) return;

    const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : null;
    const initialStepId = selectedNode && isMainStep(selectedNode) ? selectedNode.id : orderedMainSteps[0]?.id;
    if (!initialStepId) return;

    hasInitialFocusAppliedRef.current = true;
    window.requestAnimationFrame(() => focusStep(initialStepId, { behavior: "auto", mode: "center" }));
  }, [focusStep, nodeById, orderedMainSteps, selectedNodeId, viewMode]);

  useEffect(() => {
    if (viewMode !== "flow") return;
    if (!selectedFlowStepId) return;
    window.requestAnimationFrame(() => focusStep(selectedFlowStepId, { behavior: "auto", mode: "ensureVisible" }));
  }, [detailsInsetPx, focusStep, isDetailsPanelOpen, selectedFlowStepId, viewMode]);

  useEffect(() => {
    if (viewMode !== "flow") return;
    if (!selectedNodeId || selectedNodeId === previousSelectedNodeIdRef.current) return;
    previousSelectedNodeIdRef.current = selectedNodeId;
    const selectedNode = nodeById.get(selectedNodeId);
    if (!selectedNode || !isMainStep(selectedNode)) return;
    window.requestAnimationFrame(() => focusStep(selectedNodeId, { behavior: "smooth", mode: "ensureVisible" }));
  }, [focusStep, nodeById, selectedNodeId, viewMode]);

  useEffect(() => {
    if (!focusTarget?.nodeId) return;

    const targetNode = nodeById.get(focusTarget.nodeId);
    if (!targetNode) return;

    const parentStepId = isMainStep(targetNode) ? targetNode.id : getParentStepId(targetNode.id);
    if (!parentStepId) return;

    const derivedKind: AttachmentKind | undefined =
      focusTarget.attachmentKind ??
      (targetNode.type === "eval" ? "evals" : targetNode.type === "reflection" ? "reflections" : targetNode.type === "risk" ? "safeguards" : undefined);

    if (derivedKind) {
      setExpandedByStep((prev) => ({
        ...prev,
        [parentStepId]: {
          ...(prev[parentStepId] ?? {}),
          [derivedKind]: true,
        },
      }));
      setHighlightedCategory({ stepId: parentStepId, kind: derivedKind });
    }

    setHighlightedNodeId(focusTarget.nodeId);

    window.requestAnimationFrame(() => {
      const element =
        document.querySelector(`[data-node-id="${focusTarget.nodeId}"]`) ??
        document.querySelector(`[data-step-id="${parentStepId}"]`) ??
        (derivedKind ? document.querySelector(`[data-step-id="${parentStepId}"][data-attachment-kind="${derivedKind}"]`) : null);
      element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });

    const timer = window.setTimeout(() => {
      setHighlightedNodeId(null);
      setHighlightedCategory(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [focusTarget?.nonce, focusTarget?.nodeId, focusTarget?.attachmentKind, nodeById, edges]);

  if (viewMode === "eval") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-9rem)] min-h-[650px] overflow-auto rounded-2xl border border-slate-200/90 bg-white p-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Eval View</h3>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["all", "missing", "end_to_end", "tool_use", "safety"] as EvalFilter[]).map((key) => (
              <button key={key} type="button" onClick={() => setEvalFilter(key)} className={`rounded-md px-2 py-1 text-xs ${evalFilter === key ? "bg-white shadow-sm" : "text-slate-600"}`}>{key.replace(/_/g, " ")}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-4">
          {EVAL_GROUPS.map((group) => {
            const groupRows = evalRows.filter((row) => group.matches(row.evalNode));
            return (
              <section key={group.key}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h4>
                <div className="mt-2 space-y-2">
                  {groupRows.length ? groupRows.map(({ evalNode, relatedStep }) => (
                    <button key={evalNode.id} type="button" onClick={() => { onSelectNode(evalNode.id); onOpenDetails(evalNode.id); }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-200">
                      <p className="text-xs text-slate-500">{relatedStep ? `Related step: ${relatedStep.data.label}` : "Flow-level eval"}</p>
                      <p className="text-sm font-semibold text-slate-900">{evalNode.data.evalQuestion || evalNode.data.evalName || evalNode.data.label}</p>
                    </button>
                  )) : <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No evals in this group yet.</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      id="ades-canvas-export"
      className={`canvas-shell relative h-full min-h-[480px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 ${className ?? ""}`}
    >
      <div
        ref={flowViewportRef}
        className="canvas-viewport relative z-0 h-full overflow-auto pb-20"
        style={{
          paddingLeft: isDetailsPanelOpen ? detailsInsetPx : 0,
          transition: "padding-left 180ms ease",
          backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      >
        <div className="zoomed-board-content origin-top-left" style={{ transform: `scale(${flowZoom})`, width: `${100 / flowZoom}%` }}>
          <div
            ref={flowContentRef}
            className="min-h-full py-10"
            style={{ display: "grid", alignItems: "center", alignContent: "center" }}
          >
            <div className="mx-auto min-w-max">
              <div className="flex items-start gap-10">
                {!readOnly ? <AddStepChip label="+ Add step at beginning" onClick={() => onAddStepAt(0)} /> : null}
                {flowRows.map((row, index) => {
                  const isSelected = selectedNodeId === row.step.id;
                  const isEvalsExpanded = isCategoryExpanded(row.step.id, "evals");
                  const isReflectionsExpanded = isCategoryExpanded(row.step.id, "reflections");
                  const isSafeguardsExpanded = isCategoryExpanded(row.step.id, "safeguards");
                  const showAllEvals = showAllEvalsByStep[row.step.id] ?? false;
                  const visibleEvals = showAllEvals ? row.evalNodes : row.evalNodes.slice(0, MAX_VISIBLE_EVALS);

                  return (
                    <div key={row.step.id} className="flex items-start gap-6">
                      <div ref={(el) => { stepRefMap.current[row.step.id] = el; }} className="relative z-10 flex w-[520px] flex-col items-center" data-step-id={row.step.id}>
                        {isSelected && !readOnly ? (
                          <div className="z-40 mb-3 inline-flex min-h-10 max-w-full flex-wrap items-center justify-end gap-1.5 self-end rounded-xl border border-indigo-200 bg-white p-1.5 shadow-lg">
                            <button type="button" title="Open card details" onClick={(event) => { event.stopPropagation(); onOpenDetails(row.step.id); }} className="h-9 w-9 cursor-pointer rounded-md border border-slate-300 bg-white text-base font-semibold leading-none text-slate-700 hover:border-indigo-300 hover:text-indigo-700">▢</button>
                            <details className="relative z-40" onClick={(event) => event.stopPropagation()}>
                              <summary className="ades-ghost-btn flex min-h-9 list-none cursor-pointer select-none items-center px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">+ Add</summary>
                              <div className="absolute right-0 top-full z-40 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                                <button type="button" className="ades-ghost-btn min-h-9 w-full px-2 py-1.5 text-left text-sm" onClick={(event) => { event.stopPropagation(); handleAddConnected(row.step.id, "evals"); }}>Eval</button>
                                <button type="button" className="ades-ghost-btn mt-1 min-h-9 w-full px-2 py-1.5 text-left text-sm" onClick={(event) => { event.stopPropagation(); handleAddConnected(row.step.id, "reflections"); }}>Reflection loop</button>
                                <button type="button" className="ades-ghost-btn mt-1 min-h-9 w-full px-2 py-1.5 text-left text-sm" onClick={(event) => { event.stopPropagation(); handleAddConnected(row.step.id, "safeguards"); }}>Safeguard</button>
                              </div>
                            </details>
                            <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateStep(row.step.id); }} className="ades-ghost-btn min-h-9 px-3 py-1.5 text-sm">Duplicate</button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteNode(row.step.id); }} className="ades-ghost-btn min-h-9 px-3 py-1.5 text-sm text-rose-600">Delete</button>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          data-node-id={row.step.id}
                          data-step-id={row.step.id}
                          onClick={() => onOpenDetails(row.step.id)}
                          className={`relative z-10 w-full rounded-[20px] border bg-white px-7 py-6 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.65)] ${isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200"} ${highlightedNodeId === row.step.id ? "ring-4 ring-blue-300 ring-offset-2" : ""}`}
                        >
                          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                          <h4 className="mt-2.5 text-[22px] font-semibold leading-tight text-slate-900">{row.step.data.label}</h4>
                          <p className="mt-4 text-[16px] leading-[1.55] text-slate-700">{row.step.data.purpose || row.step.data.body || "Add one-line purpose to explain this step."}</p>
                          <p className="mt-4 text-[15px] leading-7 text-slate-600">{row.step.data.inputs || "Inputs not defined"} → {row.step.data.outputs || "Outputs not defined"}</p>
                        </button>

                        <>
                          <div className="h-8 w-[2px] bg-slate-300" />
                          <div className="w-full rounded-[20px] border border-slate-200/90 bg-white/95 p-4 shadow-sm">
                            <div className="space-y-3">
                              <AttachmentSection
                                title="Evals"
                                count={row.evalNodes.length}
                                tone="blue"
                                stepId={row.step.id}
                                kind="evals"
                                isExpanded={isEvalsExpanded}
                                isHighlighted={highlightedCategory?.stepId === row.step.id && highlightedCategory.kind === "evals"}
                                onToggle={() => toggleCategory(row.step.id, "evals")}
                                onAdd={readOnly ? undefined : () => handleAddConnected(row.step.id, "evals")}
                                readOnly={readOnly}
                              >
                                <AttachmentList
                                  items={visibleEvals.map((node) => ({
                                    id: node.id,
                                    categoryLabel: "Eval",
                                    label: node.data.evalQuestion || node.data.evalName || "Eval",
                                    subLabel: `Threshold: ${node.data.evalThreshold || "Add threshold"}`,
                                    detail: `Pass criteria: ${node.data.evalCriteria || "Add pass criteria"}`,
                                  }))}
                                  emptyMessage="No evals yet"
                                  highlightedNodeId={highlightedNodeId}
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                  onDeleteNode={(nodeId) => onDeleteAttachment(nodeId, "eval")}
                                  deleteLabel="Delete eval"
                                  tone="blue"
                                  readOnly={readOnly}
                                />
                                {row.evalNodes.length > MAX_VISIBLE_EVALS ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllEvalsByStep((prev) => ({ ...prev, [row.step.id]: !showAllEvals }))}
                                    className="mt-2 min-h-9 text-[14px] font-semibold text-blue-700 hover:text-blue-900"
                                  >
                                    {showAllEvals ? "Show fewer" : `Show all (${row.evalNodes.length})`}
                                  </button>
                                ) : null}
                              </AttachmentSection>

                              <AttachmentSection
                                title="Reflections"
                                count={row.reflectionNodes.length}
                                tone="purple"
                                stepId={row.step.id}
                                kind="reflections"
                                isExpanded={isReflectionsExpanded}
                                isHighlighted={highlightedCategory?.stepId === row.step.id && highlightedCategory.kind === "reflections"}
                                onToggle={() => toggleCategory(row.step.id, "reflections")}
                                onAdd={readOnly ? undefined : () => handleAddConnected(row.step.id, "reflections")}
                                readOnly={readOnly}
                              >
                                <AttachmentList
                                  items={row.reflectionNodes.map((node) => ({
                                    id: node.id,
                                    categoryLabel: "Reflection",
                                    label: node.data.label || "Reflection",
                                    subLabel: `Trigger: ${node.data.reflectionTrigger || "Trigger not defined"}`,
                                    detail: node.data.reflectionLoopTarget === "previous_step" ? "Loop target: Returns to previous step" : "Loop target: Returns to this step",
                                  }))}
                                  emptyMessage="No reflections yet"
                                  highlightedNodeId={highlightedNodeId}
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                  onDeleteNode={(nodeId) => onDeleteAttachment(nodeId, "reflection")}
                                  deleteLabel="Delete reflection"
                                  tone="purple"
                                  readOnly={readOnly}
                                />
                              </AttachmentSection>

                              <AttachmentSection
                                title="Safeguards"
                                count={row.riskNodes.length}
                                tone="amber"
                                stepId={row.step.id}
                                kind="safeguards"
                                isExpanded={isSafeguardsExpanded}
                                isHighlighted={highlightedCategory?.stepId === row.step.id && highlightedCategory.kind === "safeguards"}
                                onToggle={() => toggleCategory(row.step.id, "safeguards")}
                                onAdd={readOnly ? undefined : () => handleAddConnected(row.step.id, "safeguards")}
                                readOnly={readOnly}
                              >
                                <AttachmentList
                                  items={row.riskNodes.map((node) => ({
                                    id: node.id,
                                    categoryLabel: "Safeguard",
                                    label: node.data.label || "Safeguard",
                                    subLabel: `Mitigation: ${node.data.body || "Mitigation not defined"}`,
                                    detail: `Confidence check: ${node.data.confidenceCheck || "Confidence check not defined"}`,
                                  }))}
                                  emptyMessage="No safeguards yet"
                                  highlightedNodeId={highlightedNodeId}
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                  onDeleteNode={(nodeId) => onDeleteAttachment(nodeId, "safeguard")}
                                  deleteLabel="Delete safeguard"
                                  tone="amber"
                                  readOnly={readOnly}
                                />
                              </AttachmentSection>
                            </div>
                          </div>
                        </>
                      </div>
                      <div className="flex items-center gap-6 pt-[142px]">
                        <div className="h-[2px] w-12 bg-slate-300" />
                        {!readOnly ? <AddStepChip label="+ Add step here" onClick={() => onAddStepAt(index + 1)} /> : null}
                        {index < flowRows.length - 1 ? <div className="h-[2px] w-12 bg-slate-300" /> : null}
                      </div>
                    </div>
                  );
                })}
                {!readOnly ? <AddStepChip label="+ Add step at end" onClick={onAddStepToEnd} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="zoom-controls pointer-events-none absolute right-4 top-4 z-[90]">
        {navigationHint ? (
          <p className="pointer-events-auto mb-2 block text-right text-[11px] font-medium text-slate-500">
            {navigationHint}
          </p>
        ) : null}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg ring-1 ring-slate-100">
          <button type="button" className="ades-ghost-btn h-9 w-9 px-0 py-0 text-base" onClick={() => setFlowZoom((prev) => Math.max(0.25, Number((prev - 0.1).toFixed(2))))}>−</button>
          <span className="min-w-14 text-center text-sm font-semibold text-slate-700">{Math.round(flowZoom * 100)}%</span>
          <button type="button" className="ades-ghost-btn h-9 w-9 px-0 py-0 text-base" onClick={() => setFlowZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}>+</button>
          <button type="button" className="ades-ghost-btn h-9 px-2.5 py-0 text-xs" onClick={() => setFlowZoom(1)}>100%</button>
          <button type="button" className="ades-ghost-btn h-9 px-2.5 py-0 text-xs" onClick={resetView}>Reset</button>
        </div>
      </div>
    </div>
  );
}

function AttachmentSection({
  title,
  count,
  children,
  tone,
  stepId,
  kind,
  isExpanded,
  isHighlighted,
  onToggle,
  onAdd,
  readOnly = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  tone: "blue" | "purple" | "amber";
  stepId: string;
  kind: AttachmentKind;
  isExpanded: boolean;
  isHighlighted?: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  readOnly?: boolean;
}) {
  const classes = {
    blue: "border-blue-200 bg-blue-50/55",
    purple: "border-purple-200 bg-purple-50/55",
    amber: "border-amber-200 bg-amber-50/60",
  } as const;
  const textClasses = {
    blue: "text-blue-800",
    purple: "text-purple-800",
    amber: "text-amber-800",
  } as const;

  return (
    <div data-step-id={stepId} data-attachment-kind={kind} className={`rounded-xl border p-3.5 shadow-sm ${classes[tone]} ${isHighlighted ? "ring-4 ring-blue-200 ring-offset-1" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left">
          <span className={`text-base leading-none ${textClasses[tone]}`}>{isExpanded ? "▾" : "▸"}</span>
          <span className={`text-[15px] font-semibold ${textClasses[tone]}`}>{title} · {count}</span>
        </button>
        {!readOnly && onAdd ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAdd();
            }}
            className={`h-8 w-8 min-h-8 min-w-8 rounded-md border bg-white text-lg font-semibold leading-none ${tone === "amber" ? "border-amber-300 text-amber-800 hover:bg-amber-100" : tone === "purple" ? "border-purple-300 text-purple-800 hover:bg-purple-100" : "border-blue-300 text-blue-800 hover:bg-blue-100"}`}
            aria-label={`Add ${title.toLowerCase()}`}
          >
            +
          </button>
        ) : null}
      </div>
      {isExpanded ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function AttachmentList({
  items,
  emptyMessage,
  highlightedNodeId,
  onSelectNode,
  onOpenDetails,
  onDeleteNode,
  deleteLabel,
  tone = "blue",
  readOnly = false,
}: {
  items: Array<{ id: string; categoryLabel: string; label: string; subLabel: string; detail?: string }>;
  emptyMessage: string;
  highlightedNodeId?: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenDetails?: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  deleteLabel: string;
  tone?: "blue" | "purple" | "amber";
  readOnly?: boolean;
}) {
  if (!items.length) return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  const itemClass = {
    blue: "border-blue-200 bg-white/95 hover:border-blue-300",
    purple: "border-purple-200 bg-white/95 hover:border-purple-300",
    amber: "border-amber-200 bg-white/95 hover:border-amber-300",
  } as const;
  const labelClass = {
    blue: "text-blue-700",
    purple: "text-purple-700",
    amber: "text-amber-700",
  } as const;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} data-node-id={item.id} className={`group relative w-full rounded-lg border-l-4 px-4 py-3 ${itemClass[tone]} ${highlightedNodeId === item.id ? "ring-4 ring-blue-300 ring-offset-1" : ""}`}>
          <button type="button" onClick={() => { onSelectNode(item.id); onOpenDetails?.(item.id); }} className="w-full text-left">
            <p className={`text-[13px] font-semibold uppercase tracking-wide ${labelClass[tone]}`}>{item.categoryLabel}</p>
            <p className="pr-10 text-[15px] font-semibold text-slate-900">{item.label}</p>
            <p className="mt-1 text-[13px] text-slate-700">{item.subLabel}</p>
            {item.detail ? <p className="mt-0.5 text-[13px] text-slate-600">{item.detail}</p> : null}
          </button>
          {!readOnly ? (
            <button
              type="button"
              title={deleteLabel}
              aria-label={deleteLabel}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteNode(item.id);
              }}
              className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-base text-slate-500 opacity-0 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:opacity-100 group-hover:opacity-100"
            >
              🗑
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AddStepChip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-white/90 px-4 py-2.5 text-[14px] font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700">{label}</button>;
}
