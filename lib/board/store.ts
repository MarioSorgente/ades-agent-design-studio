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

    const newNode = createNode(type, nodeId, position, `New ${type.replace("_", " ")}`);

    set({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    });
  },
  addNodeWithContent: (type, label, body) => {
    const state = get();
    const nodeId = createNodeId(type);
    const position = nextNodePosition(state.nodes, type);

    const newNode = createNode(type, nodeId, position, label.trim() || `New ${type.replace("_", " ")}`);
    newNode.data.body = body.trim();

    set({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    });
  },
  deleteSelectedNode: () => {
    const selectedNodeId = get().selectedNodeId;
    if (!selectedNodeId) {
      return;
    }

    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== selectedNodeId),
      edges: state.edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
      selectedNodeId: null,
    }));
  },
  updateNode: (nodeId, updater) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    }));
  },
}));
