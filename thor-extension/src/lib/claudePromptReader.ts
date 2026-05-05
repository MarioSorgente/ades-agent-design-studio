const CANDIDATE_SELECTORS = [
  'textarea',
  '[contenteditable="true"]',
  '.ProseMirror',
  '[role="textbox"]'
] as const;

const isVisible = (el: Element): boolean => {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
};

const cleanText = (text: string): string =>
  text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const readElementText = (el: Element): string => {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }

  return el.textContent ?? '';
};

export const readClaudePrompt = (doc: Document): string => {
  for (const selector of CANDIDATE_SELECTORS) {
    const elements = Array.from(doc.querySelectorAll(selector)).filter(isVisible);

    for (const el of elements) {
      const text = cleanText(readElementText(el));
      if (text.length >= 8) {
        return text;
      }
    }
  }

  return '';
};
