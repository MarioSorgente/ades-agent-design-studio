import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  extensionApi: 'chrome',
  manifest: {
    name: 'THOR Prompt Scanner',
    description: 'Local prompt waste scan for Claude prompts.',
    version: '0.1.0',
    manifest_version: 3,
    permissions: ['tabs', 'activeTab'],
    host_permissions: ['https://claude.ai/*'],
    action: {
      default_title: 'THOR Prompt Scanner',
      default_popup: 'popup/index.html'
    },
    icons: {
      '16': 'src/assets/icon.svg',
      '32': 'src/assets/icon.svg',
      '48': 'src/assets/icon.svg',
      '128': 'src/assets/icon.svg'
    }
  }
});
