"use client";

import { type ReactNode } from "react";
import { getNodeTheme } from "@/lib/board/node-theme";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNodeType, BoardViewMode, EvalCategory } from "@/lib/board/types";

const evalCategories: EvalCategory[] = ["task_success", "reasoning_quality", "tool_accuracy", "output_quality", "efficiency", "safety", "escalation", "reflection_effectiveness", "feedback_usefulness", "robustness"];

const TEXTAREA_CLASS = "ades-input min-h-[88px] resize-y text-[15px] leading-7";

export function BoardInspector({ viewMode, nodeId }: { viewMode: BoardViewMode; nodeId: string | null }) {
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const selectedNode = useAdesBoardStore((state) => (nodeId ? state.nodes.find((node) => node.id === nodeId) ?? null : null));

  if (!selectedNode) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <p>Select a card, then open details to edit fields.</p>
        <p className="mt-2 text-xs text-slate-500">Current view: {viewMode}</p>
      </div>
    );
  }

  const nodeTheme = getNodeTheme(selectedNode.type as AdesNodeType);

  const updateField = (
    field:
      | "label"
      | "purpose"
      | "whyThisStepExists"
      | "inputs"
      | "outputs"
      | "completionCriteria"
      | "reflectionTrigger"
      | "reflectionPrompt"
      | "reflectionLoopTarget"
      | "feedbackSource"
      | "feedbackCondition"
      | "feedbackAction"
      | "feedbackUpdatesScope"
      | "evalName"
      | "evalQuestion"
      | "evalCategory"
      | "evalScope"
      | "evalCriteria"
      | "evalDataset"
      | "evalThreshold"
      | "confidenceCheck",
    value: string,
  ) => {
    updateNode(selectedNode.id, (node) => ({ ...node, data: { ...node.data, [field]: value } }));
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${nodeTheme.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nodeTheme.dotClass}`} />
            {nodeTheme.label}
          </span>
          <span className="text-xs font-medium text-slate-500">{nodeTheme.label}</span>
        </div>
      </div>

      <Field label="Title"><input value={selectedNode.data.label} onChange={(event) => updateField("label", event.target.value)} className="ades-input text-[15px]" /></Field>

      {(selectedNode.type === "goal" || selectedNode.type === "task" || selectedNode.type === "handoff") ? (
        <>
          <Field label="Why this exists"><textarea value={selectedNode.data.whyThisStepExists || selectedNode.data.purpose} onChange={(event) => { updateField("whyThisStepExists", event.target.value); updateField("purpose", event.target.value); }} rows={4} className={TEXTAREA_CLASS} /></Field>
          <Field label="Inputs"><textarea value={selectedNode.data.inputs} onChange={(event) => updateField("inputs", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
          <Field label="Outputs"><textarea value={selectedNode.data.outputs} onChange={(event) => updateField("outputs", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
          <Field label="Completion criteria"><textarea value={selectedNode.data.completionCriteria} onChange={(event) => updateField("completionCriteria", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
          <ReadOnlyList title="Tools" items={selectedNode.data.tools} emptyMessage="No tools listed." />
          <ReadOnlyList title="Attached evals" items={selectedNode.data.evals.map((item) => item.name)} emptyMessage="No attached eval definitions." />
          <ReadOnlyList title="Reflections" items={[...selectedNode.data.reflectionHooks.map((hook) => hook.trigger)]} emptyMessage="No reflection hooks yet." />
          <ReadOnlyList title="Risks" items={selectedNode.data.risks} emptyMessage="No risks listed." />
        </>
      ) : null}

      {selectedNode.type === "eval" ? (
        <Section title="Eval details">
          <Field label="Eval title"><input value={selectedNode.data.evalName} onChange={(event) => updateField("evalName", event.target.value)} className="ades-input text-[15px]" /></Field>
          <Field label="Eval question"><textarea value={selectedNode.data.evalQuestion} onChange={(event) => updateField("evalQuestion", event.target.value)} rows={4} className={TEXTAREA_CLASS} /></Field>
          <Field label="Category">
            <select value={selectedNode.data.evalCategory} onChange={(event) => updateField("evalCategory", event.target.value)} className="ades-input text-[15px]">
              {evalCategories.map((category) => (<option key={category} value={category}>{category.replace(/_/g, " ")}</option>))}
            </select>
          </Field>
          <Field label="Scope">
            <select value={selectedNode.data.evalScope} onChange={(event) => updateField("evalScope", event.target.value)} className="ades-input text-[15px]">
              <option value="step">Step-level</option>
              <option value="flow">End-to-end</option>
            </select>
          </Field>
          <Field label="Pass criteria"><textarea value={selectedNode.data.evalCriteria} onChange={(event) => updateField("evalCriteria", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
          <Field label="Threshold / scoring"><textarea value={selectedNode.data.evalThreshold} onChange={(event) => updateField("evalThreshold", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
          <Field label="Failure examples / dataset notes"><textarea value={selectedNode.data.evalDataset} onChange={(event) => updateField("evalDataset", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "reflection" ? (
        <Section title="Reflection details">
          <Field label="Trigger"><input value={selectedNode.data.reflectionTrigger} onChange={(event) => updateField("reflectionTrigger", event.target.value)} className="ades-input text-[15px]" /></Field>
          <Field label="Loop target">
            <select value={selectedNode.data.reflectionLoopTarget} onChange={(event) => updateField("reflectionLoopTarget", event.target.value)} className="ades-input text-[15px]">
              <option value="same_step">Returns to this step</option>
              <option value="previous_step">Returns to previous step</option>
            </select>
          </Field>
          <Field label="Reflection prompt"><textarea value={selectedNode.data.reflectionPrompt} onChange={(event) => updateField("reflectionPrompt", event.target.value)} rows={4} className={TEXTAREA_CLASS} /></Field>
          <Field label="Revision action"><textarea value={selectedNode.data.feedbackAction} onChange={(event) => updateField("feedbackAction", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "risk" ? (
        <Section title="Safeguard details">
          <Field label="Mitigation / confidence check"><textarea value={selectedNode.data.confidenceCheck} onChange={(event) => updateField("confidenceCheck", event.target.value)} rows={3} className={TEXTAREA_CLASS} /></Field>
        </Section>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2.5"><span className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3><div className="mt-4 space-y-4">{children}</div></div>;
}

function ReadOnlyList({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? <ul className="mt-3 space-y-2 text-[15px] text-slate-700">{items.map((item, idx) => <li key={`${title}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">{item}</li>)}</ul> : <p className="mt-3 text-[15px] text-slate-500">{emptyMessage}</p>}
    </div>
  );
}
