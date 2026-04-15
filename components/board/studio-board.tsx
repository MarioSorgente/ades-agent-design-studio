"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdesNode, AdesNodeType, BoardViewMode } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

type StudioBoardProps = {
  className?: string;
  viewMode?: BoardViewMode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onAddStepAt: (index: number) => void;
  onAddStepToEnd: () => void;
  onDuplicateStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnectedNode: (sourceId: string, type: AdesNodeType) => string | null;
  onOpenDetails: (nodeId: string) => void;
};

type EvalFilter = "all" | "missing" | "end_to_end" | "tool_use" | "safety";
type AttachmentKind = "evals" | "reflections" | "feedback" | "risks";

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

export function StudioBoard({ className, viewMode = "flow", selectedNodeId, onSelectNode, onAddStepAt, onAddStepToEnd, onDuplicateStep, onDeleteNode, onAddConnectedNode, onOpenDetails }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");
  const [flowZoom, setFlowZoom] = useState(1);
  const [openAttachments, setOpenAttachments] = useState<Record<string, AttachmentKind | null>>({});

  const flowViewportRef = useRef<HTMLDivElement | null>(null);
  const flowContentRef = useRef<HTMLDivElement | null>(null);

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

        const evalNodes = connected.filter((node) => node.type === "eval");
        const reflectionNodes = connected.filter((node) => node.type === "reflection");
        const feedbackNodes = connected.filter((node) => node.type === "feedback");
        const riskNodes = connected.filter((node) => node.type === "risk");

        return {
          step,
          evalNodes,
          reflectionNodes,
          feedbackNodes,
          riskNodes,
          evalCount: evalNodes.length + step.data.evals.length,
          reflectionCount: reflectionNodes.length + step.data.reflectionHooks.length,
          feedbackCount: feedbackNodes.length + step.data.feedbackHooks.length,
          riskCount: riskNodes.length + step.data.risks.length,
        };
      }),
    [edges, nodeById, orderedMainSteps],
  );

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

  function handleFitView() {
    const viewport = flowViewportRef.current;
    if (!viewport || !orderedMainSteps.length) return;
    const minX = Math.min(...orderedMainSteps.map((step) => step.position.x));
    const maxX = Math.max(...orderedMainSteps.map((step) => step.position.x));
    const boardWidth = Math.max(420, maxX - minX + 460);
    const availableWidth = Math.max(300, viewport.clientWidth - 96);
    const nextZoom = Math.max(0.25, Math.min(1, Number((availableWidth / boardWidth).toFixed(2))));
    setFlowZoom(nextZoom);
    window.requestAnimationFrame(() => viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" }));
  }

  function handleAddConnected(stepId: string, kind: AttachmentKind) {
    const map: Record<AttachmentKind, AdesNodeType> = {
      evals: "eval",
      reflections: "reflection",
      feedback: "feedback",
      risks: "risk",
    };
    const newId = onAddConnectedNode(stepId, map[kind]);
    if (!newId) return;
    setOpenAttachments((prev) => ({ ...prev, [stepId]: kind }));
    onSelectNode(newId);
    onOpenDetails(newId);
  }

  useEffect(() => {
    if (viewMode !== "flow") return;
    handleFitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, orderedMainSteps.length]);

  if (viewMode === "eval") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-9rem)] min-h-[650px] overflow-auto rounded-2xl border border-slate-200/90 bg-white p-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Eval View</h3>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {([
              ["all", "All"],
              ["missing", "Missing/weak"],
              ["end_to_end", "End-to-end"],
              ["tool_use", "Tool-use"],
              ["safety", "Safety"],
            ] as Array<[EvalFilter, string]>).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setEvalFilter(key)} className={`rounded-md px-2 py-1 text-xs ${evalFilter === key ? "bg-white shadow-sm" : "text-slate-600"}`}>{label}</button>
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
                      <p className="text-xs text-slate-600">Threshold: {evalNode.data.evalThreshold || "Add threshold"}</p>
                      <p className="text-xs text-slate-600">Pass criteria: {evalNode.data.evalCriteria || "Add pass criteria"}</p>
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
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-9rem)] min-h-[650px] overflow-auto rounded-2xl border border-slate-200/90 bg-white p-4"}>
        <h3 className="text-sm font-semibold text-slate-900">Improvement View</h3>
        <p className="mt-1 text-xs text-slate-600">Open reflections/feedback pills in Flow view to inspect loop connectors near each step.</p>
      </div>
    );
  }

  return (
    <div
      id="ades-canvas-export"
      className={className ?? "relative h-[calc(100vh-9rem)] min-h-[650px] overflow-visible rounded-2xl border border-slate-200/90 bg-white p-4"}
      style={{
        backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    >
      {!flowRows.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/90 p-6 text-center">
          <p className="text-sm text-slate-600">No main steps yet.</p>
          <button type="button" onClick={() => onAddStepAt(0)} className="ades-primary-btn mt-3 px-3 py-2 text-xs">+ Add first step</button>
        </div>
      ) : (
        <>
          <div ref={flowViewportRef} className="relative h-full overflow-auto pb-16">
            <div className="origin-top-left px-2 py-4" style={{ transform: `scale(${flowZoom})`, width: `${100 / flowZoom}%` }}>
              <div ref={flowContentRef} className="min-w-max">
                <div className="flex items-start gap-5">
                  <AddStepChip label="+ Add step at beginning" onClick={() => onAddStepAt(0)} />
                  {flowRows.map((row, index) => {
                    const openAttachment = openAttachments[row.step.id] ?? null;
                    const isSelected = selectedNodeId === row.step.id;
                    return (
                      <div key={row.step.id} className="flex items-start gap-4">
                        <div className="relative pb-36">
                          <button
                            type="button"
                            onClick={() => onSelectNode(row.step.id)}
                            onDoubleClick={() => onOpenDetails(row.step.id)}
                            className={`relative z-20 w-[350px] rounded-2xl border bg-white p-4 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.65)] ${isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200"}`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                            <h4 className="mt-1 text-base font-semibold text-slate-900">{row.step.data.label}</h4>
                            <p className="mt-2 text-sm text-slate-700">{row.step.data.purpose || row.step.data.body || "Add one-line purpose to explain this step."}</p>
                            <p className="mt-2 text-xs text-slate-600">{row.step.data.inputs || "Inputs not defined"} → {row.step.data.outputs || "Outputs not defined"}</p>
                          </button>

                          {isSelected ? (
                            <div className="absolute right-2 top-2 z-50 flex items-center gap-1 rounded-lg border border-indigo-200 bg-white/98 p-1 shadow-lg">
                              <button type="button" title="Open card details" onClick={() => onOpenDetails(row.step.id)} className="h-7 w-7 cursor-pointer rounded-md border border-slate-300 bg-white text-sm font-semibold leading-none text-slate-700 hover:border-indigo-300 hover:text-indigo-700">▢</button>
                              <details className="relative" onClick={(event) => event.stopPropagation()}>
                                <summary className="ades-ghost-btn list-none cursor-pointer select-none px-2 py-1 text-xs [&::-webkit-details-marker]:hidden">+ Add</summary>
                                <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                                  <button type="button" className="ades-ghost-btn w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "evals")}>Add eval</button>
                                  <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "reflections")}>Add reflection loop</button>
                                  <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "feedback")}>Add feedback loop</button>
                                  <button type="button" className="ades-ghost-btn mt-1 w-full px-2 py-1 text-left text-xs" onClick={() => handleAddConnected(row.step.id, "risks")}>Add safeguard</button>
                                </div>
                              </details>
                              <button type="button" onClick={() => onDuplicateStep(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs">Duplicate</button>
                              <button type="button" onClick={() => onDeleteNode(row.step.id)} className="ades-ghost-btn px-2 py-1 text-xs text-rose-600">Delete</button>
                            </div>
                          ) : null}

                          {openAttachment && isSelected ? (
                            <div className="absolute left-0 top-full z-40 mt-2 w-[350px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                              {openAttachment === "evals" ? (
                                <AttachmentList items={row.evalNodes.map((node) => ({ id: node.id, label: node.data.evalQuestion || node.data.evalName || node.data.label, subLabel: `Threshold: ${node.data.evalThreshold || "Add threshold"} · Pass: ${node.data.evalCriteria || "Add pass criteria"}` }))} emptyMessage="No eval cards attached yet." onSelectNode={onSelectNode} onOpenDetails={onOpenDetails} />
                              ) : null}
                              {openAttachment === "reflections" ? (
                                <div className="space-y-2">
                                  {row.reflectionNodes.length ? row.reflectionNodes.map((node) => (
                                    <button key={node.id} type="button" onClick={() => { onSelectNode(node.id); onOpenDetails(node.id); }} className="w-full rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5 text-left hover:border-indigo-300">
                                      <p className="text-xs font-semibold text-indigo-900">{node.data.label || "Reflection"}</p>
                                      <p className="text-xs text-indigo-800">{node.data.reflectionPrompt || "Add reflection prompt"}</p>
                                      <div className="mt-2 rounded-md border border-indigo-200 bg-white/70 px-2 py-1 text-[11px] text-indigo-700">Step → Reflection</div>
                                      <div className="mt-1 rounded-md border border-indigo-200 bg-white/70 px-2 py-1 text-[11px] font-medium text-indigo-700">{node.data.reflectionLoopTarget === "previous_step" ? "↩ Returns to previous step" : "↩ Returns to this step"}</div>
                                    </button>
                                  )) : <p className="text-xs text-slate-600">No reflections attached yet.</p>}
                                </div>
                              ) : null}
                              {openAttachment === "feedback" ? <AttachmentList items={row.feedbackNodes.map((node) => ({ id: node.id, label: node.data.label, subLabel: node.data.feedbackCondition || "Trigger not defined" }))} emptyMessage="No feedback loops attached yet." onSelectNode={onSelectNode} onOpenDetails={onOpenDetails} /> : null}
                              {openAttachment === "risks" ? <AttachmentList items={row.riskNodes.map((node) => ({ id: node.id, label: node.data.label, subLabel: node.data.confidenceCheck || "Mitigation not defined" }))} emptyMessage="No safeguards attached yet." onSelectNode={onSelectNode} onOpenDetails={onOpenDetails} /> : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-5 pt-20">
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

          <div className="pointer-events-none absolute bottom-4 left-4 z-30">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm">
              <button type="button" className="ades-ghost-btn h-7 w-7 px-0 py-0 text-sm" onClick={() => setFlowZoom((prev) => Math.max(0.25, Number((prev - 0.1).toFixed(2))))}>−</button>
              <span className="min-w-12 text-center text-xs font-semibold text-slate-700">{Math.round(flowZoom * 100)}%</span>
              <button type="button" className="ades-ghost-btn h-7 w-7 px-0 py-0 text-sm" onClick={() => setFlowZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}>+</button>
              <button type="button" className="ades-ghost-btn h-7 px-2 py-0 text-xs" onClick={() => setFlowZoom(1)}>100%</button>
              <button type="button" className="ades-ghost-btn h-7 px-2 py-0 text-xs" onClick={handleFitView}>Fit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AttachmentList({ items, emptyMessage, onSelectNode, onOpenDetails }: { items: Array<{ id: string; label: string; subLabel: string }>; emptyMessage: string; onSelectNode: (nodeId: string | null) => void; onOpenDetails?: (nodeId: string) => void }) {
  if (!items.length) return <p className="text-xs text-slate-600">{emptyMessage}</p>;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => { onSelectNode(item.id); onOpenDetails?.(item.id); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-indigo-200">
          <p className="text-xs font-semibold text-slate-900">{item.label}</p>
          <p className="mt-0.5 text-[11px] text-slate-600">{item.subLabel}</p>
        </button>
      ))}
    </div>
  );
}

function AddStepChip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700">{label}</button>;
}
