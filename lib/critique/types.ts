export type CritiqueSeverity = "low" | "medium" | "high";

export type CritiqueItem = {
  id: string;
  severity: CritiqueSeverity;
  message: string;
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
  critiqueItems: CritiqueItem[];
  missingReflections: CritiqueSuggestion[];
  missingEvals: CritiqueSuggestion[];
  missingBusinessMetrics: CritiqueSuggestion[];
};
