import assert from "node:assert/strict";
import test from "node:test";

import { AI_SCHEMA, normalizeDesign } from "../../app/api/generate/route";
import { ADES_GENERATE_MASTER_SYSTEM_PROMPT } from "../../lib/ai/prompts/generate-master-prompt";

const baseEval = {
  id: "eval-1", name: "Domain decision check", question: "Is the decision correct?", category: "escalation" as const,
  scope: "step" as const, relatedStepIds: ["decision"], whyItMatters: "Prevents incorrect action", gradingMethod: "Fixture rubric",
  passCriteria: "All mandatory conditions hold", datasetNotes: "Three named fixtures", priority: "high" as const,
  toolUseRequirements: { expectedTool: "CRM", argumentConstraints: ["ticket_id must be present"], returnedEvidence: ["ticket record"], allowedFailureBehavior: ["stop on unavailable CRM"] },
};

function design(domain: "support" | "refund") {
  const support = domain === "support";
  const output = support ? "routing recommendation with queue and escalation flag" : "refund recommendation awaiting human approval";
  const evalItem = {
    ...baseEval,
    name: support ? "Route policy-sensitive support ticket" : "Gate refund recommendation for approval",
    evaluatedStepName: support ? "Recommend support queue" : "Prepare refund recommendation",
    evaluatedOutput: output,
    observablePassConditions: support ? ["Billing ticket names the billing queue", "Policy-sensitive ticket sets requires_review=true"] : ["Recommendation cites the refund-policy clause", "No refund is executed before approval"],
    graderEvidence: support ? ["ticket text", "routing JSON", "CRM lookup response"] : ["order facts", "policy excerpt", "recommendation", "approval record"],
    safetyEscalationRequirements: { blueprintRisks: support ? ["policy-sensitive misroute"] : ["unauthorized refund"], humanInvolvementRules: support ? ["human review for policy-sensitive cases"] : ["human approval required for every final refund"] },
    threshold: "Pass only if all 3 named fixtures satisfy every mandatory condition (3/3)",
    testCases: [
      { caseType: "normal" as const, description: support ? "clear billing request" : "eligible duplicate charge", input: support ? "charged twice" : "duplicate order charge", expectedBehavior: support ? "route to billing" : "recommend refund and request approval" },
      { caseType: "failure" as const, description: support ? "CRM unavailable" : "missing approval", input: support ? "ticket with CRM timeout" : "eligible refund without approver record", expectedBehavior: support ? "stop and send to manual triage" : "do not execute and escalate" },
      { caseType: "boundary_or_ambiguity" as const, description: support ? "mixed billing and legal language" : "purchase at policy cutoff", input: support ? "chargeback threat" : "exactly 30 days old", expectedBehavior: support ? "flag policy-sensitive human review" : "cite cutoff rule and request human approval" },
    ],
    failureExamples: support ? ["Routes a chargeback threat directly to billing without review"] : ["Issues a refund before approval is recorded"],
  };
  return {
    title: support ? "Support router" : "Refund adviser", summary: "Test design", mainTask: "Decide", userContext: "Operator",
    expectedBusinessOutcome: "Consistent decisions", assumptions: [], risks: [], critiqueSeed: [], endToEndEvals: [],
    steps: [{ id: "decision", title: evalItem.evaluatedStepName, shortLabel: "Decide", purpose: "Decide safely", whyThisStepExists: "Required", stepType: "tool_use", inputs: ["request"], outputs: [output], toolsNeeded: ["CRM"], reasoningRequired: "Apply policy", completionCriteria: evalItem.observablePassConditions.join("; "), commonFailureModes: [], risks: evalItem.safetyEscalationRequirements.blueprintRisks, dependencies: [], reflectionHooks: [], feedbackHooks: [], evals: [evalItem] }],
  };
}

test("generation schema and prompt require structured, observable eval cases", () => {
  const evalSchema = AI_SCHEMA.$defs.evalItem;
  assert.equal(evalSchema.properties.testCases.type, "array");
  assert.equal(evalSchema.properties.failureExamples.type, "array");
  for (const phrase of ["exact workflow step", "observable pass conditions", "boundary_or_ambiguity", "hidden chain-of-thought", "denominator"]) {
    assert.match(ADES_GENERATE_MASTER_SYSTEM_PROMPT, new RegExp(phrase));
  }
  assert.match(ADES_GENERATE_MASTER_SYSTEM_PROMPT, /starts with a concrete action verb and names the object/);
  assert.match(ADES_GENERATE_MASTER_SYSTEM_PROMPT, /Good: “Classify the ticket”/);
  assert.match(ADES_GENERATE_MASTER_SYSTEM_PROMPT, /expected output and the observable result/);
  assert.match(ADES_GENERATE_MASTER_SYSTEM_PROMPT, /acceptable number of failures/);
  assert.doesNotMatch(ADES_GENERATE_MASTER_SYSTEM_PROMPT, /Pass rate ≥ 90%/);
});

test("support routing and human-approved refunds retain distinct domain eval evidence", () => {
  const support = normalizeDesign(design("support") as Parameters<typeof normalizeDesign>[0]);
  const refund = normalizeDesign(design("refund") as Parameters<typeof normalizeDesign>[0]);
  const supportEval = support.nodes.find((node) => node.type === "eval")!;
  const refundEval = refund.nodes.find((node) => node.type === "eval")!;
  assert.match(supportEval.data.evalDataset, /chargeback threat/);
  assert.match(supportEval.data.evalMetric, /billing without review/);
  assert.match(refundEval.data.evalDataset, /30 days old/);
  assert.match(refundEval.data.evalMetric, /before approval/);
  assert.notEqual(supportEval.data.evalCriteria, refundEval.data.evalCriteria, "step rubrics must not collapse to generic duplicates");
});
