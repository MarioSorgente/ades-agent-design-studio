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

export const BOARD_VIEW_MODES = ["all", "main", "evals", "reflection", "business"] as const;

export type BoardViewMode = (typeof BOARD_VIEW_MODES)[number];

export type AdesNodeType = (typeof CORE_NODE_TYPES)[number];
export type NodeLane = "main" | "quality" | "business";
export type EdgeSemanticType = "execution" | "eval" | "reflection" | "business" | "feedback";

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

export type AdesEdge = Edge<{ semanticType?: EdgeSemanticType }>;

export type AdesBoardSnapshot = {
  nodes: AdesNode[];
  edges: AdesEdge[];
};

export function createNodeData(type: AdesNodeType, label: string): AdesNodeData {
  return {
    label,
    body: "",
    tags: [],
    reflectionPrompt: type === "reflection" ? "What should the agent verify before continuing?" : "",
    evalMetric: type === "eval" ? "Define how quality is measured." : "",
    businessMetric: type === "business_metric" ? "Define the KPI this design should move." : "",
    confidenceCheck: type === "risk" ? "What threshold should trigger caution or human review?" : "",
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

export function getNodeLane(type: AdesNodeType): NodeLane {
  if (type === "eval" || type === "feedback" || type === "reflection") {
    return "quality";
  }

  if (type === "business_metric" || type === "assumption" || type === "risk") {
    return "business";
  }

  return "main";
}

export function getDefaultEdgeSemanticByNodes(sourceType: AdesNodeType, targetType: AdesNodeType): EdgeSemanticType {
  if (targetType === "eval") return "eval";
  if (targetType === "reflection" || sourceType === "reflection") return "reflection";
  if (targetType === "business_metric" || targetType === "assumption" || targetType === "risk") return "business";
  if (targetType === "feedback" || sourceType === "feedback") return "feedback";
  return "execution";
}
