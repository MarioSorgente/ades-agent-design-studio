"use client";

import { useMemo, useState } from "react";
import type { AdesNode, AdesNodeType, BoardViewMode, EvalCategory } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

type StudioBoardProps = {
  className?: string;
  viewMode?: BoardViewMode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onAddStepAt: (index: number) => void;
  onAddStepToEnd: () => void;
  onMoveStep: (nodeId: string, direction: "left" | "right") => void;
  onDuplicateStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnectedNode: (sourceId: string, type: AdesNodeType) => void;
};

type EvalFilter = "all" | "missing" | "end_to_end" | "tool_use" | "safety";

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

export function StudioBoard({ className, viewMode = "flow", selectedNodeId, onSelectNode, onAddStepAt, onAddStepToEnd, onMoveStep, onDuplicateStep, onDeleteNode, onAddConnectedNode }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const [evalFilter, setEvalFilter] = useState<EvalFilter>("all");

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const orderedMainSteps = useMemo(
    () => nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x),
    [nodes],
  );

  const evalNodes = useMemo(() => nodes.filter((node) => node.type === "eval"), [nodes]);

  const flowRows = useMemo(
    () =>
      orderedMainSteps.map((step) => {
        const connected = edges
          .filter((edge) => edge.source === step.id || edge.target === step.id)
          .map((edge) => nodeById.get(edge.source === step.id ? edge.target : edge.source))
          .filter((node): node is AdesNode => Boolean(node));

        const evalCount = connected.filter((node) => node.type === "eval").length + step.data.evals.length;
        const reflectionCount = connected.filter((node) => node.type === "reflection").length + step.data.reflectionHooks.length;
        const feedbackCount = connected.filter((node) => node.type === "feedback").length + step.data.feedbackHooks.length;
        const riskCount = connected.filter((node) => node.type === "risk").length + step.data.risks.length;
        const toolCount = step.data.tools.length;

        return { step, evalCount, reflectionCount: reflectionCount + feedbackCount, riskCount, toolCount };
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

      const hasRisk = step.data.risks.length > 0;
      if (hasRisk) {
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

    edges.forEach((edge) => {
      if (edge.data?.semanticType !== "reflection" && edge.data?.semanticType !== "feedback") return;
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target || !isMainStep(source)) return;
      const row = {
        id: edge.id,
        step: source,
        trigger: edge.data?.semanticType === "reflection" ? source.data.reflectionTrigger || "Uncertain output" : source.data.feedbackCondition || "Needs human review",
        action: target.data.body || target.data.label,
        why: target.data.purpose || "Improve quality before continuing",
      };
      if (edge.data.semanticType === "reflection") linkedByType.reflections.push(row);
      if (edge.data.semanticType === "feedback") linkedByType.feedback.push(row);
    });

    return linkedByType;
  }, [edges, nodeById, orderedMainSteps]);

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
                        <p className="mt-1 text-xs text-slate-600">Threshold/scoring: {evalNode.data.evalThreshold || "Add threshold"} · Method: {evalNode.data.evalMethod || "Define scoring method"}</p>
                        <p className="mt-1 text-xs text-slate-600">Failure example / dataset notes: {evalNode.data.evalDataset || "Add failure examples or dataset notes"}</p>
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
      className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-5"}
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
        <div className="mt-6 overflow-x-auto pb-4">
          <div className="flex min-w-max items-start gap-5 px-2 py-4">
            <AddStepChip label="+ Add step at beginning" onClick={() => onAddStepAt(0)} />

            {flowRows.map((row, index) => (
              <div key={row.step.id} className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => onSelectNode(row.step.id)}
                  className={`w-[360px] rounded-2xl border bg-white/95 p-4 text-left shadow-[0_20px_45px_-36px_rgba(15,23,42,0.55)] ${selectedNodeId === row.step.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                      <h4 className="mt-1 text-base font-semibold text-slate-900">{row.step.data.label}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMoveStep(row.step.id, "left"); }} className="ades-ghost-btn px-2 py-1 text-[11px]" aria-label="Move step left">← Move</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMoveStep(row.step.id, "right"); }} className="ades-ghost-btn px-2 py-1 text-[11px]" aria-label="Move step right">Move →</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateStep(row.step.id); }} className="ades-ghost-btn px-2 py-1 text-[11px]">Duplicate</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteNode(row.step.id); }} className="ades-ghost-btn px-2 py-1 text-[11px] text-rose-600">Delete</button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">{row.step.data.purpose || row.step.data.body || "Add one-line purpose to explain what this step does."}</p>
                  <p className="mt-2 text-xs text-slate-600">{row.step.data.inputs || "Inputs not defined"} → {row.step.data.outputs || "Outputs not defined"}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    <LabeledBadge label={`${row.toolCount} tools`} tooltip={BADGE_HELPERS.tools} />
                    <LabeledBadge label={`${row.evalCount} evals`} tooltip={BADGE_HELPERS.evals} />
                    <LabeledBadge label={`${row.reflectionCount} reflections`} tooltip={BADGE_HELPERS.reflections} />
                    <LabeledBadge label={`${row.riskCount} risks`} tooltip={BADGE_HELPERS.risks} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                    <button type="button" onClick={(event) => { event.stopPropagation(); onAddConnectedNode(row.step.id, "eval"); }} className="ades-ghost-btn px-2 py-1 text-[11px]">+ Eval</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onAddConnectedNode(row.step.id, "reflection"); }} className="ades-ghost-btn px-2 py-1 text-[11px]">+ Reflection</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onAddConnectedNode(row.step.id, "feedback"); }} className="ades-ghost-btn px-2 py-1 text-[11px]">+ Feedback</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onAddConnectedNode(row.step.id, "risk"); }} className="ades-ghost-btn px-2 py-1 text-[11px]">+ Safeguard</button>
                  </div>
                </button>

                <div className="flex items-center gap-5">
                  <div className="h-[2px] w-10 bg-slate-300" />
                  <AddStepChip label="+ Add step here" onClick={() => onAddStepAt(index + 1)} />
                  {index < flowRows.length - 1 ? <div className="h-[2px] w-10 bg-slate-300" /> : null}
                </div>
              </div>
            ))}

            <AddStepChip label="+ Add step at end" onClick={onAddStepToEnd} />
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledBadge({ label, tooltip }: { label: string; tooltip: string }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700" title={tooltip}>{label}</span>;
}

function AddStepChip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700">{label}</button>;
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
