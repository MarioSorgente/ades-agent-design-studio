import type { AdesBoardSnapshot } from "@/lib/board/types";
import { createNode } from "@/lib/board/types";

export function createStarterBoard(): AdesBoardSnapshot {
  const nodes = [
    createNode("goal", "goal-1", { x: 80, y: 80 }, "Design agent objective"),
    createNode("task", "task-1", { x: 400, y: 80 }, "Map core tasks"),
    createNode("reflection", "reflection-1", { x: 730, y: 80 }, "Add reflection checkpoints"),
    createNode("eval", "eval-1", { x: 400, y: 280 }, "Define quality evals"),
    createNode("business_metric", "business-metric-1", { x: 730, y: 280 }, "Define business metrics"),
  ];

  nodes[0].data.body = "Capture what success looks like for this agent concept.";
  nodes[1].data.body = "Break the workflow into clear PM-readable steps.";
  nodes[2].data.body = "List confidence checks and escalation triggers.";
  nodes[3].data.body = "Select measurable quality checks for outputs.";
  nodes[4].data.body = "Name at least one KPI impacted by this design.";

  const edges = [
    { id: "e-goal-task", source: "goal-1", target: "task-1", animated: true },
    { id: "e-task-reflection", source: "task-1", target: "reflection-1" },
    { id: "e-task-eval", source: "task-1", target: "eval-1" },
    { id: "e-eval-business", source: "eval-1", target: "business-metric-1" },
  ];

  return { nodes, edges };
}
