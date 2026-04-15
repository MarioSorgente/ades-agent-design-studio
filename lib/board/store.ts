import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "reactflow";
import { create } from "zustand";
import { createStarterBoard } from "@/lib/board/starter-board";
import {
  type AdesBoardSnapshot,
  type AdesEdge,
  type AdesNode,
  type AdesNodeType,
  createNode,
  getDefaultEdgeSemanticByNodes,
  getNodeLane,
} from "@/lib/board/types";

type AdesBoardState = {
  nodes: AdesNode[];
  edges: AdesEdge[];
  selectedNodeId: string | null;
  isInitialized: boolean;
  initializeBoard: () => void;
  loadBoardSnapshot: (snapshot: AdesBoardSnapshot) => void;
  getBoardSnapshot: () => AdesBoardSnapshot;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  addNode: (type: AdesNodeType) => void;
  addNodeWithContent: (type: AdesNodeType, label: string, body: string) => void;
  addConnectedNode: (sourceId: string, type: AdesNodeType) => string | null;
  deleteNodeById: (nodeId: string) => void;
  duplicateNodeById: (nodeId: string) => void;
  moveMainStep: (nodeId: string, direction: "left" | "right") => void;
  deleteSelectedNode: () => void;
  updateNode: (nodeId: string, updater: (node: AdesNode) => AdesNode) => void;
};

function createNodeId(type: AdesNodeType): string {
  return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}

function nextNodePosition(nodes: AdesNode[], type: AdesNodeType) {
  const lane = getNodeLane(type);
  const laneNodes = nodes.filter((node) => getNodeLane(node.type) === lane);
  const laneIndex = laneNodes.length;

  const x = 240 + (laneIndex % 4) * 320;
  const yBase = lane === "main" ? 140 : lane === "quality" ? 340 : 80;
  const y = yBase + Math.floor(laneIndex / 4) * 160;

  return { x, y };
}

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function getOrderedMainSteps(nodes: AdesNode[]) {
  return nodes.filter(isMainStep).sort((a, b) => a.position.x - b.position.x);
}

function normalizeMainStepPositions(nodes: AdesNode[]) {
  const ordered = getOrderedMainSteps(nodes);
  const positionMap = new Map(ordered.map((node, index) => [node.id, 180 + index * 320]));
  return nodes.map((node) => (positionMap.has(node.id) ? { ...node, position: { ...node.position, x: positionMap.get(node.id)!, y: 180 } } : node));
}

export const useAdesBoardStore = create<AdesBoardState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isInitialized: false,
  initializeBoard: () => {
    if (get().isInitialized) {
      return;
    }

    const snapshot = createStarterBoard();
    set({ ...snapshot, selectedNodeId: null, isInitialized: true });
  },
  loadBoardSnapshot: (snapshot) => {
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      selectedNodeId: null,
      isInitialized: true,
    });
  },
  getBoardSnapshot: () => {
    const { nodes, edges } = get();
    return { nodes, edges };
  },
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as AdesNode[],
    }));
  },
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },
  onConnect: (connection) => {
    const { nodes } = get();
    const sourceType = nodes.find((node) => node.id === connection.source)?.type;
    const targetType = nodes.find((node) => node.id === connection.target)?.type;

    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: `e-${crypto.randomUUID().slice(0, 8)}`,
          type: targetType === "reflection" ? "smoothstep" : "default",
          data:
            sourceType && targetType
              ? { semanticType: getDefaultEdgeSemanticByNodes(sourceType, targetType) }
              : undefined,
        },
        state.edges,
      ),
    }));
  },
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  addNode: (type) => {
    const state = get();
    const nodeId = createNodeId(type);
    const position = nextNodePosition(state.nodes, type);

    const defaultLabelByType: Record<AdesNodeType, string> = {
      goal: "Define the business success condition and failure boundaries",
      task: "Specify a concrete operational step",
      reflection: "Run a targeted self-critique before proceeding",
      feedback: "Collect external review for this output",
      risk: "Document a concrete failure mode and mitigation",
      eval: "Measure this behavior with a clear eval question",
      business_metric: "Track the business outcome this design must move",
      assumption: "State and validate a key operating assumption",
      handoff: "Escalate to a human with decision context",
    };

    const newNode = createNode(type, nodeId, position, defaultLabelByType[type]);

    set({
      nodes: normalizeMainStepPositions([...state.nodes, newNode]),
      selectedNodeId: newNode.id,
    });
  },
  addNodeWithContent: (type, label, body) => {
    const state = get();
    const nodeId = createNodeId(type);
    const position = nextNodePosition(state.nodes, type);

    const newNode = createNode(type, nodeId, position, label.trim() || "Specify a concrete step");
    newNode.data.body = body.trim();

    set({
      nodes: normalizeMainStepPositions([...state.nodes, newNode]),
      selectedNodeId: newNode.id,
    });
  },
  addConnectedNode: (sourceId, type) => {
    const state = get();
    const sourceNode = state.nodes.find((node) => node.id === sourceId);
    if (!sourceNode) return null;

    const nodeId = createNodeId(type);
    const lane = getNodeLane(type);
    const y = lane === "quality" ? sourceNode.position.y + 220 : lane === "business" ? Math.max(80, sourceNode.position.y - 120) : sourceNode.position.y;
    const position = { x: sourceNode.position.x + 40, y };
    const newNode = createNode(type, nodeId, position, type === "eval" ? `Eval for ${sourceNode.data.label}` : `New ${type.replace("_", " ")}`);
    if (type === "reflection") {
      newNode.data.label = "Self-critique";
      newNode.data.reflectionTrigger = "Low confidence or missing constraints";
      newNode.data.reflectionLoopTarget = "same_step";
      newNode.data.reflectionPrompt = "Critique this step before moving forward.";
      newNode.data.feedbackAction = "Revise the step output before continuing.";
    }

    const newEdge: AdesEdge = {
      id: `e-${crypto.randomUUID().slice(0, 8)}`,
      source: sourceId,
      target: nodeId,
      data: { semanticType: getDefaultEdgeSemanticByNodes(sourceNode.type, type) },
    };

    set({
      nodes: normalizeMainStepPositions([...state.nodes, newNode]),
      edges: [...state.edges, newEdge],
      selectedNodeId: nodeId,
    });

    return nodeId;
  },
  deleteNodeById: (nodeId) => {
    set((state) => ({
      nodes: normalizeMainStepPositions(state.nodes.filter((node) => node.id !== nodeId)),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },
  duplicateNodeById: (nodeId) => {
    const state = get();
    const original = state.nodes.find((node) => node.id === nodeId);
    if (!original) return;

    const cloneId = createNodeId(original.type);
    const copy: AdesNode = {
      ...original,
      id: cloneId,
      position: { x: original.position.x + 70, y: original.position.y + 20 },
      data: {
        ...original.data,
        label: `${original.data.label} (copy)`,
        shortLabel: `${original.data.shortLabel || original.data.label} (copy)`,
      },
    };

    set({
      nodes: normalizeMainStepPositions([...state.nodes, copy]),
      selectedNodeId: cloneId,
    });
  },
  moveMainStep: (nodeId, direction) => {
    const state = get();
    const ordered = getOrderedMainSteps(state.nodes);
    const currentIndex = ordered.findIndex((node) => node.id === nodeId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const xMap = new Map(reordered.map((node, index) => [node.id, 180 + index * 320]));

    set({
      nodes: state.nodes.map((node) =>
        xMap.has(node.id)
          ? {
              ...node,
              position: { ...node.position, x: xMap.get(node.id)!, y: 180 },
            }
          : node,
      ),
      selectedNodeId: nodeId,
    });
  },
  deleteSelectedNode: () => {
    const selectedNodeId = get().selectedNodeId;
    if (!selectedNodeId) {
      return;
    }

    get().deleteNodeById(selectedNodeId);
  },
  updateNode: (nodeId, updater) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    }));
  },
}));
