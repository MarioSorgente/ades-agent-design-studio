"use client";

import { type ReactNode } from "react";
import { getNodeTheme } from "@/lib/board/node-theme";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNodeType, BoardViewMode, EvalCategory } from "@/lib/board/types";

const evalCategories: EvalCategory[] = ["task_success", "reasoning_quality", "tool_accuracy", "output_quality", "efficiency", "safety", "escalation", "reflection_effectiveness", "feedback_usefulness", "robustness"];

export function BoardInspector({ viewMode, nodeId }: { viewMode: BoardViewMode; nodeId: string | null }) {
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const selectedNode = useAdesBoardStore((state) => (nodeId ? state.nodes.find((node) => node.id === nodeId) ?? null : null));

  if (!selectedNode) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Card details</h3>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p>Select a card, then open details to edit fields.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
            <li>Flow view: edit main step cards.</li>
            <li>Improvement view: edit reflection and feedback cards.</li>
            <li>Eval view: edit test questions and pass criteria.</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">Current view: {viewMode}</p>
        </div>
      </div>
    );
  }

  const nodeTheme = getNodeTheme(selectedNode.type as AdesNodeType);

  const updateField = (
    field:
      | "label"
      | "body"
      | "purpose"
      | "whyThisStepExists"
      | "inputs"
      | "outputs"
      | "completionCriteria"
      | "reflectionTrigger"
      | "reflectionPrompt"
      | "reflectionLoopTarget"
      | "feedbackCondition"
      | "feedbackAction"
      | "evalQuestion"
      | "evalCategory"
      | "evalScope"
      | "evalCriteria"
      | "evalDataset"
      | "evalThreshold",
    value: string,
  ) => {
    updateNode(selectedNode.id, (node) => ({ ...node, data: { ...node.data, [field]: value } }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Card details</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${nodeTheme.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nodeTheme.dotClass}`} />
            {nodeTheme.label}
          </span>
          <span className="text-xs text-slate-500">{selectedNode.id}</span>
        </div>
      </div>

      <Field label="Title"><input value={selectedNode.data.label} onChange={(event) => updateField("label", event.target.value)} className="ades-input text-sm" /></Field>

      {selectedNode.type !== "eval" ? (
        <>
          <Field label="Why this exists"><textarea value={selectedNode.data.whyThisStepExists || selectedNode.data.purpose || selectedNode.data.body} onChange={(event) => { updateField("whyThisStepExists", event.target.value); updateField("purpose", event.target.value); updateField("body", event.target.value); }} rows={4} className="ades-input min-h-[96px] resize-y text-sm leading-6" /></Field>
          <Field label="Inputs"><textarea value={selectedNode.data.inputs} onChange={(event) => updateField("inputs", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
          <Field label="Outputs"><textarea value={selectedNode.data.outputs} onChange={(event) => updateField("outputs", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
          <Field label="Completion criteria"><textarea value={selectedNode.data.completionCriteria} onChange={(event) => updateField("completionCriteria", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
          <ReadOnlyList title="Tools" items={selectedNode.data.tools} emptyMessage="No tools listed." />
          <ReadOnlyList title="Attached evals" items={selectedNode.data.evals.map((item) => item.name)} emptyMessage="No attached eval definitions." />
          <ReadOnlyList title="Reflections / feedback" items={[...selectedNode.data.reflectionHooks.map((hook) => hook.trigger), ...selectedNode.data.feedbackHooks.map((hook) => hook.whenToRequest)]} emptyMessage="No reflection or feedback hooks yet." />
          <ReadOnlyList title="Risks" items={selectedNode.data.risks} emptyMessage="No risks listed." />
        </>
      ) : null}

      {selectedNode.type === "eval" ? (
        <Section title="Eval details">
          <Field label="Eval question"><textarea value={selectedNode.data.evalQuestion} onChange={(event) => updateField("evalQuestion", event.target.value)} rows={4} className="ades-input min-h-[96px] resize-y text-sm leading-6" /></Field>
          <Field label="Category">
            <select value={selectedNode.data.evalCategory} onChange={(event) => updateField("evalCategory", event.target.value)} className="ades-input text-sm">
              {evalCategories.map((category) => (<option key={category} value={category}>{category.replace(/_/g, " ")}</option>))}
            </select>
          </Field>
          <Field label="Scope">
            <select value={selectedNode.data.evalScope} onChange={(event) => updateField("evalScope", event.target.value)} className="ades-input text-sm">
              <option value="step">Step-level</option>
              <option value="flow">End-to-end</option>
            </select>
          </Field>
          <Field label="Pass criteria"><textarea value={selectedNode.data.evalCriteria} onChange={(event) => updateField("evalCriteria", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
          <Field label="Threshold / scoring rule"><textarea value={selectedNode.data.evalThreshold} onChange={(event) => updateField("evalThreshold", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
          <Field label="Failure examples / dataset notes"><textarea value={selectedNode.data.evalDataset} onChange={(event) => updateField("evalDataset", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "reflection" ? (
        <Section title="Reflection details">
          <Field label="Trigger"><input value={selectedNode.data.reflectionTrigger} onChange={(event) => updateField("reflectionTrigger", event.target.value)} className="ades-input text-sm" /></Field>
          <Field label="Loop target">
            <select value={selectedNode.data.reflectionLoopTarget} onChange={(event) => updateField("reflectionLoopTarget", event.target.value)} className="ades-input text-sm">
              <option value="same_step">Same step</option>
              <option value="previous_step">Previous step</option>
            </select>
          </Field>
          <Field label="Reflection prompt"><textarea value={selectedNode.data.reflectionPrompt} onChange={(event) => updateField("reflectionPrompt", event.target.value)} rows={4} className="ades-input min-h-[96px] resize-y text-sm leading-6" /></Field>
          <Field label="Revision action"><textarea value={selectedNode.data.feedbackAction} onChange={(event) => updateField("feedbackAction", event.target.value)} rows={3} className="ades-input min-h-[84px] resize-y text-sm leading-6" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "feedback" || selectedNode.type === "handoff" ? (
        <Section title="Feedback / handoff details">
          <Field label="Trigger"><input value={selectedNode.data.feedbackCondition} onChange={(event) => updateField("feedbackCondition", event.target.value)} className="ades-input text-sm" /></Field>
          <Field label="Feedback action"><textarea value={selectedNode.data.feedbackAction} onChange={(event) => updateField("feedbackAction", event.target.value)} rows={4} className="ades-input min-h-[96px] resize-y text-sm leading-6" /></Field>
        </Section>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3><div className="mt-3 space-y-3">{children}</div></div>;
}

function ReadOnlyList({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? <ul className="mt-2 space-y-2 text-sm text-slate-700">{items.map((item, idx) => <li key={`${title}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>}
    </div>
  );
}
