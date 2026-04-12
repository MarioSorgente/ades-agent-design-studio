import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type { AdesNodeData } from "@/lib/board/types";

const STYLE_BY_TYPE: Record<string, string> = {
  goal: "border-violet-300 bg-violet-50",
  task: "border-blue-300 bg-blue-50",
  reflection: "border-amber-300 bg-amber-50",
  eval: "border-emerald-300 bg-emerald-50",
  business_metric: "border-fuchsia-300 bg-fuchsia-50",
};

export function AdesNode({ data, type, selected }: NodeProps<AdesNodeData>) {
  const styleClass = STYLE_BY_TYPE[type ?? "task"] ?? "border-slate-300 bg-slate-50";

  return (
    <div
      className={`w-64 rounded-xl border p-3 shadow-sm transition ${styleClass} ${
        selected ? "ring-2 ring-slate-900/20" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border !border-slate-500 !bg-white" />
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{type?.replace("_", " ")}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{data.label}</div>
      <div className="mt-1 max-h-12 overflow-hidden text-xs text-slate-700">{data.body || "Add details in inspector."}</div>
      {data.tags.length ? <div className="mt-2 text-[11px] text-slate-600">#{data.tags.join(" #")}</div> : null}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border !border-slate-500 !bg-white" />
    </div>
  );
}
