"use client";

import { memo, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AdesNode } from "@/components/board/ades-node";
import { getNodeTheme } from "@/lib/board/node-theme";
import {
  type AdesEdge,
  type AdesNodeData,
  type AdesNodeType,
  type BoardViewMode,
  getNodeLane,
} from "@/lib/board/types";
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
  viewMode?: BoardViewMode;
};

function getEdgeStyle(edge: AdesEdge): Edge {
  const semanticType = edge.data?.semanticType ?? "execution";

  if (semanticType === "reflection") {
    return {
      ...edge,
      type: "smoothstep",
      style: { stroke: "#f59e0b", strokeWidth: 1.6, strokeDasharray: "4 4" },
      labelStyle: { fill: "#92400e", fontSize: 10 },
    };
  }

  if (semanticType === "eval") {
    return {
      ...edge,
      style: { stroke: "#10b981", strokeWidth: 1.6 },
      labelStyle: { fill: "#047857", fontSize: 10 },
    };
  }

  if (semanticType === "business") {
    return {
      ...edge,
      style: { stroke: "#a855f7", strokeWidth: 1.4, strokeDasharray: "3 4" },
      labelStyle: { fill: "#7e22ce", fontSize: 10 },
    };
  }

  if (semanticType === "feedback") {
    return {
      ...edge,
      type: "smoothstep",
      style: { stroke: "#0ea5e9", strokeWidth: 1.4 },
      labelStyle: { fill: "#0369a1", fontSize: 10 },
    };
  }

  return {
    ...edge,
    style: { stroke: "#334155", strokeWidth: 1.9 },
    labelStyle: { fill: "#334155", fontSize: 10 },
  };
}

const StudioBoardInner = memo(function StudioBoardInner({ className, showMiniMap = false, viewMode = "all" }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const onNodesChange = useAdesBoardStore((state) => state.onNodesChange);
  const onEdgesChange = useAdesBoardStore((state) => state.onEdgesChange);
  const onConnect = useAdesBoardStore((state) => state.onConnect);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);

  const relevantIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const linked = edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId);
    return new Set([selectedNodeId, ...linked.map((edge) => edge.source), ...linked.map((edge) => edge.target)]);
  }, [edges, selectedNodeId]);

  const visibleNodes = useMemo(() => {
    return nodes.map((node) => {
      const lane = getNodeLane(node.type as AdesNodeType);
      const laneVisible =
        viewMode === "all" ||
        (viewMode === "main" && lane === "main") ||
        (viewMode === "evals" && (node.type === "eval" || node.type === "feedback")) ||
        (viewMode === "reflection" && node.type === "reflection") ||
        (viewMode === "business" && lane === "business");

      const isRelated = !selectedNodeId || relevantIds.has(node.id);

      return {
        ...node,
        hidden: !laneVisible,
        style: {
          ...node.style,
          opacity: isRelated ? 1 : 0.34,
          transition: "opacity 120ms ease",
        },
      };
    });
  }, [nodes, viewMode, selectedNodeId, relevantIds]);

  const visibleEdges = useMemo(() => {
    return edges.map((edge) => {
      const isRelated = !selectedNodeId || relevantIds.has(edge.source) || relevantIds.has(edge.target);
      const styled = getEdgeStyle(edge);
      return {
        ...styled,
        animated: edge.data?.semanticType === "execution" && !!selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId),
        style: {
          ...(styled.style ?? {}),
          opacity: isRelated ? 1 : 0.2,
          transition: "opacity 120ms ease",
        },
      };
    });
  }, [edges, selectedNodeId, relevantIds]);

  const handleNodeClick = useCallback((_: unknown, node: Node<AdesNodeData>) => setSelectedNodeId(node.id), [setSelectedNodeId]);
  const handlePaneClick = useCallback(() => setSelectedNodeId(null), [setSelectedNodeId]);

  return (
    <div
      id="ades-canvas-export"
      className={
        className ??
        "h-[calc(100vh-10.5rem)] min-h-[680px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-[#f3f5fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
      }
    >
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.35}
        maxZoom={2.1}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        selectionOnDrag
        panOnDrag
        panOnScroll
        selectionMode={SelectionMode.Partial}
        nodesDraggable
        elevateEdgesOnSelect
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} color="#d4dbe8" />
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            className="!rounded-xl !border !border-slate-200 !bg-white/95"
            nodeBorderRadius={8}
            nodeColor={(node: Node<AdesNodeData>) => {
              const theme = getNodeTheme(node.type as AdesNodeType);
              if (theme.dotClass.includes("violet")) return "#8b5cf6";
              if (theme.dotClass.includes("indigo")) return "#6366f1";
              if (theme.dotClass.includes("amber")) return "#f59e0b";
              if (theme.dotClass.includes("emerald")) return "#10b981";
              if (theme.dotClass.includes("fuchsia")) return "#d946ef";
              if (theme.dotClass.includes("rose")) return "#f43f5e";
              if (theme.dotClass.includes("sky")) return "#0ea5e9";
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
