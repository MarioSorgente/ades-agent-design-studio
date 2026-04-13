"use client";

import { memo, useCallback, useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, ReactFlowProvider, SelectionMode, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AdesNode } from "@/components/board/ades-node";
import { getNodeTheme } from "@/lib/board/node-theme";
import { type AdesEdge, type AdesNodeData, type AdesNodeType, type BoardViewMode } from "@/lib/board/types";
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
  viewMode?: BoardViewMode;
};

function getEdgeStyle(edge: AdesEdge): Edge {
  const semanticType = edge.data?.semanticType ?? "execution";
  if (semanticType === "reflection") return { ...edge, type: "smoothstep", style: { stroke: "#f59e0b", strokeWidth: 1.4, strokeDasharray: "4 4" } };
  if (semanticType === "eval") return { ...edge, style: { stroke: "#10b981", strokeWidth: 1.4 } };
  if (semanticType === "feedback") return { ...edge, type: "smoothstep", style: { stroke: "#0284c7", strokeWidth: 1.4 } };
  if (semanticType === "business") return { ...edge, style: { stroke: "#a855f7", strokeWidth: 1.2, strokeDasharray: "3 4" } };
  return { ...edge, style: { stroke: "#334155", strokeWidth: 1.8 } };
}

const StudioBoardInner = memo(function StudioBoardInner({ className, viewMode = "flow" }: StudioBoardProps) {
  const nodes = useAdesBoardStore((state) => state.nodes);
  const edges = useAdesBoardStore((state) => state.edges);
  const selectedNodeId = useAdesBoardStore((state) => state.selectedNodeId);
  const onNodesChange = useAdesBoardStore((state) => state.onNodesChange);
  const onEdgesChange = useAdesBoardStore((state) => state.onEdgesChange);
  const onConnect = useAdesBoardStore((state) => state.onConnect);
  const setSelectedNodeId = useAdesBoardStore((state) => state.setSelectedNodeId);

  const edgesBySource = useMemo(() => {
    const map = new Map<string, AdesEdge[]>();
    edges.forEach((edge) => {
      const list = map.get(edge.source) ?? [];
      list.push(edge);
      map.set(edge.source, list);
    });
    return map;
  }, [edges]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const orderedMainNodes = useMemo(() => {
    const mainTypes: AdesNodeType[] = ["goal", "task", "handoff"];
    const mains = nodes.filter((node) => mainTypes.includes(node.type as AdesNodeType));
    return mains.sort((a, b) => a.position.x - b.position.x);
  }, [nodes]);

  const flowNodes = useMemo(() => {
    const mainIds = new Set(orderedMainNodes.map((node) => node.id));

    return orderedMainNodes.map((node, index) => {
      const linked = edgesBySource.get(node.id) ?? [];
      const attachmentIds = linked.map((edge) => edge.target);
      const attachmentNodes = attachmentIds.map((id) => nodeById.get(id)).filter(Boolean);

      const reflectionCount = attachmentNodes.filter((n) => n?.type === "reflection").length;
      const feedbackCount = attachmentNodes.filter((n) => n?.type === "feedback").length;
      const evalCount = attachmentNodes.filter((n) => n?.type === "eval").length;
      const riskCount = attachmentNodes.filter((n) => n?.type === "risk").length;

      return {
        ...node,
        position: { x: 180 + index * 310, y: 170 },
        draggable: true,
        data: {
          ...node.data,
          stepIndex: index,
          attachmentSummary: {
            reflectionCount,
            feedbackCount,
            evalCount,
            riskCount,
            toolCount: node.data.tools?.length ?? 0,
          },
        },
      };
    });
  }, [orderedMainNodes, edgesBySource, nodeById]);

  const flowEdges = useMemo(() => {
    const idSet = new Set(flowNodes.map((node) => node.id));
    return edges.filter((edge) => idSet.has(edge.source) && idSet.has(edge.target)).map(getEdgeStyle);
  }, [edges, flowNodes]);

  const evalRows = useMemo(() => {
    return nodes
      .filter((node) => node.type === "eval")
      .map((evalNode) => {
        const linkedFrom = edges.find((edge) => edge.target === evalNode.id)?.source;
        const step = linkedFrom ? nodeById.get(linkedFrom) : null;
        return { evalNode, step };
      })
      .sort((a, b) => (a.step?.position.x ?? 0) - (b.step?.position.x ?? 0));
  }, [edges, nodeById, nodes]);

  const improvementRows = useMemo(() => {
    return edges
      .filter((edge) => edge.data?.semanticType === "reflection" || edge.data?.semanticType === "feedback")
      .map((edge) => ({
        edge,
        step: nodeById.get(edge.source) ?? null,
        mechanism: nodeById.get(edge.target) ?? null,
      }))
      .filter((row) => row.step && row.mechanism);
  }, [edges, nodeById]);

  const handleNodeClick = useCallback((_: unknown, node: Node<AdesNodeData>) => setSelectedNodeId(node.id), [setSelectedNodeId]);
  const handlePaneClick = useCallback(() => setSelectedNodeId(null), [setSelectedNodeId]);

  if (viewMode === "eval") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-4"}>
        <h3 className="text-sm font-semibold text-slate-900">Eval View · verification questions</h3>
        <p className="mt-1 text-xs text-slate-600">Each eval is a structured question used to verify step or flow quality.</p>
        <div className="mt-3 space-y-2">
          {evalRows.map(({ evalNode, step }) => (
            <button key={evalNode.id} type="button" onClick={() => setSelectedNodeId(evalNode.id)} className={`w-full rounded-2xl border bg-white p-3 text-left transition ${selectedNodeId === evalNode.id ? "border-emerald-300" : "border-slate-200 hover:border-emerald-200"}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{step ? `Attached to: ${step.data.label}` : "Flow-level eval"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{evalNode.data.evalName || evalNode.data.label}</p>
              <p className="mt-1 text-sm text-slate-700">{evalNode.data.evalQuestion || "Define the eval question."}</p>
              <p className="mt-1 text-xs text-slate-500">Category: {evalNode.data.evalCategory} · Scope: {evalNode.data.evalScope} · Threshold: {evalNode.data.evalThreshold || "Set threshold"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === "improvement") {
    return (
      <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-auto rounded-[28px] border border-slate-200/90 bg-white p-4"}>
        <h3 className="text-sm font-semibold text-slate-900">Improvement View · reflection + external feedback</h3>
        <p className="mt-1 text-xs text-slate-600">Local loops only: how the system critiques itself and where external reviewers improve outputs.</p>
        <div className="mt-3 space-y-2">
          {improvementRows.map(({ edge, step, mechanism }) => (
            <button key={edge.id} type="button" onClick={() => setSelectedNodeId(mechanism!.id)} className={`w-full rounded-2xl border p-3 text-left ${edge.data?.semanticType === "reflection" ? "border-amber-200 bg-amber-50/30" : "border-sky-200 bg-sky-50/30"}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{edge.data?.semanticType === "reflection" ? "Reflection loop" : "External feedback"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{step!.data.label} → {mechanism!.data.label}</p>
              <p className="mt-1 text-xs text-slate-700">{mechanism!.data.body}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="ades-canvas-export" className={className ?? "h-[calc(100vh-11rem)] min-h-[700px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-[#f3f5fa]"}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.55}
        maxZoom={2.2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
        selectionOnDrag
        panOnDrag
        panOnScroll
        selectionMode={SelectionMode.Partial}
        nodesDraggable
        onlyRenderVisibleElements
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} color="#d4dbe8" />
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
