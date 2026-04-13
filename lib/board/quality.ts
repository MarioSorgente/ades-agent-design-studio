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

export type BoardChecklistReport = {
  decomposition: {
    clearStepBoundaries: boolean;
    explicitInputsOutputs: boolean;
    dependenciesMapped: boolean;
    reflectionHooksPresent: boolean;
    escalationOrHandoffJustified: boolean;
    score: number;
    issues: string[];
  };
  evalRigor: {
    hasStepAndFlowEvals: boolean;
    categoryCoverageBroad: boolean;
    measurableThresholds: boolean;
    hasFailureExamplesAndDatasets: boolean;
    score: number;
    issues: string[];
  };
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

export function analyzeBoardChecklists(board: AdesBoardSnapshot | null): BoardChecklistReport {
  if (!board?.nodes?.length) {
    return {
      decomposition: {
        clearStepBoundaries: false,
        explicitInputsOutputs: false,
        dependenciesMapped: false,
        reflectionHooksPresent: false,
        escalationOrHandoffJustified: false,
        score: 0,
        issues: ["No board generated yet."],
      },
      evalRigor: {
        hasStepAndFlowEvals: false,
        categoryCoverageBroad: false,
        measurableThresholds: false,
        hasFailureExamplesAndDatasets: false,
        score: 0,
        issues: ["No board generated yet."],
      },
    };
  }

  const mainSteps = board.nodes.filter(isMainStep);
  const evalNodes = board.nodes.filter((node) => node.type === "eval");
  const reflectionNodes = board.nodes.filter((node) => node.type === "reflection");
  const handoffNodes = board.nodes.filter((node) => node.type === "handoff");

  const clearStepBoundaries = mainSteps.every((node) => !isGenericStepTitle(node.data.label));
  const explicitInputsOutputs = mainSteps.every((node) => node.data.inputs.trim() && node.data.outputs.trim());
  const dependenciesMapped = mainSteps.every((node) => node.data.dependencies.length > 0);
  const reflectionHooksPresent = mainSteps.some((node) => node.data.reflectionHooks.length > 0) || reflectionNodes.length > 0;
  const escalationOrHandoffJustified = handoffNodes.every((node) => {
    const text = `${node.data.body} ${node.data.completionCriteria}`.toLowerCase();
    return /escalat|human|policy|risk|confidence/.test(text);
  });

  const decompositionIssues: string[] = [];
  if (!clearStepBoundaries) decompositionIssues.push("Some step labels are generic.");
  if (!explicitInputsOutputs) decompositionIssues.push("Some steps are missing explicit inputs or outputs.");
  if (!dependenciesMapped) decompositionIssues.push("Some steps do not include dependencies.");
  if (!reflectionHooksPresent) decompositionIssues.push("No reflection hooks detected.");
  if (!escalationOrHandoffJustified) decompositionIssues.push("Some handoff/escalation steps look weakly justified.");
  const decompositionScore = [clearStepBoundaries, explicitInputsOutputs, dependenciesMapped, reflectionHooksPresent, escalationOrHandoffJustified].filter(Boolean).length * 20;

  const hasStepAndFlowEvals = evalNodes.some((node) => node.data.evalScope === "step") && evalNodes.some((node) => node.data.evalScope === "flow");
  const categories = new Set(evalNodes.map((node) => node.data.evalCategory));
  const categoryCoverageBroad = categories.has("task_success") && categories.has("safety") && categories.has("robustness");
  const measurableThresholds = evalNodes.every((node) => node.data.evalThreshold.trim().length > 0);
  const hasFailureExamplesAndDatasets = evalNodes.every((node) => node.data.evalMetric.trim().length > 0 && node.data.evalDataset.trim().length > 0);

  const evalIssues: string[] = [];
  if (!hasStepAndFlowEvals) evalIssues.push("Need both step-level and flow-level evals.");
  if (!categoryCoverageBroad) evalIssues.push("Eval categories should include task_success, safety, and robustness.");
  if (!measurableThresholds) evalIssues.push("Some evals are missing measurable thresholds.");
  if (!hasFailureExamplesAndDatasets) evalIssues.push("Some evals are missing failure examples or dataset notes.");
  const evalScore = [hasStepAndFlowEvals, categoryCoverageBroad, measurableThresholds, hasFailureExamplesAndDatasets].filter(Boolean).length * 25;

  return {
    decomposition: {
      clearStepBoundaries,
      explicitInputsOutputs,
      dependenciesMapped,
      reflectionHooksPresent,
      escalationOrHandoffJustified,
      score: decompositionScore,
      issues: decompositionIssues,
    },
    evalRigor: {
      hasStepAndFlowEvals,
      categoryCoverageBroad,
      measurableThresholds,
      hasFailureExamplesAndDatasets,
      score: evalScore,
      issues: evalIssues,
    },
  };
}
