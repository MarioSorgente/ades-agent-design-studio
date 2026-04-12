import type { Edge, Node, XYPosition } from "reactflow";

export const CORE_NODE_TYPES = [
  "goal",
  "task",
  "reflection",
  "feedback",
  "risk",
  "eval",
  "business_metric",
  "assumption",
  "handoff"
] as const;

export type AdesNodeType = (typeof CORE_NODE_TYPES)[number];

export type AdesNodeData = {
  label: string;
  body: string;
  tags: string[];
  reflectionPrompt: string;
  evalMetric: string;
  businessMetric: string;
  confidenceCheck: string;
  owner: string;
};

export type AdesNode = Node<AdesNodeData> & {
  type: AdesNodeType;
};

export type AdesEdge = Edge;

export type AdesBoardSnapshot = {
  nodes: AdesNode[];
  edges: AdesEdge[];
};

export function createNodeData(type: AdesNodeType, label: string): AdesNodeData {
  return {
    label,
    body: "",
    tags: [],
    reflectionPrompt:
      type === "reflection" ? "What should the agent verify before continuing?" : "",
    evalMetric: type === "eval" ? "Define how quality is measured." : "",
    businessMetric:
      type === "business_metric" ? "Define the KPI this design should move." : "",
    confidenceCheck:
      type === "risk" ? "What threshold should trigger caution or human review?" : "",
    owner: type === "handoff" ? "Human operations" : "AI system"
  };
}

export function createNode(type: AdesNodeType, id: string, position: XYPosition, label: string): AdesNode {
  return {
    id,
    type,
    position,
    data: createNodeData(type, label)
  };
}
