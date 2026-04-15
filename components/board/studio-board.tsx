"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdesNode, AdesNodeType, BoardViewMode } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

type StudioBoardProps = {
  className?: string;
  viewMode?: BoardViewMode;
  selectedNodeId: string | null;
  isDetailsPanelOpen?: boolean;
  detailsInsetPx?: number;
  onSelectNode: (nodeId: string | null) => void;
  onAddStepAt: (index: number) => void;
  onAddStepToEnd: () => void;
  onDuplicateStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnectedNode: (sourceId: string, type: AdesNodeType) => string | null;
  onOpenDetails: (nodeId: string) => void;
  onAddNotice?: (message: string) => void;
};

type EvalFilter = "all" | "missing" | "end_to_end" | "tool_use" | "safety";
type AttachmentKind = "evals" | "reflections" | "risks";

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

export function StudioBoard({ className, viewMode = "flow", selectedNodeId, isDetailsPanelOpen = false, detailsInsetPx = 0, onSelectNode, onAddStepAt, onAddStepToEnd, onDuplicateStep, onDeleteNode, onAddConnectedNode, onOpenDetails, onAddNotice }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");
  const [flowZoom, setFlowZoom] = useState(1);
  const [expandedEvalsByStep, setExpandedEvalsByStep] = useState<Record<string, boolean>>({});

  const flowViewportRef = useRef<HTMLDivElement | null>(null);
  const flowContentRef = useRef<HTMLDivElement | null>(null);
  const stepRefMap = useRef<Record<string, HTMLDivElement | null>>({});

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

  function fitFlow() {
    const viewport = flowViewportRef.current;
    if (!viewport || !orderedMainSteps.length) return;
    const minX = Math.min(...orderedMainSteps.map((step) => step.position.x));
    const maxX = Math.max(...orderedMainSteps.map((step) => step.position.x));
    const boardWidth = Math.max(420, maxX - minX + 600);
    const inset = isDetailsPanelOpen ? detailsInsetPx : 0;
    const availableWidth = Math.max(280, viewport.clientWidth - inset - 96);
    const nextZoom = Math.max(0.25, Math.min(1, Number((availableWidth / boardWidth).toFixed(2))));
    setFlowZoom(nextZoom);
    window.requestAnimationFrame(() => viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" }));
  }

  function handleAddConnected(stepId: string, kind: AttachmentKind) {
    const map: Record<AttachmentKind, { type: AdesNodeType; message: string }> = {
      evals: { type: "eval", message: "Eval added" },
      reflections: { type: "reflection", message: "Reflection loop added" },
      risks: { type: "risk", message: "Safeguard added" },
    };
    const result = map[kind];
    const newId = onAddConnectedNode(stepId, result.type);
    if (!newId) return;

    onSelectNode(newId);
    onOpenDetails(newId);
    onAddNotice?.(result.message);
  }

  useEffect(() => {
    if (viewMode !== "flow") return;
    fitFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, orderedMainSteps.length, isDetailsPanelOpen, detailsInsetPx]);

  useEffect(() => {
    if (!selectedNodeId || !isDetailsPanelOpen) return;
    const viewport = flowViewportRef.current;
    const stepNode = selectedAttachmentParentStepId ? stepRefMap.current[selectedAttachmentParentStepId] : stepRefMap.current[selectedNodeId];
    if (!viewport || !stepNode) return;

    const viewportRect = viewport.getBoundingClientRect();
    const stepRect = stepNode.getBoundingClientRect();
    const leftSafeEdge = viewportRect.left + detailsInsetPx + 24;

    if (stepRect.left < leftSafeEdge || stepRect.right > viewportRect.right - 24) {
      viewport.scrollBy({ left: stepRect.left - leftSafeEdge, behavior: "smooth" });
    }
  }, [detailsInsetPx, isDetailsPanelOpen, selectedAttachmentParentStepId, selectedNodeId]);

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

  if (viewMode === "improvement") {
    return <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-9rem)] min-h-[650px] overflow-auto rounded-2xl border border-slate-200/90 bg-white p-4"}><h3 className="text-sm font-semibold text-slate-900">Improvement View</h3></div>;
  }

  return (
    <div
      id="ades-canvas-export"
      className={className ?? "relative h-[calc(100vh-9rem)] min-h-[650px] overflow-visible rounded-2xl border border-slate-200/90 bg-white p-4"}
      style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
    >
      <div ref={flowViewportRef} className="relative h-full overflow-auto pb-16" style={{ paddingLeft: isDetailsPanelOpen ? detailsInsetPx : 0, transition: "padding-left 180ms ease" }}>
        <div className="origin-top-left" style={{ transform: `scale(${flowZoom})`, width: `${100 / flowZoom}%` }}>
          <div
            ref={flowContentRef}
            className="min-h-[calc(100vh-13rem)] py-8"
            style={{ display: "grid", alignItems: "start", alignContent: "start", paddingTop: "42vh" }}
          >
            <div className="mx-auto min-w-max">
              <div className="flex items-start gap-5">
                <AddStepChip label="+ Add step at beginning" onClick={() => onAddStepAt(0)} />
                {flowRows.map((row, index) => {
                  const isSelected = selectedNodeId === row.step.id;
                  const selectedType = nodeById.get(selectedNodeId || "")?.type;
                  const hasEvals = row.evalNodes.length > 0;
                  const hasReflections = row.reflectionNodes.length > 0;
                  const hasRisks = row.riskNodes.length > 0;
                  const shouldExpandEvals = expandedEvalsByStep[row.step.id] ?? (selectedAttachmentParentStepId === row.step.id && selectedType === "eval");
                  const visibleEvals = shouldExpandEvals ? row.evalNodes : row.evalNodes.slice(0, MAX_VISIBLE_EVALS);

                  return (
                    <div key={row.step.id} className="flex items-start gap-4">
                      <div ref={(el) => { stepRefMap.current[row.step.id] = el; }} className="relative pt-10 pb-28">
                        <button type="button" onClick={() => onSelectNode(row.step.id)} onDoubleClick={() => onOpenDetails(row.step.id)} className={`relative z-20 w-[390px] rounded-2xl border bg-white p-5 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.65)] ${isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200"}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                          <h4 className="mt-1.5 text-[17px] font-semibold leading-tight text-slate-900">{row.step.data.label}</h4>
                          <p className="mt-3 text-[14px] leading-6 text-slate-700">{row.step.data.purpose || row.step.data.body || "Add one-line purpose to explain this step."}</p>
                          <p className="mt-3 text-[13px] text-slate-600">{row.step.data.inputs || "Inputs not defined"} → {row.step.data.outputs || "Outputs not defined"}</p>
                        </button>

                        {isSelected ? (
                          <div className="absolute -top-1 right-2 z-50 flex items-center gap-1 rounded-lg border border-indigo-200 bg-white p-1 shadow-lg">
                            <button type="button" title="Open card details" onClick={() => onOpenDetails(row.step.id)} className="h-8 w-8 cursor-pointer rounded-md border border-slate-300 bg-white text-sm font-semibold leading-none text-slate-700 hover:border-indigo-300 hover:text-indigo-700">▢</button>
                            <details className="relative" onClick={(event) => event.stopPropagation()}>
                              <summary className="ades-ghost-btn list-none cursor-pointer select-none px-2 py-1 text-xs [&::-webkit-details-marker]:hidden">+ Add</summary>
                              <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                                <button type="button" className="ades-ghost-btn w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "evals")}>Eval</button>
                                <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "reflections")}>Reflection loop</button>
                                <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "risks")}>Safeguard</button>
                              </div>
                            </details>
                            <button type="button" onClick={() => onDuplicateStep(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs">Duplicate</button>
                            <button type="button" onClick={() => onDeleteNode(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs text-rose-600">Delete</button>
                          </div>
                        ) : null}

                        {(hasEvals || hasReflections || hasRisks) ? (
                          <div className="absolute left-0 top-full z-40 mt-3 w-[378px] space-y-2">
                            {hasEvals ? (
                              <AttachmentSection title="Evals" tone="slate">
                                <AttachmentList
                                  items={visibleEvals.map((node) => ({
                                    id: node.id,
                                    label: node.data.evalQuestion || node.data.evalName || "Eval",
                                    subLabel: `Threshold: ${node.data.evalThreshold || "Add threshold"}`,
                                    detail: `Pass criteria: ${node.data.evalCriteria || "Add pass criteria"}`,
                                  }))}
                                  emptyMessage="No eval cards attached yet."
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                />
                                {row.evalNodes.length > MAX_VISIBLE_EVALS ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEvalsByStep((prev) => ({ ...prev, [row.step.id]: !shouldExpandEvals }))}
                                    className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                                  >
                                    {shouldExpandEvals ? "Show fewer evals" : `Show all evals (${row.evalNodes.length})`}
                                  </button>
                                ) : null}
                              </AttachmentSection>
                            ) : null}

                            {hasReflections ? (
                              <AttachmentSection title="Reflections" tone="indigo">
                                <AttachmentList
                                  items={row.reflectionNodes.map((node) => ({
                                    id: node.id,
                                    label: node.data.label || "Reflection",
                                    subLabel: `Trigger: ${node.data.reflectionTrigger || "Trigger not defined"}`,
                                    detail: node.data.reflectionLoopTarget === "previous_step" ? "Loop target: Returns to previous step" : "Loop target: Returns to this step",
                                  }))}
                                  emptyMessage="No reflections attached yet."
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                  tone="indigo"
                                />
                              </AttachmentSection>
                            ) : null}

                            {hasRisks ? (
                              <AttachmentSection title="Safeguards" tone="amber">
                                <AttachmentList
                                  items={row.riskNodes.map((node) => ({
                                    id: node.id,
                                    label: node.data.label || "Safeguard",
                                    subLabel: node.data.confidenceCheck || "Mitigation not defined",
                                  }))}
                                  emptyMessage="No safeguards attached yet."
                                  onSelectNode={onSelectNode}
                                  onOpenDetails={onOpenDetails}
                                  tone="amber"
                                />
                              </AttachmentSection>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-5 pt-[124px]">
                        <div className="h-[2px] w-10 bg-slate-300" />
                        <AddStepChip label="+ Add step here" onClick={() => onAddStepAt(index + 1)} />
                        {index < flowRows.length - 1 ? <div className="h-[2px] w-10 bg-slate-300" /> : null}
                      </div>
                    </div>
                  );
                })}
                <AddStepChip label="+ Add step at end" onClick={onAddStepToEnd} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-4 z-30"
        style={{ left: isDetailsPanelOpen ? detailsInsetPx + 16 : 16, transition: "left 180ms ease" }}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm">
          <button type="button" className="ades-ghost-btn h-8 w-8 px-0 py-0 text-base" onClick={() => setFlowZoom((prev) => Math.max(0.25, Number((prev - 0.1).toFixed(2))))}>−</button>
          <span className="min-w-12 text-center text-xs font-semibold text-slate-700">{Math.round(flowZoom * 100)}%</span>
          <button type="button" className="ades-ghost-btn h-8 w-8 px-0 py-0 text-base" onClick={() => setFlowZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}>+</button>
          <button type="button" className="ades-ghost-btn h-8 px-2 py-0 text-xs" onClick={() => setFlowZoom(1)}>100%</button>
          <button type="button" className="ades-ghost-btn h-8 px-2 py-0 text-xs" onClick={fitFlow}>Fit</button>
        </div>
      </div>
    </div>
  );
}

function AttachmentSection({ title, children, tone }: { title: string; children: ReactNode; tone: "slate" | "indigo" | "amber" }) {
  const classes = {
    slate: "border-slate-200 bg-white",
    indigo: "border-indigo-200 bg-indigo-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  } as const;
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${classes[tone]}`}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{title}</p>
      {children}
    </div>
  );
}

function AttachmentList({ items, emptyMessage, onSelectNode, onOpenDetails, tone = "slate" }: { items: Array<{ id: string; label: string; subLabel: string; detail?: string }>; emptyMessage: string; onSelectNode: (nodeId: string | null) => void; onOpenDetails?: (nodeId: string) => void; tone?: "slate" | "indigo" | "amber" }) {
  if (!items.length) return <p className="text-xs text-slate-600">{emptyMessage}</p>;
  const itemClass = {
    slate: "border-slate-200 bg-white hover:border-indigo-200",
    indigo: "border-indigo-200 bg-white/90 hover:border-indigo-300",
    amber: "border-amber-200 bg-white/90 hover:border-amber-300",
  } as const;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => { onSelectNode(item.id); onOpenDetails?.(item.id); }} className={`w-full rounded-lg border px-3 py-2.5 text-left ${itemClass[tone]}`}>
          <p className="text-[13px] font-semibold text-slate-900">{item.label}</p>
          <p className="mt-1 text-xs text-slate-700">{item.subLabel}</p>
          {item.detail ? <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p> : null}
        </button>
      ))}
    </div>
  );
}

function AddStepChip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700">{label}</button>;
}
