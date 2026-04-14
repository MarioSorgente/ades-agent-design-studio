import type { AdesBoardSnapshot, AdesNode } from "@/lib/board/types";

export type QualityCategoryKey = "workflowClarity" | "decompositionQuality" | "toolLogic" | "reflectionFeedback" | "evalReadiness";

export type QualityCategoryReport = {
  passed: boolean;
  score: number;
  issues: string[];
};

export type BoardQualityReport = {
  workflowClarity: QualityCategoryReport;
  decompositionQuality: QualityCategoryReport;
  toolLogic: QualityCategoryReport;
  reflectionFeedback: QualityCategoryReport;
  evalReadiness: QualityCategoryReport;
  overallScore: number;
  weakestArea: QualityCategoryKey;
  issues: string[];
  // legacy + dashboard fields
  totalMainWorkflowSteps: number;
  clearWorkflowSteps: number;
  workflowClarityLabel: string;
  workflowClarityPct: number;
  passedEvalChecks: number;
  requiredEvalChecks: number;
  evalReadinessLabel: string;
  evalReadinessPct: number;
  safeguardedRiskySteps: number;
  riskyOrUncertainSteps: number;
  safeguardsLabel: string;
  safeguardsPct: number;
  safeguardsApplicable: boolean;
  designReadinessScore: number;
  score: number;
};

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function containsPlaceholderLabel(label: string) {
  const clean = label.trim().toLowerCase();
  return /^(new\s+(task|goal)|step\s*\d+|new\s+step)$/i.test(clean);
}

function isClearMainWorkflowStep(node: AdesNode) {
  return hasText(node.data.purpose || node.data.body) && hasText(node.data.inputs) && hasText(node.data.outputs) && hasText(node.data.completionCriteria) && hasText(node.data.whyThisStepExists);
}

function isVagueStep(node: AdesNode) {
  const text = [node.data.label, node.data.purpose, node.data.body, node.data.completionCriteria].join(" ").toLowerCase();
  return /analyze request|do the task|handle it|process data|improve output|execute workflow|perform task/.test(text);
}

function isMicroStep(node: AdesNode) {
  const text = [node.data.purpose, node.data.inputs, node.data.outputs].join(" ").trim();
  return text.length > 0 && text.length < 70;
}

function isRiskyOrUncertainStep(node: AdesNode) {
  const uncertaintySignals = [node.data.reasoningRequired, node.data.completionCriteria, node.data.body, node.data.purpose].join(" ").toLowerCase();
  return node.data.risks.length > 0 || node.data.stepType === "tool_use" || /uncertain|ambigu|confidence|risky|risk|escalat|policy|compliance/.test(uncertaintySignals);
}

function buildStepEvalMatcher(evalNodes: AdesNode[]) {
  return (step: AdesNode, predicate?: (evalNode: AdesNode) => boolean) =>
    evalNodes.some((evalNode) => {
      if (predicate && !predicate(evalNode)) return false;
      const relatedStepIds = evalNode.data.evals.flatMap((evalDefinition) => evalDefinition.relatedStepIds);
      const referencesStepId = relatedStepIds.includes(step.id);
      const referencesStepName = [evalNode.data.evalName, evalNode.data.evalQuestion, evalNode.data.body].join(" ").toLowerCase().includes(step.data.label.trim().toLowerCase());
      return referencesStepId || referencesStepName;
    });
}

function toCategoryReport(score: number, issues: string[], passThreshold: number): QualityCategoryReport {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    passed: clampedScore >= passThreshold,
    score: clampedScore,
    issues,
  };
}

export function analyzeBoardQuality(board: AdesBoardSnapshot | null): BoardQualityReport {
  if (!board?.nodes?.length) {
    const emptyCategory = { passed: false, score: 0, issues: ["No generated flow exists yet."] };
    return {
      workflowClarity: emptyCategory,
      decompositionQuality: emptyCategory,
      toolLogic: emptyCategory,
      reflectionFeedback: emptyCategory,
      evalReadiness: emptyCategory,
      overallScore: 0,
      weakestArea: "workflowClarity",
      issues: ["No generated flow exists yet."],
      totalMainWorkflowSteps: 0,
      clearWorkflowSteps: 0,
      workflowClarityLabel: "0/0",
      workflowClarityPct: 0,
      passedEvalChecks: 0,
      requiredEvalChecks: 6,
      evalReadinessLabel: "0/6",
      evalReadinessPct: 0,
      safeguardedRiskySteps: 0,
      riskyOrUncertainSteps: 0,
      safeguardsLabel: "0/0",
      safeguardsPct: 0,
      safeguardsApplicable: false,
      designReadinessScore: 0,
      score: 0,
    };
  }

  const mainSteps = board.nodes.filter(isMainStep);
  const evalNodes = board.nodes.filter((node) => node.type === "eval");
  const reflectionNodes = board.nodes.filter((node) => node.type === "reflection");
  const feedbackNodes = board.nodes.filter((node) => node.type === "feedback");
  const handoffSteps = mainSteps.filter((node) => node.type === "handoff");

  const clearWorkflowSteps = mainSteps.filter(isClearMainWorkflowStep).length;
  const unclearSteps = mainSteps.length - clearWorkflowSteps;
  const placeholderSteps = mainSteps.filter((node) => containsPlaceholderLabel(node.data.label));
  const workflowClarityIssues: string[] = [];
  if (unclearSteps > 0) workflowClarityIssues.push(`${unclearSteps} step(s) are missing purpose, inputs, outputs, success criteria, or step rationale.`);
  if (placeholderSteps.length > 0) workflowClarityIssues.push("Placeholder step names detected (e.g., New task, New goal, Step 1).");
  const workflowClarityPct = mainSteps.length ? Math.round((clearWorkflowSteps / mainSteps.length) * 100) : 0;
  const workflowClarity = toCategoryReport(workflowClarityPct - placeholderSteps.length * 15, workflowClarityIssues, 80);

  const vagueSteps = mainSteps.filter(isVagueStep).length;
  const microSteps = mainSteps.filter(isMicroStep).length;
  const stepCountPenalty = mainSteps.length < 5 ? (5 - mainSteps.length) * 10 : mainSteps.length > 9 ? (mainSteps.length - 9) * 8 : 0;
  const decompositionIssues: string[] = [];
  if (mainSteps.length < 5 || mainSteps.length > 9) decompositionIssues.push(`Workflow has ${mainSteps.length} main steps; target is usually 5–9 unless complexity clearly requires otherwise.`);
  if (vagueSteps > 0) decompositionIssues.push(`${vagueSteps} step(s) are overly broad/vague and should be split into concrete operations.`);
  if (microSteps > Math.ceil(mainSteps.length * 0.35)) decompositionIssues.push("Too many micro-steps detected; group tiny details into coherent operations.");
  const decompositionScore = 100 - stepCountPenalty - vagueSteps * 12 - Math.max(0, microSteps - Math.ceil(mainSteps.length * 0.35)) * 8;
  const decompositionQuality = toCategoryReport(decompositionScore, decompositionIssues, 75);

  const hasStepEval = buildStepEvalMatcher(evalNodes);
  const toolUseSteps = mainSteps.filter((node) => node.data.stepType === "tool_use" || node.data.tools.length > 0);
  const toolIssues: string[] = [];
  const badToolSteps = toolUseSteps.filter(
    (step) =>
      step.data.tools.length === 0 ||
      !hasText(step.data.inputs) ||
      !hasText(step.data.outputs) ||
      !hasText(step.data.reasoningRequired) ||
      !hasText(step.data.completionCriteria) ||
      step.data.commonFailureModes.length === 0,
  );
  if (badToolSteps.length > 0) {
    toolIssues.push(`${badToolSteps.length} tool-use step(s) are missing tool name/why/input/output/result handling or failure mode details.`);
  }
  const toolStepsHaveToolAccuracyEvals =
    toolUseSteps.length === 0 ||
    toolUseSteps.every((step) => hasStepEval(step, (evalNode) => evalNode.data.evalCategory === "tool_accuracy" || /tool/i.test(evalNode.data.evalQuestion)));
  if (!toolStepsHaveToolAccuracyEvals) toolIssues.push("Tool-use steps need tool-accuracy eval coverage.");
  const toolScoreBase = toolUseSteps.length === 0 ? 95 : 100;
  const toolLogic = toCategoryReport(toolScoreBase - badToolSteps.length * 20 - (toolStepsHaveToolAccuracyEvals ? 0 : 20), toolIssues, 75);

  const riskySteps = mainSteps.filter(isRiskyOrUncertainStep);
  const riskyOrUncertainSteps = riskySteps.length;
  const safeguardedRiskySteps = riskySteps.filter(
    (node) => node.data.reflectionHooks.length > 0 || node.data.feedbackHooks.length > 0 || node.type === "handoff" || /review|escalat|human/i.test(node.data.completionCriteria),
  ).length;
  const reflectionIssues: string[] = [];
  if (riskyOrUncertainSteps > safeguardedRiskySteps) reflectionIssues.push("Risky/uncertain steps are missing reflection, feedback, or justified handoff triggers.");
  const reflectionOverused = mainSteps.length > 0 && mainSteps.every((step) => step.data.reflectionHooks.length > 0);
  if (reflectionOverused) reflectionIssues.push("Reflection loops are attached to every step; only add them where quality risk or uncertainty exists.");
  const unjustifiedHandoffCount = handoffSteps.filter((step) => !/risk|safety|policy|compliance|confidence|uncertain|escalat/i.test([step.data.purpose, step.data.completionCriteria, step.data.body].join(" ").toLowerCase())).length;
  if (unjustifiedHandoffCount > 0) reflectionIssues.push("Human handoff appears without clear risk/compliance/confidence justification.");
  const safeguardsApplicable = riskyOrUncertainSteps > 0;
  const safeguardsPct = safeguardsApplicable ? Math.round((safeguardedRiskySteps / riskyOrUncertainSteps) * 100) : 0;
  if (!safeguardsApplicable) {
    reflectionIssues.push("No risky or uncertain steps were identified yet, so safeguards are currently not applicable.");
  }
  const reflectionFeedbackScore = safeguardsApplicable ? safeguardsPct - (reflectionOverused ? 20 : 0) - unjustifiedHandoffCount * 15 : 0;
  const reflectionFeedback = toCategoryReport(reflectionFeedbackScore, reflectionIssues, safeguardsApplicable ? 75 : 0);

  const hasEndToEndEval = evalNodes.some((node) => node.data.evalScope === "flow" && node.data.evalCategory === "task_success");
  const importantSteps = mainSteps.filter((step) => step.data.risks.length > 0 || step.data.stepType === "tool_use" || /critical|important|priority|high\s*risk/i.test(step.data.tags.join(" ")));
  const importantStepsHaveEvals = importantSteps.length === 0 || importantSteps.every((step) => hasStepEval(step));
  const riskExists = mainSteps.some((node) => node.data.risks.length > 0) || board.nodes.some((node) => node.type === "risk");
  const hasSafetyEval = !riskExists || evalNodes.some((node) => node.data.evalCategory === "safety" || /safety|compliance|policy/.test(node.data.evalName.toLowerCase()));
  const hasRobustnessEval = evalNodes.some((node) => node.data.evalCategory === "robustness" || /edge case|robust/.test(node.data.evalQuestion.toLowerCase()));
  const evalsHaveCoreDetails = evalNodes.length > 0 && evalNodes.every((node) => hasText(node.data.evalQuestion) && hasText(node.data.evalCriteria) && hasText(node.data.evalThreshold));
  const evalsHaveDatasetAndFailureExamples = evalNodes.length > 0 && evalNodes.every((node) => hasText(node.data.evalDataset) && /fail/i.test(node.data.evalMetric));

  const evalIssues: string[] = [];
  if (!hasEndToEndEval) evalIssues.push("Missing end-to-end task-success eval.");
  if (!importantStepsHaveEvals) evalIssues.push("Critical steps are missing step-level evals.");
  if (!toolStepsHaveToolAccuracyEvals) evalIssues.push("Tool-use steps are missing tool-accuracy evals.");
  if (!hasSafetyEval) evalIssues.push("Safety/compliance eval missing for risky flow.");
  if (!hasRobustnessEval) evalIssues.push("Robustness/edge-case eval missing.");
  if (!evalsHaveCoreDetails) evalIssues.push("Some evals are missing question, pass criteria, or threshold.");
  if (!evalsHaveDatasetAndFailureExamples) evalIssues.push("Some evals are missing dataset notes or failure examples.");

  const requiredEvalChecks = 7;
  const passedEvalChecks = requiredEvalChecks - evalIssues.length;
  const evalReadinessPct = Math.round((Math.max(0, passedEvalChecks) / requiredEvalChecks) * 100);
  const evalReadiness = toCategoryReport(evalReadinessPct, evalIssues, 80);

  const categoryEntries: Array<[QualityCategoryKey, QualityCategoryReport]> = [
    ["workflowClarity", workflowClarity],
    ["decompositionQuality", decompositionQuality],
    ["toolLogic", toolLogic],
    ["reflectionFeedback", reflectionFeedback],
    ["evalReadiness", evalReadiness],
  ];

  const userFacingWorkflowClarity = Math.round((workflowClarity.score * 0.5) + (decompositionQuality.score * 0.25) + (toolLogic.score * 0.25));
  const userFacingSafeguards = safeguardsApplicable ? reflectionFeedback.score : 0;
  const readinessWeights = safeguardsApplicable
    ? ({ workflow: 0.4, eval: 0.4, safeguards: 0.2 } as const)
    : ({ workflow: 0.5, eval: 0.5, safeguards: 0 } as const);
  const overallScore = Math.round(
    userFacingWorkflowClarity * readinessWeights.workflow +
      evalReadiness.score * readinessWeights.eval +
      userFacingSafeguards * readinessWeights.safeguards,
  );
  const weakestArea = categoryEntries.reduce((lowest, current) => (current[1].score < lowest[1].score ? current : lowest))[0];
  const issues = categoryEntries.flatMap(([, report]) => report.issues);

  return {
    workflowClarity,
    decompositionQuality,
    toolLogic,
    reflectionFeedback,
    evalReadiness,
    overallScore,
    weakestArea,
    issues,
    totalMainWorkflowSteps: mainSteps.length,
    clearWorkflowSteps,
    workflowClarityLabel: `${userFacingWorkflowClarity}/100`,
    workflowClarityPct: userFacingWorkflowClarity,
    passedEvalChecks: Math.max(0, passedEvalChecks),
    requiredEvalChecks,
    evalReadinessLabel: `${evalReadiness.score}/100`,
    evalReadinessPct: evalReadiness.score,
    safeguardedRiskySteps,
    riskyOrUncertainSteps,
    safeguardsLabel: safeguardsApplicable ? `${userFacingSafeguards}/100` : "N/A",
    safeguardsPct: userFacingSafeguards,
    safeguardsApplicable,
    designReadinessScore: overallScore,
    score: overallScore,
  };
}
