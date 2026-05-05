import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'THOR Prompt Scanner',
    description: 'Local token-waste scan for Claude prompts.',
    version: '0.1.0',
    permissions: ['activeTab'],
    host_permissions: ['https://claude.ai/*'],
    action: {
      default_title: 'THOR Scanner'
    }
  }
});
