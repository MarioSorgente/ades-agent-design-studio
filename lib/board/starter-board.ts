import type { AdesBoardSnapshot, AdesEdge } from "@/lib/board/types";
import { createNode } from "@/lib/board/types";

export function createStarterBoard(): AdesBoardSnapshot {
  const nodes = [
    createNode("goal", "goal-1", { x: 140, y: 130 }, "Customer support triage agent"),
    createNode("task", "task-1", { x: 420, y: 130 }, "Understand user request"),
    createNode("task", "task-2", { x: 700, y: 130 }, "Extract intent and constraints"),
    createNode("task", "task-3", { x: 980, y: 130 }, "Plan response strategy"),
    createNode("task", "task-4", { x: 1260, y: 130 }, "Use tools and retrieve evidence"),
    createNode("task", "task-5", { x: 1540, y: 130 }, "Draft answer"),
    createNode("handoff", "handoff-1", { x: 1820, y: 130 }, "Finalize or escalate to reviewer"),

    createNode("reflection", "reflection-1", { x: 980, y: 340 }, "Reflection loop on planning"),
    createNode("feedback", "feedback-1", { x: 1540, y: 340 }, "External QA feedback"),
    createNode("eval", "eval-1", { x: 1260, y: 340 }, "Tool usage accuracy eval"),
    createNode("eval", "eval-2", { x: 1820, y: 340 }, "End-to-end task success eval"),

    createNode("business_metric", "business-metric-1", { x: 2100, y: 90 }, "Resolution time reduction"),
    createNode("risk", "risk-1", { x: 2100, y: 230 }, "Unsafe recommendation risk"),
    createNode("assumption", "assumption-1", { x: 2100, y: 360 }, "Knowledge base freshness"),
  ];

  nodes[0].data.body = "Main objective: reduce average support resolution time while keeping policy-safe answers.";
  nodes[0].data.outputs = "Clear objective and business goal";

  nodes[1].data.body = "Parse request, account context, urgency, and user intent.";
  nodes[1].data.inputs = "User message";
  nodes[1].data.outputs = "Structured request context";

  nodes[2].data.body = "Capture constraints, compliance conditions, and missing details.";
  nodes[2].data.outputs = "Intent + constraints";

  nodes[3].data.body = "Choose a plan with explicit success criteria and fallback path.";
  nodes[3].data.outputs = "Execution plan";

  nodes[4].data.body = "Call retrieval/search tools with correct arguments and parse outputs.";
  nodes[4].data.stepType = "tool_use";
  nodes[4].data.tools = ["Knowledge search", "Policy lookup"];
  nodes[4].data.outputs = "Evidence bundle";

  nodes[5].data.body = "Draft response with references, confidence notes, and next action.";
  nodes[5].data.outputs = "Draft answer";

  nodes[6].data.body = "If confidence is low or high risk is detected, route to human review.";
  nodes[6].data.stepType = "output";

  nodes[7].data.body = "Critique plan completeness and revise if assumptions are weak.";
  nodes[7].data.reflectionTrigger = "Missing constraints or confidence < 0.8";
  nodes[7].data.reflectionPrompt = "Is the plan logically complete and policy-safe?";

  nodes[8].data.body = "Human reviewer edits instructions and catches policy/tone gaps.";
  nodes[8].data.feedbackSource = "QA reviewer";
  nodes[8].data.feedbackCondition = "Low confidence or sensitive topic";
  nodes[8].data.feedbackAction = "Revise draft + update routing rules";

  nodes[9].data.evalName = "Tool usage accuracy";
  nodes[9].data.evalQuestion = "Did the agent choose the right tool and pass correct arguments?";
  nodes[9].data.evalCategory = "tool_accuracy";
  nodes[9].data.evalCriteria = "Correct tool choice, valid arguments, correct interpretation";
  nodes[9].data.evalThreshold = "≥ 90% passing cases";

  nodes[10].data.evalName = "Task success";
  nodes[10].data.evalQuestion = "Did the agent achieve the user's goal end-to-end?";
  nodes[10].data.evalCategory = "task_success";
  nodes[10].data.evalScope = "flow";
  nodes[10].data.evalCriteria = "Goal completion + user-acceptable response";
  nodes[10].data.evalThreshold = "≥ 92% successful runs";

  nodes[11].data.businessMetric = "Cut mean resolution time by 35% within 8 weeks.";
  nodes[12].data.confidenceCheck = "Escalate to reviewer when safety confidence < 0.85.";

  const edges: AdesEdge[] = [
    { id: "e-goal-task-1", source: "goal-1", target: "task-1", data: { semanticType: "execution" } },
    { id: "e-task-1-task-2", source: "task-1", target: "task-2", data: { semanticType: "execution" } },
    { id: "e-task-2-task-3", source: "task-2", target: "task-3", data: { semanticType: "execution" } },
    { id: "e-task-3-task-4", source: "task-3", target: "task-4", data: { semanticType: "execution" } },
    { id: "e-task-4-task-5", source: "task-4", target: "task-5", data: { semanticType: "execution" } },
    { id: "e-task-5-handoff", source: "task-5", target: "handoff-1", data: { semanticType: "execution" } },

    { id: "e-task-3-reflection", source: "task-3", target: "reflection-1", type: "smoothstep", data: { semanticType: "reflection" } },
    { id: "e-reflection-task-3", source: "reflection-1", target: "task-3", type: "smoothstep", data: { semanticType: "reflection" } },
    { id: "e-task-5-feedback", source: "task-5", target: "feedback-1", type: "smoothstep", data: { semanticType: "feedback" } },

    { id: "e-task-4-eval-1", source: "task-4", target: "eval-1", data: { semanticType: "eval" } },
    { id: "e-handoff-eval-2", source: "handoff-1", target: "eval-2", data: { semanticType: "eval" } },

    { id: "e-eval-metric", source: "eval-2", target: "business-metric-1", data: { semanticType: "business" } },
    { id: "e-risk-handoff", source: "risk-1", target: "handoff-1", data: { semanticType: "business" } },
    { id: "e-assumption-reflection", source: "assumption-1", target: "reflection-1", type: "smoothstep", data: { semanticType: "business" } },
  ];

  return { nodes, edges };
}
