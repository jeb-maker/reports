import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** IIFE / UMD full bundle for <script> tags (all adapters included). */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Reports',
      formats: ['iife', 'umd'],
      fileName: (format) => (format === 'iife' ? 'reports.min.js' : 'reports.umd.cjs'),
    },
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        exports: 'named',
        inlineDynamicImports: true,
      },
    },
  },
});
