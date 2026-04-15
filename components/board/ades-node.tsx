import { memo } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { getNodeTheme } from "@/lib/board/node-theme";
import type { AdesNodeData, AdesNodeType } from "@/lib/board/types";

function AdesNodeComponent({ data, type, selected }: NodeProps<AdesNodeData>) {
  const resolvedType = (type ?? "task") as AdesNodeType;
  const theme = getNodeTheme(resolvedType);

  return (
    <div className={`w-80 rounded-2xl border px-3.5 py-3 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] transition ${theme.cardClass} ${selected ? `ring-2 ${theme.ringClass}` : ""}`}>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border !border-slate-300 !bg-white" />

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.badgeClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
          {theme.label}
        </span>
        <span className="text-[10px] font-medium text-slate-500">{data.stepIndex ? `Step ${data.stepIndex}` : data.stepType}</span>
      </div>

      <div className="mt-2 text-sm font-semibold leading-snug text-slate-900">{data.label}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-600" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {data.purpose || data.body || "Add practical details in inspector."}
      </div>

      {data.attachmentSummary ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge label={data.stepType} />
          {data.attachmentSummary.toolCount ? <Badge label={`🛠 ${data.attachmentSummary.toolCount} tools`} /> : null}
          {data.attachmentSummary.reflectionCount ? <Badge label={`↻ ${data.attachmentSummary.reflectionCount} reflection`} /> : null}
          {data.attachmentSummary.evalCount ? <Badge label={`✓ ${data.attachmentSummary.evalCount} eval`} /> : null}
          {data.attachmentSummary.riskCount ? <Badge label={`⚠ ${data.attachmentSummary.riskCount} risk`} /> : null}
        </div>
      ) : null}

      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border !border-slate-300 !bg-white" />
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">{label}</span>;
}

export const AdesNode = memo(AdesNodeComponent);
