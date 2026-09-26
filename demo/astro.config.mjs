import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// loadPaths lets any style do `@use 'tools' as *;` or `@use 'global';`,
// the same way a site will once it installs the library.
export default defineConfig({
  vite: {
    css: {
      preprocessorOptions: {
        scss: { loadPaths: [fileURLToPath(new URL('../scss', import.meta.url))] },
      },
    },
  },
});
