const isVisible = (element: Element): boolean => {
  const style = window.getComputedStyle(element as HTMLElement);
  const rect = (element as HTMLElement).getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
};

const readFromElement = (element: Element): string => {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value.trim();
  }
  return (element.textContent || '').trim();
};

const candidateSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '.ProseMirror',
  '[role="textbox"]',
  'div[aria-label*="prompt" i]'
];

export const readClaudePrompt = (): string => {
  const visited = new Set<Element>();
  const candidates: Element[] = [];

  for (const selector of candidateSelectors) {
    document.querySelectorAll(selector).forEach((el) => {
      if (!visited.has(el) && isVisible(el)) {
        visited.add(el);
        candidates.push(el);
      }
    });
  }

  const scored = candidates
    .map((element) => {
      const text = readFromElement(element);
      const role = element.getAttribute('role') || '';
      const aria = (element.getAttribute('aria-label') || '').toLowerCase();
      let score = text.length;
      if (role === 'textbox') score += 80;
      if (aria.includes('message') || aria.includes('prompt')) score += 80;
      if (element.matches('textarea')) score += 100;
      return { text, score };
    })
    .filter((entry) => entry.text.length > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.text ?? '';
};
