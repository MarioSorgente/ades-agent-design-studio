"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  SelectionMode,
  type Node
} from "reactflow";
import "reactflow/dist/style.css";
import { AdesNode } from "@/components/board/ades-node";
import { getNodeTheme } from "@/lib/board/node-theme";
import { CORE_NODE_TYPES, type AdesNodeData, type AdesNodeType } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

function StudioBoardInner() {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const onNodesChange = useAdesBoardStore((state) => state.onNodesChange);
  const onEdgesChange = useAdesBoardStore((state) => state.onEdgesChange);
  const onConnect = useAdesBoardStore((state) => state.onConnect);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);
  const addNode = useAdesBoardStore((state) => state.addNode);
  const deleteSelectedNode = useAdesBoardStore((state) => state.deleteSelectedNode);

  const nodeTypes = useMemo(() => {
    const entries = CORE_NODE_TYPES.map((type) => [type, AdesNode]);
    return Object.fromEntries(entries);
  }, []);

  return (
    <div id="ades-canvas-export" className="h-[calc(100vh-15.5rem)] min-h-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-[#f3f5fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
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
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
          labelStyle: { fill: "#475569", fontSize: 10 }
        }}
        fitView
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#d4dbe8" />
        <MiniMap
          pannable
          zoomable
          className="!rounded-xl !border !border-slate-200 !bg-white"
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
        <Controls position="bottom-right" className="!rounded-xl !border !border-slate-200 !shadow-sm" />

        <Panel position="top-left" className="rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Block palette</div>
          <div className="flex max-w-[620px] flex-wrap gap-1.5">
            {CORE_NODE_TYPES.map((type) => {
              const theme = getNodeTheme(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addNode(type)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition hover:-translate-y-px ${theme.badgeClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
                  {theme.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={!selectedNodeId}
              onClick={deleteSelectedNode}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function StudioBoard() {
  return (
    <ReactFlowProvider>
      <StudioBoardInner />
    </ReactFlowProvider>
  );
}
