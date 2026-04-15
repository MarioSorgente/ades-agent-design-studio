"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { AdesNode, AdesNodeType, BoardViewMode, EvalCategory } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

type StudioBoardProps = {
  className?: string;
  viewMode?: BoardViewMode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenDetails: () => void;
  onAddStepAt: (index: number) => void;
  onAddStepToEnd: () => void;
  onMoveStep: (nodeId: string, direction: "left" | "right") => void;
  onDuplicateStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnectedNode: (sourceId: string, type: AdesNodeType) => void;
};

type EvalFilter = "all" | "missing" | "end_to_end" | "tool_use" | "safety";
type AttachmentKind = "evals" | "reflections" | "feedback" | "risks";

const BADGE_HELPERS = {
  tools: "External tools or data sources this step needs.",
  evals: "Checks used to test whether this step works.",
  reflections: "Self-critique or revision loops for uncertain outputs.",
  risks: "Known failure modes or safety concerns.",
};

const EVAL_GROUPS: Array<{ key: string; title: string; matches: (node: AdesNode) => boolean }> = [
  { key: "end_to_end", title: "End-to-end evals", matches: (node) => node.data.evalScope === "flow" },
  { key: "step_level", title: "Step-level evals", matches: (node) => node.data.evalScope !== "flow" },
  { key: "tool_use", title: "Tool-use evals", matches: (node) => node.data.evalCategory === "tool_accuracy" },
  { key: "safety", title: "Safety/compliance evals", matches: (node) => node.data.evalCategory === "safety" || /safety|compliance|policy/i.test(`${node.data.evalName} ${node.data.evalQuestion}`) },
  { key: "robustness", title: "Robustness evals", matches: (node) => node.data.evalCategory === "robustness" },
];

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function isWeakEval(node: AdesNode) {
  return !node.data.evalQuestion.trim() || !node.data.evalCriteria.trim() || !node.data.evalThreshold.trim();
}

export function StudioBoard({ className, viewMode = "flow", selectedNodeId, onSelectNode, onOpenDetails, onAddStepAt, onAddStepToEnd, onMoveStep, onDuplicateStep, onDeleteNode, onAddConnectedNode }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const storeAddConnectedNode = useAdesBoardStore((state) => state.addConnectedNode);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");
  const [flowZoom, setFlowZoom] = useState(1);
  const [openAttachments, setOpenAttachments] = useState<Record<string, AttachmentKind | null>>({});

  const flowViewportRef = useRef<HTMLDivElement | null>(null);
  const flowContentRef = useRef<HTMLDivElement | null>(null);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const orderedMainSteps = useMemo(
    () => nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x),
    [nodes],
  );

  const evalNodes = useMemo(() => nodes.filter((node) => node.type === "eval"), [nodes]);

  const flowRows = useMemo(
    () =>
      orderedMainSteps.map((step, index) => {
        const connected = edges
          .filter((edge) => edge.source === step.id || edge.target === step.id)
          .map((edge) => nodeById.get(edge.source === step.id ? edge.target : edge.source))
          .filter((node): node is AdesNode => Boolean(node));

        const evalNodes = connected.filter((node) => node.type === "eval");
        const reflectionNodes = connected.filter((node) => node.type === "reflection");
        const feedbackNodes = connected.filter((node) => node.type === "feedback");
        const riskNodes = connected.filter((node) => node.type === "risk");

        const evalCount = evalNodes.length + step.data.evals.length;
        const reflectionCount = reflectionNodes.length + step.data.reflectionHooks.length;
        const feedbackCount = feedbackNodes.length + step.data.feedbackHooks.length + (step.type === "handoff" ? 1 : 0);
        const riskCount = riskNodes.length + step.data.risks.length;
        const toolCount = step.data.tools.length;

        const stepText = `${step.data.purpose} ${step.data.body} ${step.data.completionCriteria} ${step.data.reasoningRequired}`.toLowerCase();
        const likelyNeedsReflection =
          step.type !== "goal" &&
          reflectionCount === 0 &&
          (riskCount > 0 || toolCount > 0 || /uncertain|risk|policy|compliance|confidence|quality|ambig|critical/.test(stepText));
        const likelyNeedsEval =
          evalCount === 0 &&
          (index > 0 || step.type === "handoff") &&
          (riskCount > 0 || toolCount > 0 || /critical|important|success|quality|safety|output/.test(stepText));

        return { step, evalCount, reflectionCount, feedbackCount, riskCount, toolCount, evalNodes, reflectionNodes, feedbackNodes, riskNodes, likelyNeedsReflection, likelyNeedsEval };
      }),
    [edges, nodeById, orderedMainSteps],
  );

  const improvementSections = useMemo(() => {
    const linkedByType = {
      reflections: [] as Array<{ id: string; step: AdesNode; trigger: string; action: string; why: string }>,
      feedback: [] as Array<{ id: string; step: AdesNode; trigger: string; action: string; why: string }>,
      riskSafeguards: [] as Array<{ id: string; step: AdesNode; trigger: string; action: string; why: string }>,
      escalations: [] as Array<{ id: string; step: AdesNode; trigger: string; action: string; why: string }>,
    };

    orderedMainSteps.forEach((step) => {
      step.data.reflectionHooks.forEach((hook, index) => {
        linkedByType.reflections.push({
          id: `${step.id}-reflection-hook-${index}`,
          step,
          trigger: hook.trigger || "Unclear trigger",
          action: hook.revisionAction || "Revise response",
          why: hook.purpose || "Reduce quality risks before moving forward",
        });
      });

      step.data.feedbackHooks.forEach((hook, index) => {
        linkedByType.feedback.push({
          id: `${step.id}-feedback-hook-${index}`,
          step,
          trigger: hook.whenToRequest || "When confidence is low",
          action: hook.afterFeedbackAction || "Revise using reviewer input",
          why: hook.whatIsReviewed || "Catch quality gaps before final output",
        });
      });

      if (step.data.risks.length > 0) {
        linkedByType.riskSafeguards.push({
          id: `${step.id}-risk`,
          step,
          trigger: step.data.risks.join("; "),
          action: step.data.completionCriteria || "Define mitigation and fallback",
          why: "Known failure modes should have explicit safeguards",
        });
      }

      if (step.type === "handoff" || /escalat|human|review/i.test(`${step.data.completionCriteria} ${step.data.body}`)) {
        linkedByType.escalations.push({
          id: `${step.id}-escalation`,
          step,
          trigger: step.data.confidenceCheck || step.data.feedbackCondition || "Confidence or policy uncertainty",
          action: step.data.feedbackAction || step.data.completionCriteria || "Escalate with context",
          why: "Prevents risky outputs from being delivered without review",
        });
      }
    });

    return linkedByType;
  }, [orderedMainSteps]);

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
    const content = flowContentRef.current;
    if (!viewport || !content) return;

    const availableWidth = viewport.clientWidth - 40;
    const contentWidth = content.scrollWidth;
    const nextZoom = Math.max(0.7, Math.min(1.6, Number((availableWidth / Math.max(contentWidth, 1)).toFixed(2))));
    setFlowZoom(nextZoom);

    window.requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
  }

  function handleToggleAttachment(stepId: string, kind: AttachmentKind) {
    setOpenAttachments((prev) => ({ ...prev, [stepId]: prev[stepId] === kind ? null : kind }));
  }

  function handleQuickAdd(sourceId: string, type: AdesNodeType) {
    const before = new Set(nodes.map((node) => node.id));
    storeAddConnectedNode(sourceId, type);
    if (type !== "reflection") return;

    const loopTargetInput = window.prompt("Reflection loop target: same_step or previous_step", "same_step");
    const reflectionTrigger = window.prompt("When should this reflection run?", "Low confidence or missing constraints");
    const reflectionAction = window.prompt("What should the agent revise?", "Critique output and revise before continuing");
    const loopTarget = loopTargetInput === "previous_step" ? "previous_step" : "same_step";

    window.setTimeout(() => {
      const nextReflection = useAdesBoardStore
        .getState()
        .nodes.find((node) => node.type === "reflection" && !before.has(node.id));
      if (!nextReflection) return;
      updateNode(nextReflection.id, (node) => ({
        ...node,
        data: {
          ...node.data,
          reflectionLoopTarget: loopTarget,
          reflectionTrigger: reflectionTrigger?.trim() || node.data.reflectionTrigger,
          reflectionPrompt: reflectionAction?.trim() || node.data.reflectionPrompt,
          reflectionRevisionAction: reflectionAction?.trim() || node.data.reflectionRevisionAction,
        },
      }));
    }, 0);
  }

  useEffect(() => {
    if (viewMode !== "flow") return;
    handleFitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, orderedMainSteps.length]);

  if (viewMode === "improvement") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-5"}>
        <h3 className="text-base font-semibold text-slate-900">Improvement View</h3>
        <p className="mt-1 text-sm text-slate-600">Where the agent reflects, asks for feedback, or escalates when quality is uncertain.</p>

        <ImprovementSection title="Reflection loops" description="Self-critique checkpoints before risky outputs." rows={improvementSections.reflections} onSelectNode={onSelectNode} />
        <ImprovementSection title="Human feedback / handoffs" description="Places where a person reviews or corrects the agent." rows={improvementSections.feedback} onSelectNode={onSelectNode} />
        <ImprovementSection title="Risks and safeguards" description="Known risks mapped to mitigation logic." rows={improvementSections.riskSafeguards} onSelectNode={onSelectNode} />
        <ImprovementSection title="Escalation conditions" description="Confidence or policy triggers that route to a safer path." rows={improvementSections.escalations} onSelectNode={onSelectNode} />
      </div>
    );
  }

  if (viewMode === "eval") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-5"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eval View</h3>
            <p className="mt-1 text-sm text-slate-600">Questions and checks used to test the agent before implementation.</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {([
              ["all", "All"],
              ["missing", "Missing/weak"],
              ["end_to_end", "End-to-end"],
              ["tool_use", "Tool-use"],
              ["safety", "Safety"],
            ] as Array<[EvalFilter, string]>).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setEvalFilter(key)} className={`rounded-lg px-3 py-1 text-xs font-medium ${evalFilter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {EVAL_GROUPS.map((group) => {
            const groupRows = evalRows.filter((row) => group.matches(row.evalNode));
            return (
              <section key={group.key}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h4>
                <div className="mt-2 space-y-2">
                  {groupRows.length ? (
                    groupRows.map(({ evalNode, relatedStep }) => (
                      <button
                        key={evalNode.id}
                        type="button"
                        onClick={() => onSelectNode(evalNode.id)}
                        className={`w-full rounded-2xl border bg-white p-3 text-left ${selectedNodeId === evalNode.id ? "border-emerald-300" : "border-slate-200 hover:border-emerald-200"}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{relatedStep ? `Related step: ${relatedStep.data.label}` : "Flow-level eval"}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{evalNode.data.evalQuestion || evalNode.data.evalName || evalNode.data.label}</p>
                        <p className="mt-1 text-xs text-slate-600">Category: {prettyEvalCategory(evalNode.data.evalCategory)} · Scope: {evalNode.data.evalScope === "flow" ? "End-to-end" : "Step-level"}</p>
                        <p className="mt-1 text-xs text-slate-600">Pass criteria: {evalNode.data.evalCriteria || "Add pass criteria"}</p>
                        <p className="mt-1 text-xs text-slate-600">Threshold/scoring: {evalNode.data.evalThreshold || "Add threshold"}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">No evals in this group yet.</div>
                  )}
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
      className={className ?? "relative h-[calc(100vh-11rem)] min-h-[700px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-5"}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    >
      <h3 className="text-base font-semibold text-slate-900">Flow View</h3>
      <p className="mt-1 text-sm text-slate-600">Main steps the agent performs to complete the job.</p>

      {!flowRows.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/90 p-6 text-center">
          <p className="text-sm text-slate-600">No main steps yet.</p>
          <button type="button" onClick={() => onAddStepAt(0)} className="ades-primary-btn mt-3 px-3 py-2 text-xs">+ Add first step</button>
        </div>
      ) : (
        <>
          <div ref={flowViewportRef} className="relative mt-6 h-[calc(100%-5rem)] overflow-auto pb-16">
            <div className="origin-top-left px-2 py-4" style={{ transform: `scale(${flowZoom})`, width: `${100 / flowZoom}%` }}>
              <div ref={flowContentRef} className="relative min-w-max">
                <div className="flex items-start gap-5">
                  <AddStepChip label="+ Add step at beginning" onClick={() => onAddStepAt(0)} />

                {flowRows.map((row, index) => {
                  const openAttachment = openAttachments[row.step.id] ?? null;
                  return (
                    <div key={row.step.id} className="flex items-start gap-5">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => onSelectNode(row.step.id)}
                          className={`relative w-[360px] rounded-2xl border bg-white/95 p-4 text-left shadow-[0_20px_45px_-36px_rgba(15,23,42,0.55)] ${selectedNodeId === row.step.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200"}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                            <h4 className="mt-1 text-[17px] font-semibold text-slate-900">{row.step.data.label}</h4>
                          </div>
                          {selectedNodeId === row.step.id ? (
                            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                              <button type="button" onClick={(event) => { event.stopPropagation(); onOpenDetails(); }} className="ades-ghost-btn px-2 py-1 text-xs" aria-label="Open card details">📝 Details</button>
                              <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateStep(row.step.id); }} className="ades-ghost-btn px-2 py-1 text-xs">Duplicate</button>
                              <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteNode(row.step.id); }} className="ades-ghost-btn px-2 py-1 text-xs text-rose-600">Delete</button>
                            </div>
                          ) : null}
                        </div>

                          <p className="mt-2 text-[14px] text-slate-700">{row.step.data.purpose || row.step.data.body || "Add one-line purpose to explain what this step does."}</p>
                          <p className="mt-2 text-[13px] text-slate-600">{row.step.data.inputs || "Inputs not defined"} → {row.step.data.outputs || "Outputs not defined"}</p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <PillButton label={`${row.evalCount} evals`} active={openAttachment === "evals"} onClick={(event) => { event.stopPropagation(); handleToggleAttachment(row.step.id, "evals"); }} />
                            <PillButton label={`${row.reflectionCount} reflections`} active={openAttachment === "reflections"} onClick={(event) => { event.stopPropagation(); handleToggleAttachment(row.step.id, "reflections"); }} />
                            <PillButton label={`${row.feedbackCount} feedback`} active={openAttachment === "feedback"} onClick={(event) => { event.stopPropagation(); handleToggleAttachment(row.step.id, "feedback"); }} />
                            <PillButton label={`${row.riskCount} safeguards`} active={openAttachment === "risks"} onClick={(event) => { event.stopPropagation(); handleToggleAttachment(row.step.id, "risks"); }} />
                          </div>

                          {selectedNodeId === row.step.id ? (
                            <details className="mt-3" onClick={(event) => event.stopPropagation()}>
                              <summary className="cursor-pointer list-none text-[13px] font-medium text-slate-700">+ Add</summary>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => onAddConnectedNode(row.step.id, "eval")}>Eval</button>
                                <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => handleQuickAdd(row.step.id, "reflection")}>Reflection loop</button>
                                <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => onAddConnectedNode(row.step.id, "feedback")}>Feedback loop</button>
                                <button type="button" className="ades-ghost-btn px-2 py-1 text-xs" onClick={() => onAddConnectedNode(row.step.id, "risk")}>Safeguard</button>
                              </div>
                            </details>
                          ) : null}
                        </button>

                        {openAttachment && openAttachment !== "reflections" ? (
                          <div className="absolute left-0 top-full z-20 mt-2 w-[360px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                            {openAttachment === "evals" ? (
                              <div className="space-y-2">
                                {row.evalNodes.length ? row.evalNodes.map((node) => (
                                  <button key={node.id} type="button" onClick={() => { onSelectNode(node.id); onOpenDetails(); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-indigo-200">
                                    <p className="text-[13px] font-semibold text-slate-900">{node.data.evalQuestion || node.data.evalName || node.data.label}</p>
                                    <p className="mt-0.5 text-xs text-slate-600">Category: {prettyEvalCategory(node.data.evalCategory)}</p>
                                    <p className="mt-0.5 text-xs text-slate-600">Threshold: {node.data.evalThreshold || "Add threshold"} · Pass: {node.data.evalCriteria || "Add pass criteria"}</p>
                                  </button>
                                )) : <p className="text-[13px] text-slate-600">No eval cards attached yet.</p>}
                                <button type="button" onClick={() => onAddConnectedNode(row.step.id, "eval")} className="ades-ghost-btn px-2 py-1 text-xs">+ Add eval</button>
                              </div>
                            ) : null}
                            {openAttachment === "feedback" ? <AttachmentList emptyMessage="No feedback loops attached yet." items={row.feedbackNodes.map((node) => ({ id: node.id, label: node.data.label, subLabel: node.data.feedbackCondition || "Trigger not defined" }))} onSelectNode={onSelectNode} onOpenDetails={onOpenDetails} /> : null}
                            {openAttachment === "risks" ? <AttachmentList emptyMessage="No safeguards attached yet." items={row.riskNodes.map((node) => ({ id: node.id, label: node.data.label, subLabel: node.data.confidenceCheck || "Mitigation not defined" }))} onSelectNode={onSelectNode} onOpenDetails={onOpenDetails} /> : null}
                          </div>
                        ) : null}

                        {(openAttachment === "reflections" || Boolean(selectedNodeId && row.reflectionNodes.some((node) => node.id === selectedNodeId))) ? (
                          <div className="absolute left-0 top-full z-20 mt-3 w-[360px] space-y-3">
                            {row.reflectionNodes.length ? row.reflectionNodes.map((node) => (
                              <button key={node.id} type="button" onClick={() => { onSelectNode(node.id); onOpenDetails(); }} className="relative w-full rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-left shadow-sm">
                                <svg className="pointer-events-none absolute -top-8 left-1/2 h-8 w-8 -translate-x-1/2" viewBox="0 0 32 32" fill="none">
                                  <path d="M16 30V4" stroke="#6366f1" strokeWidth="1.8" />
                                  <path d="M12 8L16 4L20 8" stroke="#6366f1" strokeWidth="1.8" />
                                </svg>
                                <p className="text-sm font-semibold text-indigo-900">{node.data.label}</p>
                                <p className="mt-1 text-xs text-indigo-900">Trigger: {node.data.reflectionTrigger || "Not defined"}</p>
                                <p className="mt-1 text-xs text-indigo-900">Action: {node.data.reflectionRevisionAction || node.data.reflectionPrompt || "Revise and retry"}</p>
                                <p className="mt-1 text-xs font-semibold text-indigo-800">{node.data.reflectionLoopTarget === "previous_step" ? "Back to previous step" : "Back to same step"}</p>
                                <svg className="pointer-events-none absolute -bottom-8 left-1/2 h-8 w-44 -translate-x-1/2" viewBox="0 0 176 32" fill="none">
                                  {node.data.reflectionLoopTarget === "previous_step" ? (
                                    <>
                                      <path d="M88 2C70 20 34 20 8 20" stroke="#6366f1" strokeWidth="1.8" />
                                      <path d="M12 16L6 20L12 24" stroke="#6366f1" strokeWidth="1.8" />
                                    </>
                                  ) : (
                                    <>
                                      <path d="M88 2C88 22 88 22 88 30" stroke="#6366f1" strokeWidth="1.8" />
                                      <path d="M84 26L88 30L92 26" stroke="#6366f1" strokeWidth="1.8" />
                                    </>
                                  )}
                                </svg>
                              </button>
                            )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">No reflections attached yet.</p>}
                          </div>
                        ) : null}
                      </div>

                        {row.likelyNeedsReflection ? (
                          <SuggestionHint
                            text="Suggested: add reflection here"
                            reason="This step has uncertainty/risk/output-quality dependency."
                            actionLabel="+ Reflection"
                            onAction={(event) => {
                              event.stopPropagation();
                              onAddConnectedNode(row.step.id, "reflection");
                            }}
                          />
                        ) : null}
                        {row.likelyNeedsEval ? (
                          <SuggestionHint
                            text="Suggested: add eval"
                            reason="This step is critical to task success."
                            actionLabel="+ Eval"
                            onAction={(event) => {
                              event.stopPropagation();
                              onAddConnectedNode(row.step.id, "eval");
                            }}
                          />
                        ) : null}
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

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 pb-3">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm">
              <button type="button" className="ades-ghost-btn h-7 w-7 px-0 py-0 text-sm" onClick={() => setFlowZoom((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(2))))}>−</button>
              <span className="min-w-11 text-center text-xs font-semibold text-slate-700">{Math.round(flowZoom * 100)}%</span>
              <button type="button" className="ades-ghost-btn h-7 w-7 px-0 py-0 text-sm" onClick={() => setFlowZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}>+</button>
              <button type="button" className="ades-ghost-btn h-7 px-2 py-0 text-xs" onClick={handleFitView}>Fit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PillButton({ label, active, onClick }: { label: string; active?: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-slate-50 text-slate-700"}`} title={BADGE_HELPERS.evals}>{label}</button>;
}

function AttachmentList({ items, emptyMessage, onSelectNode, onOpenDetails }: { items: Array<{ id: string; label: string; subLabel: string }>; emptyMessage: string; onSelectNode: (nodeId: string | null) => void; onOpenDetails: () => void }) {
  if (!items.length) return <p className="text-xs text-slate-600">{emptyMessage}</p>;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => { onSelectNode(item.id); onOpenDetails(); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-indigo-200">
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

function SuggestionHint({ text, reason, actionLabel, onAction }: { text: string; reason: string; actionLabel: string; onAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="mt-2 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-2">
      <p className="text-[11px] font-semibold text-indigo-800">{text}</p>
      <p className="mt-0.5 text-[11px] text-indigo-700">{reason}</p>
      <button type="button" onClick={onAction} className="ades-ghost-btn mt-1 px-2 py-1 text-[11px]">{actionLabel}</button>
    </div>
  );
}

function ImprovementSection({ title, description, rows, onSelectNode }: { title: string; description: string; rows: Array<{ id: string; step: AdesNode; trigger: string; action: string; why: string }>; onSelectNode: (nodeId: string | null) => void }) {
  return (
    <section className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-2 space-y-2">
        {rows.length ? rows.map((row) => (
          <button key={row.id} type="button" onClick={() => onSelectNode(row.step.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Related step</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{row.step.data.label}</p>
            <p className="mt-1 text-xs text-slate-700"><strong>Trigger:</strong> {row.trigger}</p>
            <p className="mt-1 text-xs text-slate-700"><strong>Why it matters:</strong> {row.why}</p>
            <p className="mt-1 text-xs text-slate-700"><strong>Action taken:</strong> {row.action}</p>
          </button>
        )) : <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">No items in this section yet.</p>}
      </div>
    </section>
  );
}

function prettyEvalCategory(value: EvalCategory) {
  return value.replace(/_/g, " ");
}
