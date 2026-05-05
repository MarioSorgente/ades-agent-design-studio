import { readClaudePrompt } from '../src/lib/claudePromptReader';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'THOR_READ_PROMPT') {
        return;
      }

      const promptText = readClaudePrompt(document);
      sendResponse({ promptText });
    });
  }
});
