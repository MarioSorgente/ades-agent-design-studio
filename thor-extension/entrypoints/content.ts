import { browser } from 'wxt/browser';
import { readClaudePrompt } from '../src/lib/claudePromptReader';

interface ThorReadPromptMessage {
  type: 'THOR_READ_PROMPT';
}

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      const typedMessage = message as Partial<ThorReadPromptMessage>;
      if (typedMessage.type === 'THOR_READ_PROMPT') {
        return Promise.resolve({ text: readClaudePrompt() });
      }
      return undefined;
    });
  }
});
