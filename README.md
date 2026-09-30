# rnnbrwn-components

Shared layout system (Sass) and Astro components for every RNNBRWN site. Each component has two halves with the same name:

| | Where | Example |
|---|---|---|
| WordPress fields (ACF) | `rnnbrwn-themes/rnnbrwn-base/sections/components/` | `card-grid.php` → layout `card_grid` |
| Astro + Sass | `src/components/` here, listed in `src/registry.ts` | `CardGrid.astro` |

In GraphQL each one is `PageSectionsSections<Name>Layout` on `page.pageSections.sections`.

## Components
Components come in two kinds. **Sections** are what an editor adds to a page in WordPress (Hero, Rich Text). **Parts** are shared pieces that sections are built from, so they look and behave the same everywhere: Buttons (also a section of its own), editor text (`rs_editor()` + `.prose`), and the shared section settings (width, background, spacing, anchor; tested on the Placeholder page). The test site lists them separately: in its menu, sections under **Sections** and parts under **Parts**.

| Component | ACF layout | What it's for |
|---|---|---|
| Hero | `hero` | A page's opening section: eyebrow, heading (the page's `<h1>` when it's the first section), intro and up to three buttons. **Centred** (text only) or **Background image** (photo tinted with the section's colour, left or centred text, a "keep in view" crop point, decorative unless the editor asks for it to be described); **Standard** or **Tall** |
| Rich Text | `rich_text` | An optional heading and editor text: paragraphs, subheadings, lists, quotes, links |
| Card Grid | `card_grid` | An optional eyebrow, heading and intro, a grid of cards, then up to three buttons. Each card: an optional image (cropped to 3:2), eyebrow, heading, short text and one optional link, which makes the **whole card clickable** (the heading is the link; the link text, e.g. "Read more →", is only a visual cue). **Columns** 2, 3 or 4 (the most side by side; fewer when a card would get narrower than `--card-min`, one on phones). **Last card** Column width (every card the same) or Fill the row (when the last row isn't full, the last card stretches across the columns left; its image keeps the others' height, so it's cropped to a wider strip). The column counts at each width are worked out from `$card-min` when the CSS is built, which is what lets plain CSS know how far to stretch. **Card look** Panel (a filled, rounded card) or Plain; a Panel's fill is only painted, reaching out around the card, so both looks are the same size and line up with the heading |
| Media Text | `media_text` | An image beside an optional eyebrow, heading, editor text (`.prose`) and up to three buttons. **Image side** Left or Right (on phones the image is always above the text; side by side once the section is at least `md` (40rem) wide, measured with a container query). **Image shape** Original (never cropped), Landscape 3:2, Square or Portrait 4:5, cropped around a **Keep in view** point (middle, top, bottom, left, right). **Split** Half and half, Image wider or Text wider (3:2 either way). **Text lines up with the image's** Top, Middle or Bottom (the image keeps its own height; neither is stretched). The text comes before the image in the page, for screen readers; the image's alt text comes from the Media Library (empty = decorative) |
| Accordion | `accordion` | An optional eyebrow, heading and intro, a list of items that open and close (each a title and editor text, `.prose`), then up to three buttons. Good for FAQs. **Opening** Several at once or One at a time (opening an item closes the others); **First item starts open** (otherwise all start closed). **Layout** Heading above the items, or Heading beside the items (the eyebrow, heading, intro and buttons in a left column, a third of the width, once the section is at least `lg` (50rem) wide, measured with a container query; stacked when narrower). Each item is a native `<details>`/`<summary>`, so it works without JavaScript, screen readers announce it as expanded or collapsed, and find-in-page opens it; One at a time uses the browser's own `name` grouping. The + / − icon is CSS only, in the primary colour. Opening slides where the browser can animate `<details>` (`::details-content` + `interpolate-size`), and snaps elsewhere or with reduced motion. Titles aren't headings (a heading inside `<summary>` loses its meaning in some screen readers) |
| Stats | `stats` | An optional eyebrow, heading and intro, a row of up to four big figures, then up to three buttons. Each figure: the figure itself (short, at most 8 characters, e.g. "400+", "24/7", "£2.5m+"), a label and an optional short text. **Figure colour** Brand or Text (a colour role, so it's readable on every background). **Alignment** Left or Centred. The figures share a row only when all of a row fits, measured with a container query: two side by side once the section is `sm` (30rem) wide, three from `md` (40rem), four as two by two from `sm` and in one row from `lg` (50rem); stacked below that, so a row is never part-filled. A thin rule (`--color-border`) sits in the gap between rows and between figures in a row; it's drawn in the gap, so it takes no room. The figures are a list read figure first ("400+, Events covered"). No count-up animation (it needs JavaScript, and screen readers would read half-counted numbers) |
| Testimonials | `testimonials` | An optional eyebrow, heading and intro, up to six quotes, then up to three buttons. Each quote: the quote itself (a line break starts a new paragraph; editors don't type quote marks: a decorative opening mark in the brand colour is added in CSS, with empty alt text), a name, an optional role or company and an optional small round photo (cropped from the middle; decorative, as the name is beside it). **Layout** Grid or Large (each quote in bigger text, `--step-2`, one under another; best for a single quote). **Columns** 2 or 3 and **Last quote** Column width or Fill the row, both for Grid only and worked out like Card Grid's (the most side by side, fewer below `$card-min`, one on phones). **Quote look** Panel or Plain (a Panel's fill is only painted, like Card Grid's, so both are the same size). **Alignment** Left or Centred (the header, each quote's text and the buttons; the photo and name are centred as a group, with the name left-aligned beside the photo). The names are pushed to the bottom of each quote, so they line up across a row. Each quote is a `<figure>`: the words in a `<blockquote>`, the person in its `<figcaption>`. No slider (for accessibility, and most visitors never swipe past the first) |
| Logo Strip | `logo_strip` | An optional eyebrow, heading and intro, then up to twelve logos (clients, partners). Each logo: the image, a **Name** (required; its alt text and the link's name, never shown: the Media Library's alt text is often empty for logos) and an optional link (the logo is the link, at least `--tap-target` tall, with a small lift on hover). Every logo is the same height (`--space-l`) and at most four times as wide; they wrap onto new lines when there isn't room. **Logo colour** Original or Single colour (every logo repainted in the text colour, so mixed logos match and stay readable on every background; it needs transparent backgrounds, as a logo on a white box becomes a solid block). Single colour is an SVG filter (flood `currentColor`, keep the logo's transparency), not a CSS mask: masks only work on images from the site's own address or a server that allows it, and the logos come from WordPress's. In Windows' high-contrast mode it follows the system text colour. **Alignment** Left or Centred (every row, the last one too). No buttons, and no scrolling marquee |
| Contact Bar | `contact_bar` | An optional eyebrow, heading and intro, up to six contact details, then up to three buttons. Each detail has a **Type**: Email, Telephone, Address or Other (e.g. opening hours), an optional **Label** (Email, Telephone and Address are labelled by type when it's empty) and its value. Links are made from the type, so editors never type them: `mailto:`, `tel:` (only the digits and a leading +, with a "(0)" after a country code dropped; the number is shown as typed) and, for an address with **Link to a map** ticked, a Google Maps search in a new tab (↗ and the new-tab note). Other is plain text. Each link is stretched over its whole detail (icon and label too), so it's always a big tap target; the link's text is the value. Line icons by type (none for Other) in the brand colour, hidden from screen readers. **Layout** Heading above the details (they share a row that wraps once the section is `sm` (30rem) wide, measured with a container query) or Heading beside the details (the eyebrow, heading, intro and buttons in a left column from `lg` (50rem), the details listed one under another on the right); on phones the details are always one under another. **Alignment** Left or Centred, only with the heading above (WordPress hides it for Beside): Centred centres the header, the details as a group (in a row, each row centred with the tops lined up; one under another, the stack is centred as one block so the icons stay in a straight line; each detail keeps its icon beside its left-aligned text) and the buttons |
| CTA Banner | `cta_banner` | A compact call to action: an optional eyebrow, a heading (required; a step smaller than a section heading, `--step-3`, but still the section's `<h2>`), an optional short text, then one to three buttons. **Layout** Beside (the default: text on the left, buttons on the right and right-aligned, centred up and down, once the section is at least `lg` (50rem) wide, measured with a container query; under the text when narrower) or Centred (everything stacked and centred). What sets it apart from a Hero on Brand is its size: use it between sections to prompt an action, e.g. on Brand or Surface |
| Buttons | `buttons` | A row of up to three buttons on its own (e.g. after some text), left or centred. The same buttons appear inside other components: see **Buttons** below |
| Placeholder | `placeholder` | Testing only: a box showing its own settings. Never switch it on for a real site |

### Site components
Not page sections: they appear on every page and are edited on their own page in wp-admin. Switch each on in the site's `rnnbrwn_sections` filter.

| Component | Switch on with | Edited in | What it's for |
|---|---|---|---|
| Navigation | `'navigation' => true` | wp-admin → Navigation | The site header: logo (plus an optional one for dark backgrounds) or the site title, and the main links. Below the `md` breakpoint they're behind a menu button that opens them full screen: the page behind is hidden, `inert` and doesn't scroll |
| Footer | `'footer' => true` | wp-admin → Footer | The site footer: logo (plus an optional one for dark backgrounds) or the site title, a short text, up to three buttons and social links; columns of links; then a line with © years and name, small print and a few small links. On phones it stacks, the columns two side by side. **Layout: Single line** shows only that line of text (no logo, links or columns) |

Navigation's links come from either a **WordPress menu** (Appearance → Menus, "Main navigation" location) or, for one-page sites, **sections picked by their Anchor ID**. Menu items dragged under another become its **sub-links** (one level; deeper ones aren't shown). On wider screens they're a dropdown: the parent stays a link to its own page, and the ▾ button beside it opens the dropdown (click, Enter or Space); hovering opens it too, and it stays a moment (`--hover-grace`) after the pointer leaves. Escape, clicking elsewhere or tabbing out closes it. On small screens the sub-links are listed under their parent, indented. In Astro, add `NAVIGATION_QUERY` to the page's query and put it first in `<body>`; the page's `<main>` needs `id="main"` for its "Skip to content" link:

```astro
<Navigation data={data} cmsUrl={import.meta.env.GRAPHQL_URL} />
<main id="main" class="l-page">...</main>
```

Footer's links come from two **WordPress menus** (Appearance → Menus). In the **Footer** location, an item with sub-items becomes a column headed by that item (a link, unless its address is `#`: then it's only a heading); items without sub-items are listed together in a first column with no heading. The **Footer small print** location holds a short row of links beside the © line (Privacy, Terms). **Social links** are a platform (Bluesky, Mastodon, Instagram, Threads, Facebook, LinkedIn, X, YouTube, TikTok, GitHub, Spotify, Vimeo, Pinterest, Email, Website) and an address, shown as icons named for screen readers and marked `rel="me"`; the icons are Bootstrap Icons shapes in `src/social-icons.ts`, whose keys must match the Platform choices in `site/footer.php`. **First year** turns "© 2026" into "© 2001–2026"; the current year comes from the build. Untick **Show © and the year** to make the small print the whole line. The **Layout** choice at the top of wp-admin → Footer switches between **Full** and **Single line** (only the © line and small print, in the footer's Width; the Content and Social links tabs are hidden). The footer uses no JavaScript. In Astro, add `FOOTER_QUERY` to the page's query (it can sit beside `NAVIGATION_QUERY`) and put it last in `<body>`:

```astro
<main id="main" class="l-page">...</main>
<Footer data={data} cmsUrl={import.meta.env.GRAPHQL_URL} />
```

### Buttons
Buttons are one component used everywhere: any component that shows buttons includes the same fields, so they look and behave the same on every site. Each button is a link (pick a page or type an address; the link text is the label) and a **Style**: **Solid** (the main action), **Outline**, or **Text link** (a plain link, for low-key actions). Up to three per component; they wrap onto new lines when space runs out. Arrows are automatic: a text link gets →, and a link to another website or one that opens in a new tab gets ↗ (new tabs are also announced to screen readers). Every style is at least 44px tall. Solid and Outline are never underlined: on hover their fill changes to the hover colour and they lift with a soft shadow (`--shadow-raised`, in `--color-shadow`: the palette's black, or on the Black background a much deeper version at 2.5× strength, `--shadow-strength`); a Text link stays underlined.

To give a component buttons:
- **WordPress:** add `rs_buttons( '<layout>' )` to its fields. It makes a repeater called `<layout>_buttons` (e.g. `hero_buttons`).
- **Astro:** fetch it with `BUTTONS_FIELDS` (e.g. `` `heroButtons ${BUTTONS_FIELDS}` `` in the registry) and render it with `<ButtonRow buttons={section.heroButtons} cmsUrl={cmsUrl} align="left" />`. `Button.astro` renders a single one. Both are exported for a site's own pages (`@rnnbrwn/components/ButtonRow.astro`).
- **Styles:** `.button`, `.button--outline`, `.button--text` in `scss/base/_buttons.scss`. Never write new button styles in a component. Over a photo, make text links use `--color-text` (the primary colour isn't readable enough there; see Hero).

`<Sections>` tells the first section it's the page's main heading (`main`); pass `mainHeading={false}` on a page that already has an `<h1>`.

Photos behind text are tinted with the section's colour at `--tint-strength` (80%, Brand and Accent 90%), chosen so text passes 4.5:1 even over pure white or black. With a mid-tone brand colour (e.g. white on pink at 4.6:1), Brand over a photo can still fall just short: prefer White, Surface or Black over photos for such palettes.

Anything else rendered from a WordPress link field uses `linkTarget(link, cmsUrl, Astro.site)` from `src/html.ts` (the site address, new tab, other website, and `attrs` to spread on the `<a>`) with `<NewTabNote show={newTab} />` inside the link, as Button, Card Grid and Navigation do, so links behave the same everywhere.

### Shared pieces
Reuse these rather than writing a component's own version:
- **Images:** `IMAGE_FIELDS` in the registry and `<Image image={...} sizes={...} />` (`src/Image.astro`: srcset, width and height, lazy unless `eager`, Media Library alt text unless `alt` is given). `laneSizes(section, share)` in `src/settings.ts` works out `sizes` from the section's lane. A "Keep in view" setting is `data-focus` on the image's wrapper (styled in `scss/base/_base.scss`).
- **Eyebrows:** `class="eyebrow <component>__eyebrow"` (`scss/base/_text.scss`); they're in the brand colour (`--color-brand`); change size or colour with the component's own class (card eyebrows are smaller and muted).
- **Field shapes:** `WpLink`, `WpImage`, `ButtonsField`, `Choice` and `LINK_FIELDS` in `src/settings.ts`; `sectionWidth()`, `contentLane()` and `backgroundClass()` for the Settings tab.
- **Arrows:** `<ButtonIcon style newTab external />`, the same automatic → and ↗ as Button.
- **Panels:** `@include panel-area;` (`scss/tools/_panel.scss`) for anything painted like a section panel (Hero's photo uses it).
- **WordPress fields:** `rs_eyebrow`, `rs_textarea`, `rs_image`, `rs_select` (with an `$extra` array for instructions and conditions), `rs_when` for conditional logic and `rs_background` in `sections.php`.

Editor text in any component uses `rs_editor()` in WordPress (a trimmed toolbar: subheadings, bold, italic, lists, quote, link; pasted text arrives as plain text) and `<div class="prose" set:html={editorHtml(html, cmsUrl)} />` in Astro, which styles it and turns links to the CMS's own pages into site links.

## Example Site
rnnbrwn.xyz/components/example-site/ is a realistic page built from the components (the WordPress page **Pages → Components → Example Site**), second in the sidebar and the test menu. Its preview has the site's Navigation and Footer, and its first Hero is the page's `<h1>`, as on a real site. Add each new component to it in wp-admin once it's built. The seed only fills it with starter content while it has no sections, so edits made in WordPress are never overwritten; to start it again, remove all its sections and re-run the seed.

## Using it in a site
1. Install: `npm install github:rnnbrwn/rnnbrwn-components#<version>` (while developing: `npm install ../../platform/rnnbrwn-components`, which links the local folder).
2. `astro.config.mjs`: `import rnnbrwnComponents from '@rnnbrwn/components';` and add `rnnbrwnComponents()` to `integrations`.
3. Global stylesheet: `@use 'rnnbrwn-global';` then set the site's palette (see below).
4. WordPress (child theme `functions.php`): `add_filter('rnnbrwn_sections', fn () => ['components' => [...], 'pages' => 'all', 'background' => 'white']);`
5. Query and render, listing the same components as step 4:
   ```astro
   ---
   import Sections from '@rnnbrwn/components/Sections.astro';
   import { pageQuery, pageBackground } from '@rnnbrwn/components/graphql';
   const data = await query(`{ page(id: "/about/", idType: URI) { ${pageQuery(['hero'])} } }`);
   ---
   <body class={`bg-${pageBackground(data.page)}`}>
     <main class="l-page"><Sections sections={data.page.pageSections.sections} cmsUrl={import.meta.env.GRAPHQL_URL} /></main>
   </body>
   ```

## Colours: five backgrounds on every site, each site's own palette
Every site has a **palette** of seven colours: an off-white and an off-black (never pure `#fff` or `#000`) and five colours. A site only sets its palette; the library builds everything else from it:

```scss
@use 'rnnbrwn-global';

:root {
  --palette-white: #fffcff;    // the White background, and text on dark colours
  --palette-black: #292f36;    // body text, and the Black background
  --palette-surface: #fdf3c4;  // the soft, tinted Surface background
  --palette-brand: #e50053;    // the site's main colour: the Brand background, eyebrows, the current nav item, quote rules
  --palette-primary: #c70049;  // buttons, links and focus outlines
  --palette-hover: #99003a;    // buttons and links on hover
  --palette-accent: #fece00;   // highlights (--color-accent), and the Accent background

  // Which neutral goes on each colour. These are the defaults; use black for a pale colour.
  // --palette-on-brand: var(--palette-white);
  // --palette-on-primary: var(--palette-white);
  // --palette-on-accent: var(--palette-black);

  // Optional: the colours on the Black background. By default brand, primary and hover are
  // lighter tints (60% colour, 40% white; hover 40/60), with black text on buttons, so they
  // stay readable. Set them yourself for a very dark or very light colour.
  // --palette-brand-on-black: #ff5c93;
  // --palette-primary-on-black: #ff5c93;
  // --palette-hover-on-black: #ff8fb3;
  // --palette-on-primary-on-black: var(--palette-black);
  // --palette-accent-on-black: var(--palette-accent);
}
```

There are five **backgrounds** (colour schemes), the same on every site and in every Background dropdown in WordPress: **White** (`bg-white`, the default), **Surface** (`bg-surface`), **Brand** (`bg-brand`), **Accent** (`bg-accent`) and **Black** (`bg-black`). Primary and hover are for buttons and links only, never a whole background.

**The page's background** is set per page in WordPress, in the **Page settings** box in the edit screen's sidebar. It defaults to the site's usual background (`'background'` in the site's `rnnbrwn_sections` filter). The frontend puts it on `<body>`:

```astro
---
import { pageQuery, pageBackground } from '@rnnbrwn/components/graphql';
const { page } = await query(`{ page(id: "/about/", idType: URI) { ${pageQuery(['rich_text'])} } }`);
---
<body class={`bg-${pageBackground(page)}`}>
```

**A section's background** is its **Background** setting. The default, **Same as the page**, follows the page, so changing a page's background changes every section left on the default. Picking one of the five makes the section a panel, unless it matches the page or the section is full width. A panel is only painted behind the section (reaching out into the gutter, and pulled in slightly top and bottom so two panels in a row have a gap), so changing a section's background never moves or resizes anything. Any other element can take a background class too.

On **Brand** and **Accent**, everything is drawn in that background's text colour: links, eyebrows and muted text are the full text colour, and Solid buttons reverse (the text colour as the fill, the background's colour as the label). Hover doesn't change colour there (buttons still lift, links thicken their underline): a mid-tone colour leaves no room for a second shade at the 4.5:1 contrast minimum. Elsewhere, muted text is the text colour blended 70% into the background.

Brand counts as a dark background and Accent as a light one (for `--display-if-dark`/`--display-if-light`, e.g. which logo shows), matching the default text colours on them. A site that changes `--palette-on-brand` or `--palette-on-accent` changes that too: `.bg-brand { --display-if-light: block; --display-if-dark: none; }`.

**Components never use `--palette-*`.** They use the colour **roles**, which every background redefines for everything inside it, so a component works on any background without knowing which one it's on: `--color-bg`, `--color-text`, `--color-muted`, `--color-border`, `--color-card` (cards, inputs), `--color-primary`, `--color-hover` and `--color-on-primary` (links and buttons), `--color-brand` (details in the main colour) and `--color-accent` (highlights). Muted, border and card are mixed from text and background automatically. Each site has to pick a palette with enough contrast: check it with the test page's theme switch and `tests/theme-contrast.mjs`.

**Upgrading from v0.2** (four "surfaces", `--brand-*` colours): `--brand-light`/`-dark`/`-subtle` become `--palette-white`/`-black`/`-surface`; `--brand-accent` becomes both `--palette-brand` and `--palette-primary` (add `--palette-hover` and `--palette-accent`); `--brand-on-accent` becomes `--palette-on-brand` and `--palette-on-primary`. Classes `surface-light|subtle|accent|dark` become `bg-white|surface|brand|black`; `pageSurface`/`SURFACES`/`surfaceClass` become `pageBackground`/`BACKGROUNDS`/`backgroundClass`; the query field `pageSettings { surface }` becomes `pageSettings { background }`; the `rnnbrwn_sections` setting `'surface' => 'light'` becomes `'background' => 'white'`. Then run `migrations/0.3.0-backgrounds.php` once on each site's WordPress (instructions at its top) to move saved Background choices to the new names.

## Sass structure (`scss/`)
- `settings/` values only: breakpoints, container sizes, width lanes (plus `$card-min`, the narrowest a grid card may get), type and spacing scales, the default palette. All `!default`.
- `tools/` mixins and functions: `mq()` (and `mq-below()` for small-screen-only rules), `cq()`, `fluid()`, `type-scale()`, `space-scale()`, `snap-leading()` (a line-height on the vertical rhythm grid), token mixins. Outputs no CSS; components use `@use 'tools' as *;`.
- `base/`, `layout/` global CSS: backgrounds and panels, reset and typography, the `.l-page` grid, section spacing, `.l-stack`, `.l-cluster`.
- `rnnbrwn-global.scss` outputs all global CSS and the `:root` custom properties, once per site.

## Accessibility and motion
- Keyboard focus always shows an outline (`:focus-visible`, in the background's primary colour).
- `.visually-hidden` hides text visually but keeps it for screen readers; `.visually-hidden-focusable` appears on focus (skip links).
- Tap targets are at least `var(--tap-target)` (44px).
- Animations use `var(--duration-fast|base)` and `var(--ease-out)`; these become 0 for people who ask for reduced motion, so use them for every transition.
- Images that can't recolour can be shown per background with `display: var(--display-if-light)` / `var(--display-if-dark)`.

## Rules for components
1. No raw px, hex or rem values: use `var(--space-*)`, `var(--step-*)`, `var(--color-*)` (roles, never `--palette-*`), `var(--radius-*)`, `var(--line)`.
   **Vertical rhythm:** space text in lines of body text, `var(--line)` (24px on phones, 25.5px on desktop), not the spacing scale: a heading half a line from its own text, blocks of text one line apart, a line and a half before a new group (a subheading, or cards after a section header), a quarter line inside a card. Base styles put every heading, paragraph, list item and quote on a quarter-line grid; a component that sets its own line-height uses `@include snap-leading(<number>)`. The `--space-*` scale is for everything else: section spacing, padding, gaps between cards or buttons, side-by-side columns.
2. Never set your own width. Wrap the component in `<Section section={section}>`, which places it in the lane chosen in WordPress and applies spacing, background and anchor. A **Full width** section's background runs edge to edge while its content lines up with its **Content width** (Narrow, Content or Wide; a setting that shows only for Full width). For anything sized from the lane (e.g. an image's `sizes`), use `contentLane(section)` and `LANE_REM` from `settings.ts`, never the Width field alone.
3. Page-level layout uses `mq()`; layout inside a component uses `cq()` (the element being measured gets `container-type: inline-size`).
4. A repeater field needs a name unique across all components (`card_grid_items`, not `items`).
5. Lay a component out on an inner wrapper, not on the `<Section>` element: a full-width section is a subgrid of the page grid, and a `gap` set on it squeezes the content lane.
6. On a card fill (`--color-card`), the primary and brand colours can fall just short of 4.5:1 (4.4:1 with some themes): use `--color-text` or `--color-muted` for text there, as Card Grid does for "Read more →" and card eyebrows.

## Adding a component
1. `rnnbrwn-base/sections/components/<name>.php` returning `rs_layout(...)` (see `placeholder.php`).
2. `src/components/<Name>.astro` wrapped in `<Section>`, plus its entry in `src/registry.ts`.
3. A test page and rows in `showcase/seed.php` (each component has its own page under "Components"), switch it on for rnnbrwn.xyz (theme filter + `ENABLED` in `src/lib/components.ts`), re-run the seed and check rnnbrwn.xyz/components/<name>/.

## Test page and demo
- `showcase/seed.php` creates the test pages shown on rnnbrwn.xyz: a "Components" overview (`/components/`) with one child page per component (`/components/hero/`, `/components/rich-text/`, `/components/card-grid/`, …), the Sections, Parts and Site pages listing theirs, and the test Navigation menu (Components · Example Site · Sections ▾ · Parts ▾ · Site ▾, so it stays one line however many components there are) and Footer menus linking them (run instructions in the file).
- rnnbrwn.xyz/components/ is the library's design-system site: a sidebar (Foundations, Sections, Parts, Site), a toolbar (theme, page background, width), and on each component's page a "How to use" panel (its settings, written in `sites/rnnbrwn.xyz/src/lib/docs.ts`; the tokens and parts it's built from, read from its source), then **Settings** controls (in a column on the right on wide screens) and ONE copy of the component that they change live (a copy for every combination of the component's own settings, built from its fullest test version, one shown; the shared Settings tab and Keep in view are changed on the shown copy). A View switch shows all its test versions instead. The component is on the page itself: the theme switch changes only it, the page background is set on `<body>` (it decides panels) while the page's own parts keep their colours, and the width switch narrows it (components measure their own space, so they lay out as at that screen width; Navigation's phone menu needs a narrow window). The test versions are also on `/components/<name>/preview/`, a page of their own for the browser checks. The Tokens page (`/components/tokens/`) shows every colour and size. Navigation and Footer take `currentPath` on those preview pages, the page they're shown for, since the preview's own address isn't in the menus.
- `demo/` is a standalone page for comparing type and spacing presets: `cd demo && npm install && npm run dev`.
