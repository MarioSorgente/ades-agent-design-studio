import type { AdesBoardSnapshot, AdesNode } from "@/lib/board/types";

const GENERIC_PATTERNS = [/^new\b/i, /^step\s*\d+/i, /^task$/i, /^analyze request$/i, /^draft response$/i, /^untitled/i];

export type BoardQualityReport = {
  totalSteps: number;
  genericStepCount: number;
  stepsMissingPurpose: number;
  stepsMissingOutputs: number;
  evalCoveragePct: number;
  improvementCoveragePct: number;
  unresolvedRisks: number;
  hasEndToEndEval: boolean;
  hasSafetyEval: boolean;
  score: number;
  weakestArea: string;
  issues: string[];
};

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function isGenericStepTitle(label: string) {
  const normalized = label.trim();
  return !normalized || GENERIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function analyzeBoardQuality(board: AdesBoardSnapshot | null): BoardQualityReport {
  if (!board?.nodes?.length) {
    return {
      totalSteps: 0,
      genericStepCount: 0,
      stepsMissingPurpose: 0,
      stepsMissingOutputs: 0,
      evalCoveragePct: 0,
      improvementCoveragePct: 0,
      unresolvedRisks: 0,
      hasEndToEndEval: false,
      hasSafetyEval: false,
      score: 0,
      weakestArea: "No flow yet",
      issues: ["No generated flow exists yet."],
    };
  }

  const mainSteps = board.nodes.filter(isMainStep);
  const evalNodes = board.nodes.filter((n) => n.type === "eval");
  const reflectionOrFeedback = board.nodes.filter((n) => n.type === "reflection" || n.type === "feedback");
  const riskNodes = board.nodes.filter((n) => n.type === "risk");

  const genericStepCount = mainSteps.filter((step) => isGenericStepTitle(step.data.label)).length;
  const stepsMissingPurpose = mainSteps.filter((step) => !(step.data.purpose || step.data.body).trim()).length;
  const stepsMissingOutputs = mainSteps.filter((step) => !step.data.outputs.trim()).length;

  const hasEndToEndEval = evalNodes.some((node) => node.data.evalScope === "flow" || /end-to-end|overall/i.test(node.data.evalName));
  const hasSafetyEval = evalNodes.some((node) => node.data.evalCategory === "safety");

  const evalCoveragePct = mainSteps.length ? Math.round((evalNodes.length / mainSteps.length) * 100) : 0;
  const improvementCoveragePct = mainSteps.length ? Math.round((reflectionOrFeedback.length / mainSteps.length) * 100) : 0;

  const issues: string[] = [];
  if (genericStepCount > 0) issues.push(`${genericStepCount} step titles are generic and need refinement.`);
  if (stepsMissingPurpose > 0) issues.push(`${stepsMissingPurpose} steps are missing a clear purpose.`);
  if (stepsMissingOutputs > 0) issues.push(`${stepsMissingOutputs} steps are missing concrete outputs.`);
  if (!hasEndToEndEval) issues.push("Missing end-to-end task success eval.");
  if (!hasSafetyEval) issues.push("Missing safety/compliance eval coverage.");
  if (!reflectionOrFeedback.length) issues.push("No reflection or feedback loops were added.");

  const penalty = genericStepCount * 8 + stepsMissingPurpose * 6 + stepsMissingOutputs * 5 + (!hasEndToEndEval ? 15 : 0) + (!hasSafetyEval ? 10 : 0) + (!reflectionOrFeedback.length ? 12 : 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const weakestArea = issues[0] ?? "Balanced design";

  return {
    totalSteps: mainSteps.length,
    genericStepCount,
    stepsMissingPurpose,
    stepsMissingOutputs,
    evalCoveragePct,
    improvementCoveragePct,
    unresolvedRisks: riskNodes.length,
    hasEndToEndEval,
    hasSafetyEval,
    score,
    weakestArea,
    issues,
  };
}
