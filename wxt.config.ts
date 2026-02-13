import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  outDir: 'build',
  manifest: {
    name: 'Copytree',
    description: 'Click any element to copy its component ancestor path (React, Vue, Angular, Svelte)',
    permissions: ['activeTab', 'storage'],
    web_accessible_resources: [
      {
        resources: ['component-reader.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
