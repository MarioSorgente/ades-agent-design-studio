export type CritiqueSeverity = "low" | "medium" | "high";
export type ReadinessDimension =
  | "workflow_clarity"
  | "decomposition_quality"
  | "reflection_logic"
  | "eval_coverage"
  | "safeguard_coverage"
  | "handoff_readiness";

export type CritiqueItem = {
  id: string;
  severity: CritiqueSeverity;
  message: string;
  whyItMatters: string;
  affectedDimensions: ReadinessDimension[];
  recommendation: string;
};

export type CritiqueSuggestion = {
  id: string;
  type: "reflection" | "eval" | "business_metric";
  title: string;
  body: string;
};

export type CritiqueResult = {
  summary: string;
  categoryReviews: Array<{
    category: "workflowClarity" | "decompositionQuality" | "toolLogic" | "reflectionFeedback" | "evalReadiness";
    verdict: "pass" | "needs_work";
    finding: string;
    recommendation: string;
  }>;
  critiqueItems: CritiqueItem[];
  missingReflections: CritiqueSuggestion[];
  missingEvals: CritiqueSuggestion[];
  missingBusinessMetrics: CritiqueSuggestion[];
};
