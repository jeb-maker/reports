import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Reports',
      formats: ['es', 'iife', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'reports.esm.js';
        if (format === 'iife') return 'reports.min.js';
        return 'reports.umd.cjs';
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        exports: 'named',
      },
    },
  },
  server: {
    open: '/demo/index.html',
  },
});
