export type DemoStep = {
  id: string;
  title: string;
  summary: string;
  inputs: string[];
  outputs: string[];
};

export type DemoEval = {
  id: string;
  name: string;
  description: string;
  target: string;
};

export type DemoSafeguard = {
  id: string;
  name: string;
  description: string;
  trigger: string;
};

export const demoProject = {
  title: "Customer Support Refund Agent",
  description:
    "An AI agent that helps classify refund requests, checks policy, drafts a response, and escalates risky cases.",
  steps: [
    {
      id: "intake",
      title: "Intake request",
      summary: "Collect issue type, order ID, and refund reason from the customer.",
      inputs: ["Customer message", "Order ID", "Refund reason"],
      outputs: ["Structured request", "Missing info flags"],
    },
    {
      id: "policy-check",
      title: "Check refund policy",
      summary: "Compare request facts to refund rules and eligibility windows.",
      inputs: ["Structured request", "Refund policy rules"],
      outputs: ["Eligibility decision", "Policy rationale"],
    },
    {
      id: "draft-response",
      title: "Draft response",
      summary: "Prepare approve, deny, or clarify response with clear next actions.",
      inputs: ["Eligibility decision", "Policy rationale"],
      outputs: ["Customer-ready draft", "Action checklist"],
    },
    {
      id: "human-escalation",
      title: "Escalate risky cases",
      summary: "Route edge cases, high-value orders, or suspicious signals to human review.",
      inputs: ["Draft response", "Risk signals"],
      outputs: ["Escalation packet", "Handoff owner"],
    },
  ] as DemoStep[],
  evals: [
    {
      id: "policy-accuracy",
      name: "Policy accuracy",
      description: "Checks if approval/denial decisions match policy outcomes on test cases.",
      target: ">= 95% correct policy decisions on the validation set.",
    },
    {
      id: "response-clarity",
      name: "Response clarity",
      description: "Measures whether responses are short, understandable, and actionable.",
      target: ">= 4.5/5 average human clarity rating.",
    },
  ] as DemoEval[],
  safeguards: [
    {
      id: "pii-masking",
      name: "PII masking",
      description: "Mask sensitive customer fields before internal summaries are shared.",
      trigger: "Applies before logging and handoff messages.",
    },
    {
      id: "human-handoff",
      name: "Human handoff for high-risk cases",
      description: "Force human review when confidence is low or fraud risk is high.",
      trigger: "Triggered by low confidence, policy conflicts, or fraud signals.",
    },
  ] as DemoSafeguard[],
  readiness: {
    overall: 82,
    summary: "Ready for pilot with small improvements.",
    breakdown: [
      { label: "Workflow clarity", score: 85, note: "Flow is complete and easy to inspect." },
      { label: "Eval coverage", score: 78, note: "Good start; add edge-case dataset examples." },
      { label: "Safeguards", score: 83, note: "Critical risks are covered with human fallback." },
    ],
  },
} as const;
