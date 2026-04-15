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
type CategoryTone = "blue" | "purple" | "amber";

const EVAL_GROUPS: Array<{ key: string; title: string; matches: (node: AdesNode) => boolean }> = [
  { key: "end_to_end", title: "End-to-end evals", matches: (node) => node.data.evalScope === "flow" },
  { key: "step_level", title: "Step-level evals", matches: (node) => node.data.evalScope !== "flow" },
  { key: "tool_use", title: "Tool-use evals", matches: (node) => node.data.evalCategory === "tool_accuracy" },
  { key: "safety", title: "Safety/compliance evals", matches: (node) => node.data.evalCategory === "safety" || /safety|compliance|policy/i.test(`${node.data.evalName} ${node.data.evalQuestion}`) },
];

const MAX_VISIBLE_EVALS = 3;

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function isWeakEval(node: AdesNode) {
  return !node.data.evalQuestion.trim() || !node.data.evalCriteria.trim() || !node.data.evalThreshold.trim();
}

export function StudioBoard({ className, viewMode = "flow", selectedNodeId, isDetailsPanelOpen = false, detailsInsetPx = 0, onSelectNode, onAddStepAt, onAddStepToEnd, onDuplicateStep, onDeleteNode, onAddConnectedNode, onOpenDetails, onAddNotice }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");
  const [flowZoom, setFlowZoom] = useState(1);
  const [expandedEvalsByStep, setExpandedEvalsByStep] = useState<Record<string, boolean>>({});
  const [openCategoriesByStep, setOpenCategoriesByStep] = useState<Record<string, Partial<Record<AttachmentKind, boolean>>>>({});

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

  function isCategoryOpen(stepId: string, kind: AttachmentKind, hasItems: boolean, isSelected: boolean) {
    const explicitValue = openCategoriesByStep[stepId]?.[kind];
    if (typeof explicitValue === "boolean") return explicitValue;
    return isSelected && hasItems;
  }

  function toggleCategory(stepId: string, kind: AttachmentKind, hasItems: boolean, isSelected: boolean) {
    const currentlyOpen = isCategoryOpen(stepId, kind, hasItems, isSelected);
    setOpenCategoriesByStep((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [kind]: !currentlyOpen,
      },
    }));
  }

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
      reflections: { type: "reflection", message: "Reflection added" },
      risks: { type: "risk", message: "Safeguard added" },
    };
    const result = map[kind];
    const newId = onAddConnectedNode(stepId, result.type);
    if (!newId) return;

    setOpenCategoriesByStep((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [kind]: true,
      },
    }));
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
                    <button key={evalNode.id} type="button" onClick={() => { onSelectNode(evalNode.id); onOpenDetails(evalNode.id); }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-200">
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
      className={`relative h-[calc(100vh-9rem)] min-h-[650px] overflow-visible rounded-2xl border border-slate-200/90 bg-white p-4 ${className ?? ""}`}
      style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
    >
      <div ref={flowViewportRef} className="relative h-full overflow-auto pb-24" style={{ paddingLeft: isDetailsPanelOpen ? detailsInsetPx : 0, transition: "padding-left 180ms ease" }}>
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

                  const evalExpanded = isCategoryOpen(row.step.id, "evals", row.evalNodes.length > 0, isSelected);
                  const reflectionExpanded = isCategoryOpen(row.step.id, "reflections", row.reflectionNodes.length > 0, isSelected);
                  const riskExpanded = isCategoryOpen(row.step.id, "risks", row.riskNodes.length > 0, isSelected);

                  const shouldExpandEvals = expandedEvalsByStep[row.step.id] ?? (selectedAttachmentParentStepId === row.step.id && selectedType === "eval");
                  const visibleEvals = shouldExpandEvals ? row.evalNodes : row.evalNodes.slice(0, MAX_VISIBLE_EVALS);

                  const categories: Array<{ kind: AttachmentKind; title: string; count: number; tone: CategoryTone; expanded: boolean; show: boolean }> = [
                    { kind: "evals", title: "Evals", count: row.evalNodes.length, tone: "blue", expanded: evalExpanded, show: isSelected || row.evalNodes.length > 0 },
                    { kind: "reflections", title: "Reflections", count: row.reflectionNodes.length, tone: "purple", expanded: reflectionExpanded, show: isSelected || row.reflectionNodes.length > 0 },
                    { kind: "risks", title: "Safeguards", count: row.riskNodes.length, tone: "amber", expanded: riskExpanded, show: isSelected || row.riskNodes.length > 0 },
                  ];
                  const visibleCategories = categories.filter((category) => category.show);

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
                                <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "reflections")}>Reflection</button>
                                <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "risks")}>Safeguard</button>
                              </div>
                            </details>
                            <button type="button" onClick={() => onDuplicateStep(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs">Duplicate</button>
                            <button type="button" onClick={() => onDeleteNode(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs text-rose-600">Delete</button>
                          </div>
                        ) : null}

                        {visibleCategories.length ? (
                          <>
                            <div className="absolute left-1/2 top-full z-30 h-4 w-px -translate-x-1/2 bg-slate-300" />
                            <div className="absolute left-0 top-full z-40 mt-3 w-[378px] space-y-2">
                              {visibleCategories.map((category) => (
                                <AttachmentCategory
                                  key={category.kind}
                                  title={category.title}
                                  count={category.count}
                                  tone={category.tone}
                                  expanded={category.expanded}
                                  onToggle={() => toggleCategory(row.step.id, category.kind, category.count > 0, isSelected)}
                                  onAdd={() => handleAddConnected(row.step.id, category.kind)}
                                >
                                  {category.kind === "evals" ? (
                                    <>
                                      <AttachmentList
                                        tone="blue"
                                        items={visibleEvals.map((node) => ({
                                          id: node.id,
                                          label: node.data.evalQuestion || node.data.evalName || "Eval",
                                          subLabel: `Threshold: ${node.data.evalThreshold || "Add threshold"}`,
                                          detail: `Pass criteria: ${node.data.evalCriteria || "Add pass criteria"}`,
                                        }))}
                                        emptyMessage="No eval cards yet."
                                        onSelectNode={onSelectNode}
                                        onOpenDetails={onOpenDetails}
                                      />
                                      {row.evalNodes.length > MAX_VISIBLE_EVALS ? (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedEvalsByStep((prev) => ({ ...prev, [row.step.id]: !shouldExpandEvals }))}
                                          className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                        >
                                          {shouldExpandEvals ? "Show fewer" : `Show all (${row.evalNodes.length})`}
                                        </button>
                                      ) : null}
                                    </>
                                  ) : null}
                                  {category.kind === "reflections" ? (
                                    <AttachmentList
                                      tone="purple"
                                      items={row.reflectionNodes.map((node) => ({
                                        id: node.id,
                                        label: node.data.label || "Reflection",
                                        subLabel: `Trigger: ${node.data.reflectionTrigger || "Trigger not defined"}`,
                                        detail: node.data.reflectionLoopTarget === "previous_step" ? "Loop target: Returns to previous step" : "Loop target: Returns to this step",
                                      }))}
                                      emptyMessage="No reflection cards yet."
                                      onSelectNode={onSelectNode}
                                      onOpenDetails={onOpenDetails}
                                    />
                                  ) : null}
                                  {category.kind === "risks" ? (
                                    <AttachmentList
                                      tone="amber"
                                      items={row.riskNodes.map((node) => ({
                                        id: node.id,
                                        label: node.data.label || "Safeguard",
                                        subLabel: node.data.confidenceCheck || "Mitigation not defined",
                                      }))}
                                      emptyMessage="No safeguard cards yet."
                                      onSelectNode={onSelectNode}
                                      onOpenDetails={onOpenDetails}
                                    />
                                  ) : null}
                                </AttachmentCategory>
                              ))}
                            </div>
                          </>
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
        className="pointer-events-none absolute bottom-5 left-4 z-[80]"
        style={{ left: isDetailsPanelOpen ? detailsInsetPx + 16 : 16, transition: "left 180ms ease" }}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-md">
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

function AttachmentCategory({ title, count, tone, expanded, onToggle, onAdd, children }: { title: string; count: number; tone: CategoryTone; expanded: boolean; onToggle: () => void; onAdd: () => void; children: ReactNode }) {
  const toneClasses = {
    blue: {
      wrapper: "border-blue-200 bg-blue-50/40",
      label: "text-blue-700",
      accent: "bg-blue-500",
      add: "text-blue-700 hover:text-blue-900",
    },
    purple: {
      wrapper: "border-purple-200 bg-purple-50/40",
      label: "text-purple-700",
      accent: "bg-purple-500",
      add: "text-purple-700 hover:text-purple-900",
    },
    amber: {
      wrapper: "border-amber-200 bg-amber-50/45",
      label: "text-amber-700",
      accent: "bg-amber-500",
      add: "text-amber-700 hover:text-amber-900",
    },
  } as const;

  const currentTone = toneClasses[tone];

  return (
    <div className={`overflow-hidden rounded-xl border ${currentTone.wrapper}`}>
      <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 py-2.5">
        <span className={`h-4 w-1.5 rounded-full ${currentTone.accent}`} />
        <button type="button" onClick={onToggle} className="flex flex-1 items-center justify-between text-left">
          <span className={`text-xs font-semibold uppercase tracking-wide ${currentTone.label}`}>{title} ({count})</span>
          <span className="text-sm text-slate-500">{expanded ? "▾" : "▸"}</span>
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(); }} className={`rounded-md px-1.5 py-0.5 text-sm font-semibold ${currentTone.add}`}>+</button>
      </div>
      {expanded ? <div className="p-2.5">{children}</div> : null}
    </div>
  );
}

function AttachmentList({ items, emptyMessage, onSelectNode, onOpenDetails, tone }: { items: Array<{ id: string; label: string; subLabel: string; detail?: string }>; emptyMessage: string; onSelectNode: (nodeId: string | null) => void; onOpenDetails?: (nodeId: string) => void; tone: CategoryTone }) {
  if (!items.length) return <p className="text-xs text-slate-600">{emptyMessage}</p>;
  const itemClass = {
    blue: "border-blue-200 bg-white hover:border-blue-300",
    purple: "border-purple-200 bg-white hover:border-purple-300",
    amber: "border-amber-200 bg-white hover:border-amber-300",
  } as const;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => { onSelectNode(item.id); onOpenDetails?.(item.id); }} className={`w-full rounded-lg border-l-4 px-3 py-2.5 text-left ${itemClass[tone]}`}>
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
