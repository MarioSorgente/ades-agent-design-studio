import type { AdesBoardSnapshot, AdesEdge } from "@/lib/board/types";
import { createNode } from "@/lib/board/types";

export function createStarterBoard(): AdesBoardSnapshot {
  const nodes = [
    createNode("goal", "goal-1", { x: 120, y: 140 }, "Reduce support resolution time by 35%"),
    createNode("task", "task-1", { x: 460, y: 140 }, "Classify incoming customer issue"),
    createNode("task", "task-2", { x: 800, y: 140 }, "Draft recommended response"),
    createNode("handoff", "handoff-1", { x: 1140, y: 140 }, "Escalate edge cases to specialist"),

    createNode("reflection", "reflection-1", { x: 460, y: 320 }, "Reflect on policy confidence"),
    createNode("feedback", "feedback-1", { x: 800, y: 320 }, "Capture reviewer edits"),
    createNode("eval", "eval-1", { x: 1140, y: 320 }, "Accuracy + tone eval"),

    createNode("business_metric", "business-metric-1", { x: 1460, y: 100 }, "First-response resolution rate"),
    createNode("assumption", "assumption-1", { x: 1460, y: 220 }, "Knowledge base remains current"),
    createNode("risk", "risk-1", { x: 1460, y: 340 }, "Policy exception missed")
  ];

  nodes[0].data.body = "Set a clear objective and trust threshold for the assistant.";
  nodes[1].data.body = "Extract intent, urgency, and account context from each request.";
  nodes[2].data.body = "Propose next action and rationale before sending.";
  nodes[3].data.body = "Route ambiguous or sensitive requests to human specialists.";
  nodes[3].data.owner = "Support specialist";

  nodes[4].data.body = "Check confidence and policy fit before response finalization.";
  nodes[4].data.reflectionPrompt = "If confidence is below 0.8, request clarification or escalate.";
  nodes[5].data.body = "Use reviewer edits to improve prompts and routing boundaries.";
  nodes[6].data.body = "Measure factual correctness, clarity, and compliance.";
  nodes[6].data.evalMetric = "Pass rate ≥ 92% on weekly quality benchmark.";

  nodes[7].data.body = "Track customer outcomes and operational efficiency.";
  nodes[7].data.businessMetric = "Increase first-response resolution from 52% to 70%.";
  nodes[8].data.body = "If false, quality and confidence degrade quickly.";
  nodes[9].data.body = "High-severity risk when policy exceptions are missed.";
  nodes[9].data.confidenceCheck = "Trigger handoff when unsupported policy request is detected.";

  const edges: AdesEdge[] = [
    { id: "e-goal-task-1", source: "goal-1", target: "task-1", label: "scope", data: { semanticType: "execution" } },
    { id: "e-task-1-task-2", source: "task-1", target: "task-2", label: "step", data: { semanticType: "execution" } },
    { id: "e-task-2-handoff", source: "task-2", target: "handoff-1", label: "deliver", data: { semanticType: "execution" } },

    { id: "e-task-1-reflection", source: "task-1", target: "reflection-1", label: "reflect", type: "smoothstep", data: { semanticType: "reflection" } },
    { id: "e-reflection-task-1", source: "reflection-1", target: "task-1", label: "revise", type: "smoothstep", data: { semanticType: "reflection" } },
    { id: "e-task-2-feedback", source: "task-2", target: "feedback-1", label: "review", type: "smoothstep", data: { semanticType: "feedback" } },
    { id: "e-feedback-eval", source: "feedback-1", target: "eval-1", label: "measure", data: { semanticType: "eval" } },

    { id: "e-eval-metric", source: "eval-1", target: "business-metric-1", label: "impact", data: { semanticType: "business" } },
    { id: "e-assumption-reflection", source: "assumption-1", target: "reflection-1", label: "challenge", type: "smoothstep", data: { semanticType: "business" } },
    { id: "e-risk-handoff", source: "risk-1", target: "handoff-1", label: "guardrail", data: { semanticType: "business" } }
  ];

  return { nodes, edges };
}
