import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const scssDir = fileURLToPath(new URL('./scss', import.meta.url));

/**
 * Astro integration for the shared components. In a site's astro.config.mjs:
 *
 *   import rnnbrwnComponents from '@rnnbrwn/components';
 *   export default defineConfig({ integrations: [rnnbrwnComponents()] });
 *
 * It lets any style in the site `@use 'tools' as *;` and `@use 'rnnbrwn-global';`,
 * and lets Vite compile the library's .astro/.ts files, including when it's linked
 * from platform/rnnbrwn-components with `npm link` during development.
 */
export default function rnnbrwnComponents() {
  return {
    name: '@rnnbrwn/components',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        updateConfig({
          vite: {
            css: { preprocessorOptions: { scss: { loadPaths: [scssDir] } } },
            ssr: { noExternal: ['@rnnbrwn/components'] },
            // A linked library lives outside the site folder; allow the dev server to read it.
            server: { fs: { allow: [fileURLToPath(config.root), packageRoot] } },
          },
        });
      },
    },
  };
}
