import { describe, expect, it } from 'vitest';
import { analyzePrompt, detectHugePrompt, detectRepeatedParagraphs, estimateTokens } from '../src/lib/analyzePrompt';

describe('analyzePrompt utils', () => {
  it('estimates tokens using char/4', () => {
    expect(estimateTokens('12345678')).toBe(2);
  });

  it('detects repeated paragraphs', () => {
    const text = 'A long paragraph with enough context.\n\nA long paragraph with enough context.';
    expect(detectRepeatedParagraphs(text).repeatedParagraphs.length).toBe(1);
  });

  it('flags huge prompts', () => {
    expect(detectHugePrompt('a'.repeat(12000))).toBe('warn');
    expect(detectHugePrompt('a'.repeat(22000))).toBe('high');
  });

  it('returns high waste for repeated and unstructured prompt', () => {
    const text = `${'x'.repeat(13000)}\n\n${'x'.repeat(13000)}`;
    expect(analyzePrompt(text).wasteLevel).toBe('high');
  });
});
