"use client";

import { useCallback, type ReactNode } from "react";
import { getNodeTheme } from "@/lib/board/node-theme";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNodeType, EvalCategory } from "@/lib/board/types";

const evalCategories: EvalCategory[] = ["task_success", "reasoning_quality", "tool_accuracy", "efficiency", "safety"];

export function BoardInspector() {
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const selectedNode = useAdesBoardStore(useCallback((state) => state.nodes.find((node) => node.id === selectedNodeId) ?? null, [selectedNodeId]));

  if (!selectedNode) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Select a step to edit details. Flow stays clean while reflection, feedback, and evals live here.</div>;
  }

  const nodeTheme = getNodeTheme(selectedNode.type as AdesNodeType);

  const updateField = (
    field:
      | "label"
      | "body"
      | "inputs"
      | "outputs"
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
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${nodeTheme.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nodeTheme.dotClass}`} />
            {nodeTheme.label}
          </span>
          <span className="text-xs text-slate-500">{selectedNode.id}</span>
        </div>
      </div>

      <Field label="Step title">
        <input value={selectedNode.data.label} onChange={(event) => updateField("label", event.target.value)} className="ades-input" />
      </Field>

      <Field label="One-line purpose">
        <textarea value={selectedNode.data.body} onChange={(event) => updateField("body", event.target.value)} rows={3} className="ades-input resize-none" />
      </Field>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label="Inputs"><input value={selectedNode.data.inputs} onChange={(event) => updateField("inputs", event.target.value)} className="ades-input" /></Field>
        <Field label="Outputs"><input value={selectedNode.data.outputs} onChange={(event) => updateField("outputs", event.target.value)} className="ades-input" /></Field>
      </div>

      {selectedNode.type === "reflection" ? (
        <Section title="Reflection loop">
          <Field label="Trigger"><input value={selectedNode.data.reflectionTrigger} onChange={(event) => updateField("reflectionTrigger", event.target.value)} className="ades-input" /></Field>
          <Field label="Critique prompt"><textarea value={selectedNode.data.reflectionPrompt} onChange={(event) => updateField("reflectionPrompt", event.target.value)} rows={3} className="ades-input resize-none" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "feedback" || selectedNode.type === "handoff" ? (
        <Section title="External feedback">
          <Field label="Source"><input value={selectedNode.data.feedbackSource} onChange={(event) => updateField("feedbackSource", event.target.value)} className="ades-input" /></Field>
          <Field label="Condition"><input value={selectedNode.data.feedbackCondition} onChange={(event) => updateField("feedbackCondition", event.target.value)} className="ades-input" /></Field>
          <Field label="Action after feedback"><textarea value={selectedNode.data.feedbackAction} onChange={(event) => updateField("feedbackAction", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
        </Section>
      ) : null}

      {selectedNode.type === "eval" ? (
        <Section title="Eval question">
          <Field label="Eval name"><input value={selectedNode.data.evalName} onChange={(event) => updateField("evalName", event.target.value)} className="ades-input" /></Field>
          <Field label="Question"><textarea value={selectedNode.data.evalQuestion} onChange={(event) => updateField("evalQuestion", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="Category">
              <select value={selectedNode.data.evalCategory} onChange={(event) => updateField("evalCategory", event.target.value)} className="ades-input">
                {evalCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
              </select>
            </Field>
            <Field label="Scope">
              <select value={selectedNode.data.evalScope} onChange={(event) => updateField("evalScope", event.target.value)} className="ades-input">
                <option value="step">Step-level</option>
                <option value="flow">Flow-level</option>
              </select>
            </Field>
          </div>
          <Field label="Criteria"><textarea value={selectedNode.data.evalCriteria} onChange={(event) => updateField("evalCriteria", event.target.value)} rows={2} className="ades-input resize-none" /></Field>
          <Field label="Dataset / cases"><input value={selectedNode.data.evalDataset} onChange={(event) => updateField("evalDataset", event.target.value)} className="ades-input" /></Field>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="Grading method"><input value={selectedNode.data.evalMethod} onChange={(event) => updateField("evalMethod", event.target.value)} className="ades-input" /></Field>
            <Field label="Threshold"><input value={selectedNode.data.evalThreshold} onChange={(event) => updateField("evalThreshold", event.target.value)} className="ades-input" /></Field>
          </div>
        </Section>
      ) : null}

      {selectedNode.type === "business_metric" || selectedNode.type === "risk" || selectedNode.type === "assumption" ? (
        <Section title="Business context">
          {selectedNode.type === "business_metric" ? <Field label="Business outcome metric"><input value={selectedNode.data.businessMetric} onChange={(event) => updateField("businessMetric", event.target.value)} className="ades-input" /></Field> : null}
          {selectedNode.type === "risk" ? <Field label="Risk trigger"><input value={selectedNode.data.confidenceCheck} onChange={(event) => updateField("confidenceCheck", event.target.value)} className="ades-input" /></Field> : null}
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
