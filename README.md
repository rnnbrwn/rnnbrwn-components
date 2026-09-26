# rnnbrwn-components

Shared layout system (Sass) and Astro components for every RNNBRWN site. Each component has two halves with the same name:

| | Where | Example |
|---|---|---|
| WordPress fields (ACF) | `rnnbrwn-themes/rnnbrwn-base/sections/components/` | `card-grid.php` → layout `card_grid` |
| Astro + Sass | `src/components/` here, listed in `src/registry.ts` | `CardGrid.astro` |

In GraphQL each one is `PageSectionsSections<Name>Layout` on `page.pageSections.sections`.

## Components
Components come in two kinds. **Sections** are what an editor adds to a page in WordPress (Hero, Rich Text). **Parts** are shared pieces that sections are built from, so they look and behave the same everywhere: Buttons (also a section of its own), editor text (`rs_editor()` + `.prose`), and the shared section settings (width, background, spacing, anchor; tested on the Placeholder page). The test site lists them separately: sections at the top of its menu, parts under **Parts**.

| Component | ACF layout | What it's for |
|---|---|---|
| Hero | `hero` | A page's opening section: eyebrow, heading (the page's `<h1>` when it's the first section), intro and up to three buttons. **Centred** (text only) or **Background image** (photo tinted with the section's colour, left or centred text, a "keep in view" crop point, decorative unless the editor asks for it to be described); **Standard** or **Tall** |
| Rich Text | `rich_text` | An optional heading and editor text: paragraphs, subheadings, lists, quotes, links |
| Card Grid | `card_grid` | An optional eyebrow, heading and intro, a grid of cards, then up to three buttons. Each card: an optional image (cropped to 3:2), eyebrow, heading, short text and one optional link, which makes the **whole card clickable** (the heading is the link; the link text, e.g. "Read more →", is only a visual cue). **Columns** 2, 3 or 4 (the most side by side; fewer when a card would get narrower than `--card-min`, one on phones). **Last card** Column width (every card the same) or Fill the row (when the last row isn't full, the last card stretches across the columns left; its image keeps the others' height, so it's cropped to a wider strip). The column counts at each width are worked out from `$card-min` when the CSS is built, which is what lets plain CSS know how far to stretch. **Card look** Panel (a filled, rounded card) or Plain; a Panel's fill is only painted, reaching out around the card, so both looks are the same size and line up with the heading |
| Media Text | `media_text` | An image beside an optional eyebrow, heading, editor text (`.prose`) and up to three buttons. **Image side** Left or Right (on phones the image is always above the text; side by side once the section is at least `md` (40rem) wide, measured with a container query). **Image shape** Original (never cropped), Landscape 3:2, Square or Portrait 4:5, cropped around a **Keep in view** point (middle, top, bottom, left, right). **Split** Half and half, Image wider or Text wider (3:2 either way). **Text lines up with the image's** Top, Middle or Bottom (the image keeps its own height; neither is stretched). The text comes before the image in the page, for screen readers; the image's alt text comes from the Media Library (empty = decorative) |
| Buttons | `buttons` | A row of up to three buttons on its own (e.g. after some text), left or centred. The same buttons appear inside other components: see **Buttons** below |
| Placeholder | `placeholder` | Testing only: a box showing its own settings. Never switch it on for a real site |

### Site components
Not page sections: they appear on every page and are edited on their own page in wp-admin. Switch each on in the site's `rnnbrwn_sections` filter.

| Component | Switch on with | Edited in | What it's for |
|---|---|---|---|
| Navigation | `'navigation' => true` | wp-admin → Navigation | The site header: logo (plus an optional one for dark backgrounds) or the site title, and the main links. Below the `md` breakpoint they're behind a menu button that opens them full screen: the page behind is hidden, `inert` and doesn't scroll |

Navigation's links come from either a **WordPress menu** (Appearance → Menus, "Main navigation" location) or, for one-page sites, **sections picked by their Anchor ID**. Menu items dragged under another become its **sub-links** (one level; deeper ones aren't shown). On wider screens they're a dropdown: the parent stays a link to its own page, and the ▾ button beside it opens the dropdown (click, Enter or Space); hovering opens it too, and it stays a moment (`--hover-grace`) after the pointer leaves. Escape, clicking elsewhere or tabbing out closes it. On small screens the sub-links are listed under their parent, indented. In Astro, add `NAVIGATION_QUERY` to the page's query and put it first in `<body>`; the page's `<main>` needs `id="main"` for its "Skip to content" link:

```astro
<Navigation data={data} cmsUrl={import.meta.env.GRAPHQL_URL} />
<main id="main" class="l-page">...</main>
```

### Buttons
Buttons are one component used everywhere: any component that shows buttons includes the same fields, so they look and behave the same on every site. Each button is a link (pick a page or type an address; the link text is the label) and a **Style**: **Solid** (the main action), **Outline**, or **Text link** (a plain link, for low-key actions). Up to three per component; they wrap onto new lines when space runs out. Arrows are automatic: a text link gets →, and a link to another website or one that opens in a new tab gets ↗ (new tabs are also announced to screen readers). Every style is at least 44px tall. Solid and Outline are never underlined: on hover their fill shifts slightly and they lift with a soft shadow (`--shadow-raised`, in `--color-shadow`: the brand's Dark colour, or on the Dark surface a much deeper version at 2.5× strength, `--shadow-strength`); a Text link stays underlined.

To give a component buttons:
- **WordPress:** add `rs_buttons( '<layout>' )` to its fields. It makes a repeater called `<layout>_buttons` (e.g. `hero_buttons`).
- **Astro:** fetch it with `BUTTONS_FIELDS` (e.g. `` `heroButtons ${BUTTONS_FIELDS}` `` in the registry) and render it with `<ButtonRow buttons={section.heroButtons} cmsUrl={cmsUrl} align="left" />`. `Button.astro` renders a single one. Both are exported for a site's own pages (`@rnnbrwn/components/ButtonRow.astro`).
- **Styles:** `.button`, `.button--outline`, `.button--text` in `scss/base/_buttons.scss`. Never write new button styles in a component. Over a photo, make text links use `--color-text` (the accent isn't readable enough there; see Hero).

`<Sections>` tells the first section it's the page's main heading (`main`); pass `mainHeading={false}` on a page that already has an `<h1>`.

Photos behind text are tinted with the section's colour at `--tint-strength` (80%, Accent 90%), chosen so text passes 4.5:1 even over pure white or black. With a mid-tone accent (e.g. white on pink at 4.6:1), Accent over a photo can still fall just short: prefer Light, Subtle or Dark over photos for such brands.

Anything else rendered from a WordPress link field uses `linkTarget(link, cmsUrl, Astro.site)` from `src/html.ts` (the site address, new tab, other website), as Button and Card Grid do, so links behave the same everywhere.

Editor text in any component uses `rs_editor()` in WordPress (a trimmed toolbar: subheadings, bold, italic, lists, quote, link; pasted text arrives as plain text) and `<div class="prose" set:html={editorHtml(html, cmsUrl)} />` in Astro, which styles it and turns links to the CMS's own pages into site links.

## Example Site
rnnbrwn.xyz/components/example-site/ is a realistic page built from the components (the WordPress page **Pages → Components → Example Site**), second in the test menu. It has no test header (title, intro, preview switches), and its first Hero is the page's `<h1>`, as on a real site; the theme picked on the other test pages still applies. Add each new component to it in wp-admin once it's built. The seed only fills it with starter content while it has no sections, so edits made in WordPress are never overwritten; to start it again, remove all its sections and re-run the seed.

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

Muted text is the text colour blended 70% into the background, except on **Accent**, where it's the full text colour: a mid-tone accent leaves no room for dimmer text at the 4.5:1 contrast minimum.

**Components never use `--brand-*`.** They use the colour **roles**, which every surface redefines for everything inside it, so a component works on any surface without knowing which one it's on: `--color-bg`, `--color-text`, `--color-muted`, `--color-border`, `--color-card` (cards, inputs), `--color-accent` and `--color-on-accent` (buttons). Muted, border and card are mixed from text and background automatically. Each site has to pick brand colours with enough contrast: check them with the test page's preview switches.

## Sass structure (`scss/`)
- `settings/` values only: breakpoints, container sizes, width lanes (plus `$card-min`, the narrowest a grid card may get), type and spacing scales, default brand colours. All `!default`.
- `tools/` mixins and functions: `mq()` (and `mq-below()` for small-screen-only rules), `cq()`, `fluid()`, `type-scale()`, `space-scale()`, token mixins. Outputs no CSS; components use `@use 'tools' as *;`.
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
2. Never set your own width. Wrap the component in `<Section section={section}>`, which places it in the lane chosen in WordPress and applies spacing, surface and anchor. A **Full width** section's background runs edge to edge while its content lines up with its **Content width** (Narrow, Content or Wide; a setting that shows only for Full width). For anything sized from the lane (e.g. an image's `sizes`), use `contentLane(section)` and `LANE_REM` from `settings.ts`, never the Width field alone.
3. Page-level layout uses `mq()`; layout inside a component uses `cq()` (the element being measured gets `container-type: inline-size`).
4. A repeater field needs a name unique across all components (`card_grid_items`, not `items`).
5. Lay a component out on an inner wrapper, not on the `<Section>` element: a full-width section is a subgrid of the page grid, and a `gap` set on it squeezes the content lane.
6. On a card fill (`--color-card`), the accent can fall just short of 4.5:1 (4.4:1 with some themes): use `--color-text` for text there, as Card Grid does for "Read more →".

## Adding a component
1. `rnnbrwn-base/sections/components/<name>.php` returning `rs_layout(...)` (see `placeholder.php`).
2. `src/components/<Name>.astro` wrapped in `<Section>`, plus its entry in `src/registry.ts`.
3. A test page and rows in `showcase/seed.php` (each component has its own page under "Components"), switch it on for rnnbrwn.xyz (theme filter + `ENABLED` in `src/lib/components.ts`), re-run the seed and check rnnbrwn.xyz/components/<name>/.

## Test page and demo
- `showcase/seed.php` creates the test pages shown on rnnbrwn.xyz: a "Components" overview (`/components/`) with one child page per component (`/components/hero/`, `/components/rich-text/`, `/components/card-grid/`, …), and the test Navigation menu linking them (run instructions in the file).
- `demo/` is a standalone page for comparing type and spacing presets: `cd demo && npm install && npm run dev`.
