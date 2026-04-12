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
  deleteSelectedNode: () => void;
  updateNode: (nodeId: string, updater: (node: AdesNode) => AdesNode) => void;
};

function createNodeId(type: AdesNodeType): string {
  return `${type}-${crypto.randomUUID().slice(0, 8)}`;
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
    set((state) => ({
      edges: addEdge({ ...connection, id: `e-${crypto.randomUUID().slice(0, 8)}` }, state.edges),
    }));
  },
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  addNode: (type) => {
    const state = get();
    const index = state.nodes.length;
    const nodeId = createNodeId(type);
    const position = {
      x: 240 + (index % 3) * 260,
      y: 140 + Math.floor(index / 3) * 190,
    };

    const newNode = createNode(type, nodeId, position, `New ${type.replace("_", " ")}`);

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
