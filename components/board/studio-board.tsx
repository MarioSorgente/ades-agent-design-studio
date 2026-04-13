"use client";

import { memo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AdesNode } from "@/components/board/ades-node";
import { getNodeTheme } from "@/lib/board/node-theme";
import { type AdesNodeData, type AdesNodeType } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

const nodeTypes = {
  goal: AdesNode,
  task: AdesNode,
  reflection: AdesNode,
  feedback: AdesNode,
  risk: AdesNode,
  eval: AdesNode,
  business_metric: AdesNode,
  assumption: AdesNode,
  handoff: AdesNode,
};

type StudioBoardProps = {
  className?: string;
  showMiniMap?: boolean;
};

const StudioBoardInner = memo(function StudioBoardInner({ className, showMiniMap = true }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const onNodesChange = useAdesBoardStore((state) => state.onNodesChange);
  const onEdgesChange = useAdesBoardStore((state) => state.onEdgesChange);
  const onConnect = useAdesBoardStore((state) => state.onConnect);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);

  return (
    <div
      id="ades-canvas-export"
      className={
        className ??
        "h-[calc(100vh-13.5rem)] min-h-[640px] overflow-hidden rounded-[26px] border border-slate-200/90 bg-[#f3f5fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        defaultEdgeOptions={{
          style: { stroke: "#94a3b8", strokeWidth: 1.4 },
          labelStyle: { fill: "#475569", fontSize: 10 },
        }}
        fitView
        minZoom={0.25}
        maxZoom={1.8}
        selectionOnDrag
        panOnDrag
        panOnScroll
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#d4dbe8" />
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            className="!rounded-xl !border !border-slate-200 !bg-white/95"
            nodeBorderRadius={8}
            nodeColor={(node: Node<AdesNodeData>) => {
              const theme = getNodeTheme(node.type as AdesNodeType);
              const dotClass = theme.dotClass;
              if (dotClass.includes("violet")) return "#8b5cf6";
              if (dotClass.includes("sky")) return "#0ea5e9";
              if (dotClass.includes("amber")) return "#f59e0b";
              if (dotClass.includes("indigo")) return "#6366f1";
              if (dotClass.includes("rose")) return "#f43f5e";
              if (dotClass.includes("emerald")) return "#10b981";
              if (dotClass.includes("fuchsia")) return "#d946ef";
              if (dotClass.includes("teal")) return "#14b8a6";
              return "#64748b";
            }}
          />
        ) : null}
        <Controls position="bottom-right" className="!rounded-xl !border !border-slate-200 !shadow-sm" />
      </ReactFlow>
    </div>
  );
});

export function StudioBoard(props: StudioBoardProps) {
  return (
    <ReactFlowProvider>
      <StudioBoardInner {...props} />
    </ReactFlowProvider>
  );
}
