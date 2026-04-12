"use client";

import { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { AdesNode } from "@/components/board/ades-node";
import { CORE_NODE_TYPES } from "@/lib/board/types";
import { useAdesBoardStore } from "@/lib/board/store";

function StudioBoardInner() {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const initializeBoard = useAdesBoardStore((state) => state.initializeBoard);
  const onNodesChange = useAdesBoardStore((state) => state.onNodesChange);
  const onEdgesChange = useAdesBoardStore((state) => state.onEdgesChange);
  const onConnect = useAdesBoardStore((state) => state.onConnect);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);
  const addNode = useAdesBoardStore((state) => state.addNode);
  const deleteSelectedNode = useAdesBoardStore((state) => state.deleteSelectedNode);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const nodeTypes = useMemo(() => ({ goal: AdesNode, task: AdesNode, reflection: AdesNode, eval: AdesNode, business_metric: AdesNode }), []);

  return (
    <div className="h-[70vh] overflow-hidden rounded-2xl border border-ades-soft bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#dbe3ef" />
        <MiniMap pannable zoomable className="!bg-white" nodeBorderRadius={10} />
        <Controls position="bottom-right" />

        <Panel position="top-left" className="rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Add block</div>
          <div className="flex flex-wrap gap-2">
            {CORE_NODE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                + {type.replace("_", " ")}
              </button>
            ))}
            <button
              type="button"
              disabled={!selectedNodeId}
              onClick={deleteSelectedNode}
              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
