import { readClaudePrompt } from '../src/lib/claudePromptReader';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'THOR_READ_PROMPT') {
        sendResponse({ text: readClaudePrompt() });
      }
      return true;
    });
  }
});
