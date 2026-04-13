import type { Edge, Node, XYPosition } from "reactflow";

export const CORE_NODE_TYPES = ["goal", "task", "reflection", "feedback", "risk", "eval", "business_metric", "assumption", "handoff"] as const;

export const BOARD_VIEW_MODES = ["flow", "improvement", "eval"] as const;

export type BoardViewMode = (typeof BOARD_VIEW_MODES)[number];

export type AdesNodeType = (typeof CORE_NODE_TYPES)[number];
export type NodeLane = "main" | "quality" | "business";
export type EdgeSemanticType = "execution" | "eval" | "reflection" | "business" | "feedback";

export type StepType = "task" | "tool_use" | "reflection" | "human_feedback" | "eval_checkpoint" | "decision" | "output";
export type EvalCategory =
  | "task_success"
  | "reasoning_quality"
  | "tool_accuracy"
  | "output_quality"
  | "efficiency"
  | "safety"
  | "escalation"
  | "reflection_effectiveness"
  | "feedback_usefulness"
  | "robustness";

export type ReflectionHook = {
  trigger: string;
  purpose: string;
  critiqueQuestion: string;
  revisionAction: string;
  stopCondition: string;
};

export type FeedbackHook = {
  source: string;
  whenToRequest: string;
  whatIsReviewed: string;
  afterFeedbackAction: string;
  updatesScope: "current_run" | "prompt" | "both";
};

export type EvalDefinition = {
  id: string;
  name: string;
  question: string;
  category: EvalCategory;
  scope: "step" | "flow";
  relatedStepIds: string[];
  whyItMatters: string;
  gradingMethod: string;
  passCriteria: string;
  threshold: string;
  testCases: string;
  failureExamples: string;
  priority: "high" | "medium" | "low";
};

export type AdesNodeData = {
  label: string;
  shortLabel: string;
  body: string;
  tags: string[];
  owner: string;
  stepType: StepType;
  purpose: string;
  whyThisStepExists: string;
  inputs: string;
  outputs: string;
  tools: string[];
  reasoningRequired: string;
  completionCriteria: string;
  commonFailureModes: string[];
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  reflectionHooks: ReflectionHook[];
  feedbackHooks: FeedbackHook[];
  evals: EvalDefinition[];
  reflectionPrompt: string;
  reflectionTrigger: string;
  feedbackSource: string;
  feedbackCondition: string;
  feedbackAction: string;
  feedbackUpdatesScope: "current_run" | "prompt" | "both";
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
    shortLabel: label,
    body: "",
    tags: [],
    owner: type === "handoff" ? "Human reviewer" : "AI agent",
    stepType: type === "handoff" ? "human_feedback" : "task",
    purpose: "",
    whyThisStepExists: "",
    inputs: "",
    outputs: "",
    tools: [],
    reasoningRequired: "",
    completionCriteria: "",
    commonFailureModes: [],
    assumptions: [],
    risks: [],
    dependencies: [],
    reflectionHooks: [],
    feedbackHooks: [],
    evals: [],
    reflectionPrompt: type === "reflection" ? "Critique this step before moving forward." : "",
    reflectionTrigger: type === "reflection" ? "Low confidence or missing constraints" : "",
    feedbackSource: type === "feedback" ? "Human reviewer" : "",
    feedbackCondition: type === "feedback" ? "Confidence below threshold" : "",
    feedbackAction: type === "feedback" ? "Revise prompt and rerun previous step" : "",
    feedbackUpdatesScope: "current_run",
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
