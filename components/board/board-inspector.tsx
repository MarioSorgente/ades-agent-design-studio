"use client";

import { useMemo } from "react";
import { useAdesBoardStore } from "@/lib/board/store";

export function BoardInspector() {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const updateNode = useAdesBoardStore((state) => state.updateNode);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  if (!selectedNode) {
    return <p className="text-sm text-slate-500">Select a node to edit title, body, tags, and type-specific fields.</p>;
  }

  const updateField = (field: "label" | "body" | "reflectionPrompt" | "evalMetric" | "businessMetric", value: string) => {
    updateNode(selectedNode.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspector</h2>
        <p className="mt-1 text-xs text-slate-500">Editing: {selectedNode.type.replace("_", " ")}</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Title
        <input
          value={selectedNode.data.label}
          onChange={(event) => updateField("label", event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Body
        <textarea
          value={selectedNode.data.body}
          onChange={(event) => updateField("body", event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Tags (comma-separated)
        <input
          value={selectedNode.data.tags.join(", ")}
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {selectedNode.type === "reflection" ? (
        <label className="block text-sm font-medium text-slate-700">
          Reflection checkpoint (required)
          <textarea
            value={selectedNode.data.reflectionPrompt}
            onChange={(event) => updateField("reflectionPrompt", event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
          />
        </label>
      ) : null}

      {selectedNode.type === "eval" ? (
        <label className="block text-sm font-medium text-slate-700">
          Eval metric (required)
          <input
            value={selectedNode.data.evalMetric}
            onChange={(event) => updateField("evalMetric", event.target.value)}
            className="mt-1 w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm"
          />
        </label>
      ) : null}

      {selectedNode.type === "business_metric" ? (
        <label className="block text-sm font-medium text-slate-700">
          Business metric (required)
          <input
            value={selectedNode.data.businessMetric}
            onChange={(event) => updateField("businessMetric", event.target.value)}
            className="mt-1 w-full rounded-lg border border-fuchsia-300 px-3 py-2 text-sm"
          />
        </label>
      ) : null}
    </div>
  );
}
