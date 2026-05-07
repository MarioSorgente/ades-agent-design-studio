export type WasteLevel = 'low' | 'medium' | 'high';

export interface StructureCheck {
  hasTask: boolean;
  hasContext: boolean;
  hasConstraints: boolean;
  hasOutputFormat: boolean;
}

export interface PromptAnalysis {
  estimatedTokens: number;
  wasteLevel: WasteLevel;
  repeatedParagraphs: string[];
  repeatedLongLines: string[];
  hugePromptWarning: 'none' | 'warn' | 'high';
  missingStructure: string[];
  issues: string[];
  suggestion: string;
}

export const estimateTokens = (text: string): number => Math.ceil(text.trim().length / 4);

export const detectRepeatedParagraphs = (text: string) => {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const paragraphMap = new Map<string, number>();
  const repeatedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const count = (paragraphMap.get(paragraph) ?? 0) + 1;
    paragraphMap.set(paragraph, count);
    if (count === 2) repeatedParagraphs.push(paragraph);
  }

  const longLines = text.split('\n').map((line) => line.trim()).filter((line) => line.length >= 120);
  const lineMap = new Map<string, number>();
  const repeatedLongLines: string[] = [];
  for (const line of longLines) {
    const count = (lineMap.get(line) ?? 0) + 1;
    lineMap.set(line, count);
    if (count === 2) repeatedLongLines.push(line);
  }

  return { repeatedParagraphs, repeatedLongLines };
};

export const detectHugePrompt = (text: string): 'none' | 'warn' | 'high' => {
  const tokens = estimateTokens(text);
  if (tokens > 5000) return 'high';
  if (tokens > 2500) return 'warn';
  return 'none';
};

export const detectMissingStructure = (text: string): StructureCheck => {
  const lower = text.toLowerCase();
  return {
    hasTask: /(task|please|build|write|create|analyze|help me|i need)/.test(lower),
    hasContext: /(context|background|about|current|situation|project)/.test(lower),
    hasConstraints: /(constraint|requirement|must|should|limit|avoid|do not)/.test(lower),
    hasOutputFormat: /(format|output|return|json|table|bullet|markdown|steps)/.test(lower)
  };
};

export const estimateWasteLevel = (text: string): WasteLevel => {
  const hugeLevel = detectHugePrompt(text);
  const repeats = detectRepeatedParagraphs(text);
  const structure = detectMissingStructure(text);
  const missingCount = Object.values(structure).filter((hasIt) => !hasIt).length;

  let score = 0;
  if (hugeLevel === 'warn') score += 2;
  if (hugeLevel === 'high') score += 4;
  score += repeats.repeatedParagraphs.length > 0 ? 2 : 0;
  score += repeats.repeatedLongLines.length > 0 ? 1 : 0;
  score += missingCount;

  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
};

export const analyzePrompt = (text: string): PromptAnalysis => {
  const estimatedTokens = estimateTokens(text);
  const hugePromptWarning = detectHugePrompt(text);
  const { repeatedParagraphs, repeatedLongLines } = detectRepeatedParagraphs(text);
  const structure = detectMissingStructure(text);
  const missingStructure = Object.entries(structure)
    .filter(([, hasIt]) => !hasIt)
    .map(([key]) => key.replace('has', 'Missing '));

  const issues: string[] = [];
  if (hugePromptWarning === 'warn' || hugePromptWarning === 'high') issues.push('Large prompt');
  if (repeatedParagraphs.length || repeatedLongLines.length) issues.push('Repeated context detected');
  if (missingStructure.length) issues.push(...missingStructure);

  const wasteLevel = estimateWasteLevel(text);
  const suggestion = repeatedParagraphs.length || repeatedLongLines.length
    ? 'Clean repeated context before sending.'
    : missingStructure.length
      ? 'Add missing structure sections for clearer output.'
      : hugePromptWarning !== 'none'
        ? 'Trim redundant details and keep only essential context.'
        : 'Prompt looks healthy. Keep it concise.';

  return { estimatedTokens, wasteLevel, repeatedParagraphs, repeatedLongLines, hugePromptWarning, missingStructure, issues, suggestion };
};
