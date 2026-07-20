import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const adapterEntries = {
  'adapters/webhook': resolve(__dirname, 'src/adapters/webhook.js'),
  'adapters/slack': resolve(__dirname, 'src/adapters/slack.js'),
  'adapters/github': resolve(__dirname, 'src/adapters/github.js'),
  'adapters/jira': resolve(__dirname, 'src/adapters/jira.js'),
  'adapters/redmine': resolve(__dirname, 'src/adapters/redmine.js'),
  'adapters/gitlab': resolve(__dirname, 'src/adapters/gitlab.js'),
  'adapters/linear': resolve(__dirname, 'src/adapters/linear.js'),
  'adapters/azure-devops': resolve(__dirname, 'src/adapters/azure-devops.js'),
};

export default defineConfig({
  build: {
    lib: {
      entry: {
        reports: resolve(__dirname, 'src/index.js'),
        core: resolve(__dirname, 'src/core.js'),
        ...adapterEntries,
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        exports: 'named',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
  server: {
    open: '/demo/index.html',
  },
});
