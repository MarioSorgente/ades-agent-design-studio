export type WasteLevel = 'low' | 'medium' | 'high';

export interface PromptAnalysis {
  estimatedTokens: number;
  wasteLevel: WasteLevel;
  issues: string[];
  suggestion: string;
}

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const detectRepeatedParagraphs = (text: string): string[] => {
  const issues: string[] = [];
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const paragraph of paragraphs) {
    if (seen.has(paragraph)) {
      duplicates.add(paragraph);
    }
    seen.add(paragraph);
  }

  const longLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 80);
  const uniqueLongLines = new Set(longLines);

  if (duplicates.size > 0) {
    issues.push('Repeated context detected');
  }

  if (longLines.length - uniqueLongLines.size >= 2) {
    issues.push('Repeated long lines detected');
  }

  return issues;
};

export const detectHugePrompt = (text: string): string | null => {
  const tokens = estimateTokens(text);
  if (tokens > 5000) return 'Huge prompt (high token load)';
  if (tokens > 2500) return 'Large prompt';
  return null;
};

export const detectMissingStructure = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const checks = [
    { label: 'task/request', regex: /(task|request|goal|please|build|create|write)/ },
    { label: 'context/background', regex: /(context|background|about|current state|situation)/ },
    { label: 'constraints/requirements', regex: /(constraint|requirement|must|should|limit|avoid)/ },
    { label: 'output format', regex: /(format|return|output|json|markdown|table|bullet)/ }
  ];

  return checks.filter((item) => !item.regex.test(normalized)).map((item) => `Missing ${item.label}`);
};

export const estimateWasteLevel = (text: string): WasteLevel => {
  const tokenCount = estimateTokens(text);
  const repeatedCount = detectRepeatedParagraphs(text).length;
  const missingCount = detectMissingStructure(text).length;

  let score = 0;
  if (tokenCount > 5000) score += 3;
  else if (tokenCount > 2500) score += 2;
  else if (tokenCount > 1200) score += 1;

  score += repeatedCount;
  score += missingCount >= 3 ? 2 : missingCount >= 1 ? 1 : 0;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
};

export const analyzePrompt = (text: string): PromptAnalysis => {
  const estimatedTokens = estimateTokens(text);
  const issues = [
    detectHugePrompt(text),
    ...detectRepeatedParagraphs(text),
    ...detectMissingStructure(text)
  ].filter((issue): issue is string => Boolean(issue));

  const wasteLevel = estimateWasteLevel(text);
  const suggestion =
    wasteLevel === 'high'
      ? 'Trim repeated context and tighten requirements before sending.'
      : wasteLevel === 'medium'
        ? 'Clean repeated context before sending.'
        : 'Prompt looks efficient. Keep structure clear and concise.';

  return { estimatedTokens, wasteLevel, issues, suggestion };
};
