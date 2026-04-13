"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { getNodeTheme } from "@/lib/board/node-theme";
import { useAdesBoardStore } from "@/lib/board/store";
import type { AdesNodeType } from "@/lib/board/types";

export function BoardInspector() {
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const updateNode = useAdesBoardStore((state) => state.updateNode);
  const selectedNode = useAdesBoardStore(
    useCallback((state) => state.nodes.find((node) => node.id === selectedNodeId) ?? null, [selectedNodeId])
  );

  if (!selectedNode) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        Select a block on the canvas to edit details, critique assumptions, and refine eval quality.
      </div>
    );
  }

  const nodeTheme = getNodeTheme(selectedNode.type as AdesNodeType);

  const updateField = (
    field: "label" | "body" | "reflectionPrompt" | "evalMetric" | "businessMetric" | "confidenceCheck" | "owner",
    value: string
  ) => {
    updateNode(selectedNode.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        [field]: value,
      },
    }));
  };

  const tagValue = useMemo(() => selectedNode.data.tags.join(", "), [selectedNode.data.tags]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Inspector</p>
        <div className="mt-2 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${nodeTheme.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nodeTheme.dotClass}`} />
            {nodeTheme.label}
          </span>
          <span className="text-xs text-slate-500">{selectedNode.id}</span>
        </div>
      </div>

      <Field label="Title">
        <input value={selectedNode.data.label} onChange={(event) => updateField("label", event.target.value)} className="ades-input" />
      </Field>

      <Field label="Description">
        <textarea value={selectedNode.data.body} onChange={(event) => updateField("body", event.target.value)} rows={4} className="ades-input resize-none" />
      </Field>

      <Field label="Owner">
        <input value={selectedNode.data.owner} onChange={(event) => updateField("owner", event.target.value)} className="ades-input" />
      </Field>

      <Field label="Tags (comma-separated)">
        <input
          value={tagValue}
          onChange={(event) => {
            const tags = event.target.value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean);

            updateNode(selectedNode.id, (node) => ({
              ...node,
              data: {
                ...node.data,
                tags,
              },
            }));
          }}
          className="ades-input"
        />
      </Field>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critique and quality layer</h3>
        <div className="mt-3 space-y-3">
          <Field label="Reflection checkpoint">
            <textarea
              value={selectedNode.data.reflectionPrompt}
              onChange={(event) => updateField("reflectionPrompt", event.target.value)}
              rows={2}
              className="ades-input resize-none"
              placeholder="When should the system pause and self-check?"
            />
          </Field>

          <Field label="Eval metric">
            <input
              value={selectedNode.data.evalMetric}
              onChange={(event) => updateField("evalMetric", event.target.value)}
              className="ades-input"
              placeholder="How do we measure quality for this block?"
            />
          </Field>

          <Field label="Business metric">
            <input
              value={selectedNode.data.businessMetric}
              onChange={(event) => updateField("businessMetric", event.target.value)}
              className="ades-input"
              placeholder="How does this contribute to business outcomes?"
            />
          </Field>

          <Field label="Risk confidence trigger">
            <input
              value={selectedNode.data.confidenceCheck}
              onChange={(event) => updateField("confidenceCheck", event.target.value)}
              className="ades-input"
              placeholder="What threshold should trigger a warning or handoff?"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
