# rnnbrwn-components

Shared layout system (Sass) and Astro components for every RNNBRWN site. Each component has two halves with the same name:

| | Where | Example |
|---|---|---|
| WordPress fields (ACF) | `rnnbrwn-themes/rnnbrwn-base/sections/components/` | `card-grid.php` → layout `card_grid` |
| Astro + Sass | `src/components/` here, listed in `src/registry.ts` | `CardGrid.astro` |

In GraphQL each one is `PageSectionsSections<Name>Layout` on `page.pageSections.sections`.

## Components
| Component | ACF layout | What it's for |
|---|---|---|
| Rich Text | `rich_text` | An optional heading and editor text: paragraphs, subheadings, lists, quotes, links |
| Placeholder | `placeholder` | Testing only: a box showing its own settings. Never switch it on for a real site |

### Site components
Not page sections: they appear on every page and are edited on their own page in wp-admin. Switch each on in the site's `rnnbrwn_sections` filter.

| Component | Switch on with | Edited in | What it's for |
|---|---|---|---|
| Navigation | `'navigation' => true` | wp-admin → Navigation | The site header: logo (plus an optional one for dark backgrounds) or the site title, and the main links, behind a menu button below the `md` breakpoint |

Navigation's links come from either a **WordPress menu** (Appearance → Menus, "Main navigation" location; top-level items only for now) or, for one-page sites, **sections picked by their Anchor ID**. In Astro, add `NAVIGATION_QUERY` to the page's query and put it first in `<body>`; the page's `<main>` needs `id="main"` for its "Skip to content" link:

```astro
<Navigation data={data} cmsUrl={import.meta.env.GRAPHQL_URL} />
<main id="main" class="l-page">...</main>
```

Editor text in any component uses `rs_editor()` in WordPress (a trimmed toolbar: subheadings, bold, italic, lists, quote, link; pasted text arrives as plain text) and `<div class="prose" set:html={editorHtml(html, cmsUrl)} />` in Astro, which styles it and turns links to the CMS's own pages into site links.

## Using it in a site
1. Install: `npm install github:rnnbrwn/rnnbrwn-components#<version>` (while developing: `npm install ../../platform/rnnbrwn-components`, which links the local folder).
2. `astro.config.mjs`: `import rnnbrwnComponents from '@rnnbrwn/components';` and add `rnnbrwnComponents()` to `integrations`.
3. Global stylesheet: `@use 'rnnbrwn-global';` then set the site's brand colours (see below).
4. WordPress (child theme `functions.php`): `add_filter('rnnbrwn_sections', fn () => ['components' => [...], 'pages' => 'all', 'surface' => 'light']);`
5. Query and render, listing the same components as step 4:
   ```astro
   ---
   import Sections from '@rnnbrwn/components/Sections.astro';
   import { pageQuery, pageSurface } from '@rnnbrwn/components/graphql';
   const data = await query(`{ page(id: "/about/", idType: URI) { ${pageQuery(['hero'])} } }`);
   ---
   <body class={`surface-${pageSurface(data.page)}`}>
     <main class="l-page"><Sections sections={data.page.pageSections.sections} cmsUrl={import.meta.env.GRAPHQL_URL} /></main>
   </body>
   ```

## Colours: four surfaces on every site, each site's own brand colours
There are four **surfaces** (colour schemes), the same on every site: `surface-light`, `surface-subtle`, `surface-accent` and `surface-dark`. A site only sets its brand colours; the library builds the surfaces from them:

```scss
@use 'rnnbrwn-global';

:root {
  --brand-light: #fffcff;      // the Light surface, and text on Dark
  --brand-subtle: #fece00;     // the Subtle surface
  --brand-dark: #292f36;       // text on Light, and the Dark surface
  --brand-accent: #e50053;     // the Accent surface, links and buttons
  --brand-on-accent: #fffcff;  // text on the accent colour
  // Optional: the accent on the Dark surface. By default it's a lighter tint of the
  // accent (60% accent, 40% light) with dark text on buttons, so links stay readable.
  // --brand-accent-on-dark: #ff5c93;
  // --brand-on-accent-on-dark: #292f36;
}
```

**The page's surface** is set per page in WordPress, in the **Page settings** box in the edit screen's sidebar. It defaults to the site's usual surface (`'surface'` in the site's `rnnbrwn_sections` filter). The frontend puts it on `<body>`:

```astro
---
import { pageQuery, pageSurface } from '@rnnbrwn/components/graphql';
const { page } = await query(`{ page(id: "/about/", idType: URI) { ${pageQuery(['rich_text'])} } }`);
---
<body class={`surface-${pageSurface(page)}`}>
```

**A section's surface** is its **Background** setting. The default, **Same as the page**, follows the page, so changing a page's surface changes every section left on the default. Picking one of the four colours makes the section a panel, unless it matches the page or the section is full width. A panel is only painted behind the section (reaching out into the gutter, and pulled in slightly top and bottom so two panels in a row have a gap), so changing a section's background never moves or resizes anything. Any other element can take a surface class too.

**Components never use `--brand-*`.** They use the colour **roles**, which every surface redefines for everything inside it, so a component works on any surface without knowing which one it's on: `--color-bg`, `--color-text`, `--color-muted`, `--color-border`, `--color-card` (cards, inputs), `--color-accent` and `--color-on-accent` (buttons). Muted, border and card are mixed from text and background automatically. Each site has to pick brand colours with enough contrast: check them with the test page's preview switches.

## Sass structure (`scss/`)
- `settings/` values only: breakpoints, container sizes, width lanes, type and spacing scales, default brand colours. All `!default`.
- `tools/` mixins and functions: `mq()`, `cq()`, `fluid()`, `type-scale()`, `space-scale()`, token mixins. Outputs no CSS; components use `@use 'tools' as *;`.
- `base/`, `layout/` global CSS: surfaces and panels, reset and typography, the `.l-page` grid, section spacing, `.l-stack`, `.l-cluster`.
- `rnnbrwn-global.scss` outputs all global CSS and the `:root` custom properties, once per site.

## Accessibility and motion
- Keyboard focus always shows an outline (`:focus-visible`, in the surface's accent).
- `.visually-hidden` hides text visually but keeps it for screen readers; `.visually-hidden-focusable` appears on focus (skip links).
- Tap targets are at least `var(--tap-target)` (44px).
- Animations use `var(--duration-fast|base)` and `var(--ease-out)`; these become 0 for people who ask for reduced motion, so use them for every transition.
- Images that can't recolour can be shown per surface with `display: var(--display-if-light)` / `var(--display-if-dark)`.

## Rules for components
1. No raw px, hex or rem values: use `var(--space-*)`, `var(--step-*)`, `var(--color-*)` (roles, never `--brand-*`), `var(--radius-*)`.
2. Never set your own width. Wrap the component in `<Section section={section}>`, which places it in the lane chosen in WordPress and applies spacing, surface and anchor.
3. Page-level layout uses `mq()`; layout inside a component uses `cq()` (the element being measured gets `container-type: inline-size`).
4. A repeater field needs a name unique across all components (`card_grid_items`, not `items`).

## Adding a component
1. `rnnbrwn-base/sections/components/<name>.php` returning `rs_layout(...)` (see `placeholder.php`).
2. `src/components/<Name>.astro` wrapped in `<Section>`, plus its entry in `src/registry.ts`.
3. Test rows in `showcase/seed.php`, switch it on for rnnbrwn.xyz (theme filter + `ENABLED` in `src/pages/components.astro`), re-run the seed and check rnnbrwn.xyz/components.

## Test page and demo
- `showcase/seed.php` creates the "components" WordPress page shown at rnnbrwn.xyz/components (run instructions in the file).
- `demo/` is a standalone page for comparing type and spacing presets: `cd demo && npm install && npm run dev`.
