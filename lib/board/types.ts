import type { Edge, Node, XYPosition } from "reactflow";

export const CORE_NODE_TYPES = ["goal", "task", "reflection", "eval", "business_metric"] as const;

export type AdesCoreNodeType = (typeof CORE_NODE_TYPES)[number];

export type AdesNodeData = {
  label: string;
  body: string;
  tags: string[];
  reflectionPrompt: string;
  evalMetric: string;
  businessMetric: string;
};

export type AdesNode = Node<AdesNodeData> & {
  type: AdesCoreNodeType;
};

export type AdesEdge = Edge;

export type AdesBoardSnapshot = {
  nodes: AdesNode[];
  edges: AdesEdge[];
};

export function createNodeData(type: AdesCoreNodeType, label: string): AdesNodeData {
  return {
    label,
    body: "",
    tags: [],
    reflectionPrompt:
      type === "reflection" ? "What should the agent verify before continuing?" : "",
    evalMetric: type === "eval" ? "Define how quality is measured." : "",
    businessMetric:
      type === "business_metric" ? "Define the business KPI this agent should improve." : "",
  };
}

export function createNode(type: AdesCoreNodeType, id: string, position: XYPosition, label: string): AdesNode {
  return {
    id,
    type,
    position,
    data: createNodeData(type, label),
  };
}
