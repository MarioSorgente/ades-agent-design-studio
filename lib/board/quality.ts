import type { AdesBoardSnapshot, AdesNode } from "@/lib/board/types";

export type BoardQualityReport = {
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
  designReadinessScore: number;
  score: number;
  weakestArea: string;
  issues: string[];
};

function isMainStep(node: AdesNode) {
  return node.type === "goal" || node.type === "task" || node.type === "handoff";
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function isClearMainWorkflowStep(node: AdesNode) {
  return hasText(node.data.purpose || node.data.body) && hasText(node.data.inputs) && hasText(node.data.outputs) && hasText(node.data.completionCriteria);
}

function isImportantOrCriticalStep(node: AdesNode) {
  const tagsText = node.data.tags.join(" ").toLowerCase();
  return (
    /important|critical|high[-\s]?risk|priority/.test(tagsText) ||
    node.data.risks.length > 0 ||
    node.data.stepType === "tool_use" ||
    node.type === "handoff"
  );
}

function isRiskyOrUncertainStep(node: AdesNode) {
  const uncertaintySignals = [node.data.reasoningRequired, node.data.completionCriteria, node.data.body, node.data.purpose].join(" ").toLowerCase();
  return (
    node.data.risks.length > 0 ||
    node.data.stepType === "tool_use" ||
    /uncertain|ambigu|confidence|risky|risk|escalat/.test(uncertaintySignals)
  );
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

export function analyzeBoardQuality(board: AdesBoardSnapshot | null): BoardQualityReport {
  if (!board?.nodes?.length) {
    return {
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
      safeguardsPct: 100,
      designReadinessScore: 0,
      score: 0,
      weakestArea: "No flow yet.",
      issues: ["No generated flow exists yet."],
    };
  }

  const mainSteps = board.nodes.filter(isMainStep);
  const evalNodes = board.nodes.filter((node) => node.type === "eval");
  const reflectionNodes = board.nodes.filter((node) => node.type === "reflection");
  const feedbackNodes = board.nodes.filter((node) => node.type === "feedback");
  const handoffSteps = mainSteps.filter((node) => node.type === "handoff");

  const clearWorkflowSteps = mainSteps.filter(isClearMainWorkflowStep).length;
  const workflowClarityPct = mainSteps.length ? Math.round((clearWorkflowSteps / mainSteps.length) * 100) : 0;

  const hasStepEval = buildStepEvalMatcher(evalNodes);
  const hasEndToEndEval = evalNodes.some(
    (node) => node.data.evalScope === "flow" && (node.data.evalCategory === "task_success" || /end[-\s]?to[-\s]?end|overall|task success/i.test(node.data.evalName)),
  );

  const importantSteps = mainSteps.filter(isImportantOrCriticalStep);
  const importantStepsHaveEvals = importantSteps.length === 0 || importantSteps.every((step) => hasStepEval(step));

  const toolUseSteps = mainSteps.filter((node) => node.data.stepType === "tool_use" || node.data.tools.length > 0);
  const toolUseStepsHaveToolAccuracyEvals =
    toolUseSteps.length === 0 ||
    toolUseSteps.every((step) => hasStepEval(step, (evalNode) => evalNode.data.evalCategory === "tool_accuracy" || /tool/i.test(evalNode.data.evalMetric)));

  const riskExists = mainSteps.some((node) => node.data.risks.length > 0) || board.nodes.some((node) => node.type === "risk");
  const hasSafetyEval = !riskExists || evalNodes.some((node) => node.data.evalCategory === "safety" || /safety|compliance|policy|guardrail/i.test(node.data.evalName));

  const evalsHaveQuestionAndPassCriteria = evalNodes.length > 0 && evalNodes.every((node) => hasText(node.data.evalQuestion) && hasText(node.data.evalCriteria));

  const evalsHaveThresholdDatasetOrFailureExamples =
    evalNodes.length > 0 &&
    evalNodes.every((node) => {
      const evalDetails = [node.data.evalThreshold, node.data.evalDataset, node.data.body].join(" ").toLowerCase();
      return hasText(node.data.evalThreshold) || hasText(node.data.evalDataset) || /failure/.test(evalDetails);
    });

  const evalChecks = [
    { passed: hasEndToEndEval, issue: "Weakest area: missing end-to-end task success eval." },
    { passed: importantStepsHaveEvals, issue: "Weakest area: important or critical step has no eval." },
    { passed: toolUseStepsHaveToolAccuracyEvals, issue: "Weakest area: tool-use step has no eval." },
    { passed: hasSafetyEval, issue: "Weakest area: safety/compliance eval missing." },
    { passed: evalsHaveQuestionAndPassCriteria, issue: "Weakest area: evals need clear question and pass criteria." },
    { passed: evalsHaveThresholdDatasetOrFailureExamples, issue: "Weakest area: evals need threshold, dataset notes, or failure examples." },
  ];

  const passedEvalChecks = evalChecks.filter((check) => check.passed).length;
  const requiredEvalChecks = evalChecks.length;
  const evalReadinessPct = Math.round((passedEvalChecks / requiredEvalChecks) * 100);

  const riskyOrUncertainSteps = mainSteps.filter(isRiskyOrUncertainStep).length;
  const safeguardedInline = mainSteps.filter(
    (node) => node.data.reflectionHooks.length > 0 || node.data.feedbackHooks.length > 0 || hasText(node.data.confidenceCheck) || /escalat|review|human/i.test(node.data.completionCriteria),
  ).length;
  const safeguardSupportNodes = reflectionNodes.length + feedbackNodes.length + handoffSteps.length;

  const safeguardedRiskySteps = riskyOrUncertainSteps === 0 ? 0 : Math.min(riskyOrUncertainSteps, safeguardedInline + safeguardSupportNodes);
  const safeguardsPct = riskyOrUncertainSteps === 0 ? 100 : Math.round((safeguardedRiskySteps / riskyOrUncertainSteps) * 100);

  const designReadinessScore = Math.max(0, Math.min(100, Math.round(workflowClarityPct * 0.4 + evalReadinessPct * 0.4 + safeguardsPct * 0.2)));

  const issues: string[] = [];

  const unclearSteps = mainSteps.length - clearWorkflowSteps;
  if (unclearSteps > 0) {
    issues.push(
      unclearSteps === 1
        ? "Weakest area: one step has unclear purpose, input, output, or success condition."
        : `Weakest area: ${unclearSteps} steps have unclear purpose, input, output, or success condition.`,
    );
  }

  evalChecks.forEach((check) => {
    if (!check.passed) issues.push(check.issue);
  });

  if (riskyOrUncertainSteps > safeguardedRiskySteps) {
    issues.push("Weakest area: risky step has no safeguard.");
  }

  const weakestArea = issues[0] ?? "Weakest area: none. Design is ready to test.";

  return {
    totalMainWorkflowSteps: mainSteps.length,
    clearWorkflowSteps,
    workflowClarityLabel: `${clearWorkflowSteps}/${mainSteps.length}`,
    workflowClarityPct,
    passedEvalChecks,
    requiredEvalChecks,
    evalReadinessLabel: `${passedEvalChecks}/${requiredEvalChecks}`,
    evalReadinessPct,
    safeguardedRiskySteps,
    riskyOrUncertainSteps,
    safeguardsLabel: `${safeguardedRiskySteps}/${riskyOrUncertainSteps}`,
    safeguardsPct,
    designReadinessScore,
    score: designReadinessScore,
    weakestArea,
    issues,
  };
}
