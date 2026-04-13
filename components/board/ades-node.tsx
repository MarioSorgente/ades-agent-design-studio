import { memo } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { getNodeTheme } from "@/lib/board/node-theme";
import type { AdesNodeData, AdesNodeType } from "@/lib/board/types";

function AdesNodeComponent({ data, type, selected }: NodeProps<AdesNodeData>) {
  const resolvedType = (type ?? "task") as AdesNodeType;
  const theme = getNodeTheme(resolvedType);

  return (
    <div
      className={`w-72 rounded-2xl border px-4 py-3 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.28)] transition ${theme.cardClass} ${
        selected ? `ring-2 ${theme.ringClass}` : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border !border-slate-300 !bg-white" />

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${theme.badgeClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
          {theme.label}
        </span>
        <span className="text-[10px] font-medium text-slate-500">{data.owner}</span>
      </div>

      <div className="mt-2 text-sm font-semibold leading-snug text-slate-900">{data.label}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-700">{data.body || "Add practical details in the inspector."}</div>
      {data.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border !border-slate-300 !bg-white" />
    </div>
  );
}

export const AdesNode = memo(AdesNodeComponent);
