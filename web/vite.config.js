import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy_policy: resolve(import.meta.dirname, 'privacy_policy.html'),
        terms_of_use: resolve(import.meta.dirname, 'terms_of_use.html'),
      },
    },
  },
});
