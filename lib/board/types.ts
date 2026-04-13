import type { Edge, Node, XYPosition } from "reactflow";

export const CORE_NODE_TYPES = ["goal", "task", "reflection", "feedback", "risk", "eval", "business_metric", "assumption", "handoff"] as const;

export const BOARD_VIEW_MODES = ["flow", "improvement", "eval"] as const;

export type BoardViewMode = (typeof BOARD_VIEW_MODES)[number];

export type AdesNodeType = (typeof CORE_NODE_TYPES)[number];
export type NodeLane = "main" | "quality" | "business";
export type EdgeSemanticType = "execution" | "eval" | "reflection" | "business" | "feedback";

export type StepType = "task" | "tool_use" | "reflection" | "human_feedback" | "eval_checkpoint" | "decision" | "output";
export type EvalCategory = "task_success" | "reasoning_quality" | "tool_accuracy" | "efficiency" | "safety";

export type AdesNodeData = {
  label: string;
  body: string;
  tags: string[];
  owner: string;
  stepType: StepType;
  inputs: string;
  outputs: string;
  tools: string[];
  assumptions: string[];
  risks: string[];
  reflectionPrompt: string;
  reflectionTrigger: string;
  feedbackSource: string;
  feedbackCondition: string;
  feedbackAction: string;
  evalName: string;
  evalQuestion: string;
  evalMetric: string;
  evalCategory: EvalCategory;
  evalScope: "step" | "flow";
  evalCriteria: string;
  evalDataset: string;
  evalMethod: string;
  evalThreshold: string;
  businessMetric: string;
  confidenceCheck: string;
  attachmentSummary?: {
    reflectionCount: number;
    feedbackCount: number;
    evalCount: number;
    riskCount: number;
    toolCount: number;
  };
  stepIndex?: number;
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
  const isEval = type === "eval";
  return {
    label,
    body: "",
    tags: [],
    owner: type === "handoff" ? "Human reviewer" : "AI agent",
    stepType: type === "handoff" ? "human_feedback" : "task",
    inputs: "",
    outputs: "",
    tools: [],
    assumptions: [],
    risks: [],
    reflectionPrompt: type === "reflection" ? "Critique this step before moving forward." : "",
    reflectionTrigger: type === "reflection" ? "Low confidence or missing constraints" : "",
    feedbackSource: type === "feedback" ? "Human reviewer" : "",
    feedbackCondition: type === "feedback" ? "Confidence below threshold" : "",
    feedbackAction: type === "feedback" ? "Revise prompt and rerun previous step" : "",
    evalName: isEval ? "Step quality check" : "",
    evalQuestion: isEval ? "Did this step achieve its intended output?" : "",
    evalMetric: isEval ? "Quality rubric" : "",
    evalCategory: "task_success",
    evalScope: "step",
    evalCriteria: isEval ? "Accurate, complete, policy-safe" : "",
    evalDataset: "",
    evalMethod: "Rubric + spot checks",
    evalThreshold: isEval ? "Pass rate ≥ 90%" : "",
    businessMetric: type === "business_metric" ? "" : "",
    confidenceCheck: type === "risk" ? "Escalate if confidence < 0.75" : "",
  };
}

export function createNode(type: AdesNodeType, id: string, position: XYPosition, label: string): AdesNode {
  return {
    id,
    type,
    position,
    data: createNodeData(type, label),
  };
}

export function getNodeLane(type: AdesNodeType): NodeLane {
  if (type === "eval" || type === "feedback" || type === "reflection") return "quality";
  if (type === "business_metric" || type === "assumption" || type === "risk") return "business";
  return "main";
}

export function getDefaultEdgeSemanticByNodes(sourceType: AdesNodeType, targetType: AdesNodeType): EdgeSemanticType {
  if (targetType === "eval") return "eval";
  if (targetType === "reflection" || sourceType === "reflection") return "reflection";
  if (targetType === "business_metric" || targetType === "assumption" || targetType === "risk") return "business";
  if (targetType === "feedback" || sourceType === "feedback") return "feedback";
  return "execution";
}
