"use client";

import { useCallback, type ReactNode } from "react";
import { getNodeTheme } from "@/lib/board/node-theme";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNodeType, BoardViewMode, EvalCategory } from "@/lib/board/types";

const evalCategories: EvalCategory[] = ["task_success", "reasoning_quality", "tool_accuracy", "output_quality", "efficiency", "safety", "escalation", "reflection_effectiveness", "feedback_usefulness", "robustness"];

export function BoardInspector({ viewMode }: { viewMode: BoardViewMode }) {
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const selectedNode = useAdesBoardStore(useCallback((state) => state.nodes.find((node) => node.id === selectedNodeId) ?? null, [selectedNodeId]));

  if (!selectedNode) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">{viewMode === "flow" ? "Design guidance" : viewMode === "eval" ? "Eval details" : "Improvement details"}</h3>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p>Select a step to inspect details.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
            <li>Use Flow View to edit the task sequence.</li>
            <li>Use Improvement View to review reflection and feedback.</li>
            <li>Use Eval View to review test coverage.</li>
          </ul>
        </div>
      </div>
    );
  }

  const nodeTheme = getNodeTheme(selectedNode.type as AdesNodeType);
  const panelTitle = selectedNode.type === "eval" ? "Eval details" : selectedNode.type === "reflection" || selectedNode.type === "feedback" || selectedNode.type === "risk" ? "Improvement details" : "Step details";

  const updateField = (
    field:
      | "label"
      | "shortLabel"
      | "body"
      | "purpose"
      | "whyThisStepExists"
      | "inputs"
      | "outputs"
      | "reasoningRequired"
      | "completionCriteria"
      | "reflectionTrigger"
      | "reflectionPrompt"
      | "feedbackSource"
      | "feedbackCondition"
      | "feedbackAction"
      | "evalName"
      | "evalQuestion"
      | "evalCategory"
      | "evalScope"
      | "evalCriteria"
      | "evalDataset"
      | "evalMethod"
      | "evalThreshold"
      | "businessMetric"
      | "confidenceCheck",
    value: string,
  ) => {
    updateNode(selectedNode.id, (node) => ({ ...node, data: { ...node.data, [field]: value } }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{panelTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">What this is, why it exists, and how to improve it.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${nodeTheme.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nodeTheme.dotClass}`} />
            {nodeTheme.label}
          </span>
          <span className="text-xs text-slate-500">{selectedNode.id}</span>
        </div>
      </div>

      <Field label={selectedNode.type === "eval" ? "Eval title" : "Title"}><input value={selectedNode.data.label} onChange={(event) => updateField("label", event.target.value)} className="ades-input" /></Field>
      <Field label={selectedNode.type === "eval" ? "Eval question" : "One-line purpose"}><textarea value={selectedNode.type === "eval" ? selectedNode.data.evalQuestion : selectedNode.data.purpose || selectedNode.data.body} onChange={(event) => {
        if (selectedNode.type === "eval") updateField("evalQuestion", event.target.value);
        else {
          updateField("purpose", event.target.value);
          updateField("body", event.target.value);
        }
      }} rows={3} className="ades-input resize-none" /></Field>

      <Field label="Why this exists"><textarea value={selectedNode.data.whyThisStepExists} onChange={(event) => updateField("whyThisStepExists", event.target.value)} rows={2} className="ades-input resize-none" /></Field>

      {selectedNode.type !== "eval" ? (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="Inputs"><input value={selectedNode.data.inputs} onChange={(event) => updateField("inputs", event.target.value)} className="ades-input" /></Field>
            <Field label="Outputs"><input value={selectedNode.data.outputs} onChange={(event) => updateField("outputs", event.target.value)} className="ades-input" /></Field>
          </div>
          <Field label="Completion criteria"><input value={selectedNode.data.completionCriteria} onChange={(event) => updateField("completionCriteria", event.target.value)} className="ades-input" /></Field>
          <ReadOnlyList title="Tools" items={selectedNode.data.tools} emptyMessage="No tools listed." />
          <ReadOnlyList title="Attached evals" items={selectedNode.data.evals.map((item) => item.name)} emptyMessage="No attached eval definitions." />
          <ReadOnlyList title="Reflections / feedback" items={[...selectedNode.data.reflectionHooks.map((hook) => hook.trigger), ...selectedNode.data.feedbackHooks.map((hook) => hook.whenToRequest)]} emptyMessage="No reflection or feedback hooks yet." />
          <ReadOnlyList title="Risks" items={selectedNode.data.risks} emptyMessage="No risks listed." />
        </>
      ) : null}

      {selectedNode.type === "eval" ? (
        <Section title="Eval details">
          <Field label="Category">
            <select value={selectedNode.data.evalCategory} onChange={(event) => updateField("evalCategory", event.target.value)} className="ades-input">
              {evalCategories.map((category) => (<option key={category} value={category}>{category.replace(/_/g, " ")}</option>))}
            </select>
          </Field>
          <Field label="Scope">
            <select value={selectedNode.data.evalScope} onChange={(event) => updateField("evalScope", event.target.value)} className="ades-input">
              <option value="step">Step-level</option>
              <option value="flow">End-to-end</option>
            </select>
          </Field>
          <Field label="Pass criteria"><textarea value={selectedNode.data.evalCriteria} onChange={(event) => updateField("evalCriteria", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
          <Field label="Threshold / scoring rule"><input value={selectedNode.data.evalThreshold} onChange={(event) => updateField("evalThreshold", event.target.value)} className="ades-input" /></Field>
          <Field label="Failure examples / dataset notes"><textarea value={selectedNode.data.evalDataset} onChange={(event) => updateField("evalDataset", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "reflection" ? (
        <Section title="Reflection details">
          <Field label="Trigger"><input value={selectedNode.data.reflectionTrigger} onChange={(event) => updateField("reflectionTrigger", event.target.value)} className="ades-input" /></Field>
          <Field label="Prompt"><textarea value={selectedNode.data.reflectionPrompt} onChange={(event) => updateField("reflectionPrompt", event.target.value)} rows={3} className="ades-input resize-none" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "feedback" || selectedNode.type === "handoff" ? (
        <Section title="Feedback / handoff details">
          <Field label="Feedback source"><input value={selectedNode.data.feedbackSource} onChange={(event) => updateField("feedbackSource", event.target.value)} className="ades-input" /></Field>
          <Field label="Trigger"><input value={selectedNode.data.feedbackCondition} onChange={(event) => updateField("feedbackCondition", event.target.value)} className="ades-input" /></Field>
          <Field label="Action"><textarea value={selectedNode.data.feedbackAction} onChange={(event) => updateField("feedbackAction", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "risk" ? <Field label="Confidence / escalation check"><input value={selectedNode.data.confidenceCheck} onChange={(event) => updateField("confidenceCheck", event.target.value)} className="ades-input" /></Field> : null}
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">{items.map((item, idx) => <li key={`${title}-${idx}`}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">{emptyMessage}</p>}
    </div>
  );
}
