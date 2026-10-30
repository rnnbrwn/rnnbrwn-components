import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const scssDir = fileURLToPath(new URL('./scss', import.meta.url));

// The site's GraphQL address: from the environment (CI), or else the site's .env (local).
// import.meta.env doesn't exist yet at this point.
function graphqlUrl(root) {
  if (process.env.GRAPHQL_URL) return process.env.GRAPHQL_URL;
  try {
    return parseEnv(readFileSync(new URL('.env', root), 'utf8')).GRAPHQL_URL;
  } catch {
    return undefined;
  }
}

// The two halves of the library have to be the same version: the CMS's fields (pinned by
// "components" in rnnbrwn-cms/sites.json) and these Astro components (pinned by the site's
// package.json). Stop the build if they aren't; a failed build leaves the last good deploy live.
async function checkCmsVersion(root) {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  const url = graphqlUrl(root);
  if (!url) throw new Error('@rnnbrwn/components: GRAPHQL_URL is not set, so the CMS version can\'t be checked.');

  let body;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ rnnbrwnComponents { version } }' }),
    });
    body = await response.json();
  } catch (error) {
    throw new Error(`@rnnbrwn/components: couldn't read the components version from the CMS at ${url} (${error.message}).`);
  }

  const cmsVersion = body?.data?.rnnbrwnComponents?.version;
  if (!cmsVersion) {
    throw new Error(
      `@rnnbrwn/components: the CMS at ${url} has no components plugin. ` +
        `Add "components": "v${version}" to this site in rnnbrwn-cms/sites.json and deploy the CMS.`
    );
  }
  if (cmsVersion !== version) {
    throw new Error(
      `@rnnbrwn/components: the CMS has components v${cmsVersion} but this site has v${version}. ` +
        'Use the same tag in both: "components" in rnnbrwn-cms/sites.json (then deploy the CMS first) and this site\'s package.json.'
    );
  }
}

/**
 * Astro integration for the shared components. In a site's astro.config.mjs:
 *
 *   import rnnbrwnComponents from '@rnnbrwn/components';
 *   export default defineConfig({ integrations: [rnnbrwnComponents()] });
 *
 * It lets any style in the site `@use 'tools' as *;` and `@use 'rnnbrwn-global';`,
 * and lets Vite compile the library's .astro/.ts files, including when it's linked
 * from platform/rnnbrwn-components with `npm link` during development. On `astro build`
 * it also stops the build if the CMS has a different version of the library.
 */
export default function rnnbrwnComponents() {
  return {
    name: '@rnnbrwn/components',
    hooks: {
      'astro:config:setup': async ({ config, command, updateConfig }) => {
        if (command === 'build') await checkCmsVersion(config.root);
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
