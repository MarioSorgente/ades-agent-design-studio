import type { AdesBoardSnapshot } from "@/lib/board/types";
import { createNode } from "@/lib/board/types";

export function createStarterBoard(): AdesBoardSnapshot {
  const nodes = [
    createNode("goal", "goal-1", { x: 120, y: 130 }, "Reduce support resolution time by 35%"),
    createNode("task", "task-1", { x: 460, y: 110 }, "Classify incoming customer issue"),
    createNode("task", "task-2", { x: 460, y: 300 }, "Draft recommended response"),
    createNode("reflection", "reflection-1", { x: 800, y: 110 }, "Pause for policy confidence check"),
    createNode("feedback", "feedback-1", { x: 800, y: 310 }, "Capture QA reviewer feedback"),
    createNode("risk", "risk-1", { x: 1140, y: 120 }, "Incorrect policy interpretation"),
    createNode("eval", "eval-1", { x: 1140, y: 320 }, "Accuracy + tone eval"),
    createNode("business_metric", "business-metric-1", { x: 1480, y: 120 }, "First-response resolution rate"),
    createNode("assumption", "assumption-1", { x: 1480, y: 320 }, "Knowledge base is always up to date"),
    createNode("handoff", "handoff-1", { x: 1820, y: 220 }, "Escalate edge cases to specialist")
  ];

  nodes[0].data.body = "Set a clear business objective and trust threshold for the assistant.";
  nodes[1].data.body = "Extract intent, urgency, and account context from each request.";
  nodes[2].data.body = "Propose next action and supporting rationale before sending.";
  nodes[3].data.body = "Validate policy references and user-specific constraints before proceeding.";
  nodes[3].data.reflectionPrompt = "If confidence is below 0.8, request clarification or escalate.";
  nodes[4].data.body = "Use reviewer edits to improve prompt guidelines and decision boundaries.";
  nodes[5].data.body = "High-severity risk when policy exceptions are missed.";
  nodes[5].data.confidenceCheck = "Trigger handoff when unsupported policy request is detected.";
  nodes[6].data.body = "Measure factual correctness, clarity, and compliance on sampled outputs.";
  nodes[6].data.evalMetric = "Pass rate ≥ 92% on weekly quality benchmark.";
  nodes[7].data.body = "Track customer outcomes and operational efficiency after launch.";
  nodes[7].data.businessMetric = "Increase first-response resolution from 52% to 70%.";
  nodes[8].data.body = "If this assumption fails, confidence and outcomes degrade quickly.";
  nodes[9].data.body = "Route sensitive and ambiguous requests to a human specialist queue.";
  nodes[9].data.owner = "Support specialist";

  const edges = [
    { id: "e-goal-task-1", source: "goal-1", target: "task-1", label: "scope" },
    { id: "e-task-1-task-2", source: "task-1", target: "task-2", label: "then" },
    { id: "e-task-1-reflection", source: "task-1", target: "reflection-1", label: "verify" },
    { id: "e-task-2-feedback", source: "task-2", target: "feedback-1", label: "review" },
    { id: "e-reflection-risk", source: "reflection-1", target: "risk-1", label: "failure mode" },
    { id: "e-feedback-eval", source: "feedback-1", target: "eval-1", label: "measure" },
    { id: "e-eval-metric", source: "eval-1", target: "business-metric-1", label: "business impact" },
    { id: "e-risk-handoff", source: "risk-1", target: "handoff-1", label: "escalate" },
    { id: "e-assumption-reflection", source: "assumption-1", target: "reflection-1", label: "challenge" }
  ];

  return { nodes, edges };
}
