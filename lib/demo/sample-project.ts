import type { AdesBoardSnapshot } from "@/lib/board/types";
import { createStarterBoard } from "@/lib/board/starter-board";

export const DEMO_PRIMARY_STEP_ID = "task-2";
export const DEMO_EVAL_NODE_ID = "eval-1";
export const DEMO_SAFEGUARD_NODE_ID = "risk-1";

export const demoProjectRecord = {
  id: "demo-customer-support-refund-agent",
  title: "Customer Support Refund Agent",
  summary:
    "A precompiled ADES project that classifies refund requests, applies policy, drafts responses, and escalates risky edge-cases.",
  audience: "Support operations leads",
  constraints: "Policy-safe, low latency, human escalation for risk",
  status: "generated" as const,
};

export function createDemoBoardSnapshot(): AdesBoardSnapshot {
  const board = createStarterBoard();

  const renamedNodes = board.nodes.map((node) => {
    if (node.id === "goal-1") {
      return {
        ...node,
        data: {
          ...node.data,
          label: "Customer support refund agent",
          purpose: "Handle refund requests with policy-aware reasoning and clear next actions.",
          inputs: "Customer message, order metadata",
          outputs: "Decision rationale + customer-ready reply",
        },
      };
    }

    if (node.id === "task-1") {
      return {
        ...node,
        data: {
          ...node.data,
          label: "Intake request",
          purpose: "Extract refund reason, item details, and urgency from the incoming ticket.",
          inputs: "Ticket text, account history",
          outputs: "Structured refund request",
        },
      };
    }

    if (node.id === "task-2") {
      return {
        ...node,
        data: {
          ...node.data,
          label: "Check policy eligibility",
          purpose: "Apply refund rules by order type, timing window, and exception constraints.",
          inputs: "Structured request + policy rules",
          outputs: "Eligibility decision + rationale",
        },
      };
    }

    if (node.id === "task-5") {
      return {
        ...node,
        data: {
          ...node.data,
          label: "Draft customer response",
          purpose: "Generate a concise approve/deny/clarify response with transparent reasoning.",
          outputs: "Ready-to-send reply and internal notes",
        },
      };
    }

    if (node.id === "risk-1") {
      return {
        ...node,
        data: {
          ...node.data,
          label: "High-risk refund safeguard",
          body: "Require human review for fraud signals, high-value refunds, or policy conflicts.",
          confidenceCheck: "Escalate if safety confidence < 0.85 or fraud score > threshold.",
        },
      };
    }

    return node;
  });

  return {
    nodes: renamedNodes,
    edges: board.edges,
  };
}
