// The shared Settings tab every component has in WordPress (rs_settings() in
// rnnbrwn-themes/rnnbrwn-base/sections/sections.php), the page's own settings, and the shapes of
// the WordPress fields that several components share (links, images, buttons).

// WPGraphQL returns dropdown (select) fields as a one-item list.
export type Choice = string[] | null;

export interface SectionSettings {
  __typename: string;
  width: Choice;
  contentWidth?: Choice;
  spacing: Choice;
  background: Choice;
  anchor: string | null;
}

/** First value of a dropdown field, or a fallback if it's empty. */
export const choice = (value: Choice | undefined, fallback: string) => value?.[0] || fallback;

export const SETTINGS_FIELDS = 'width contentWidth spacing background anchor';

/** A section's Width: narrow, content (the default), wide or full. */
export const sectionWidth = (section: SectionSettings) => choice(section.width, 'content');

/**
 * The lane a section's content lines up with: its Width, or for a full-width section its
 * Content width (the background runs edge to edge, the content stays in this lane).
 */
export function contentLane(section: SectionSettings): 'narrow' | 'content' | 'wide' {
  const width = sectionWidth(section);
  const lane = width === 'full' ? choice(section.contentWidth, 'content') : width;
  return lane === 'narrow' || lane === 'wide' ? lane : 'content';
}

/** How wide a section's content lane can get, in rem (for images' `sizes`). */
export const LANE_REM = { narrow: 40, content: 60, wide: 80 } as const;

/**
 * An image's `sizes`, from the section's content lane: once the screen is as wide as the lane,
 * the image is `share` of it (e.g. 0.5 for one of two columns); narrower, it's `smaller`.
 */
export function laneSizes(section: SectionSettings, share = 1, smaller = '100vw') {
  const lane = LANE_REM[contentLane(section)];
  return `(min-width: ${lane}rem) ${Math.ceil(lane * share)}rem, ${smaller}`;
}

/** The class for a Background setting: none for "Same as the page", otherwise surface-<name>. */
export const surfaceClass = (surface: string) => (surface === 'page' ? undefined : `surface-${surface}`);

// ---------- Shared field shapes ----------

/** An ACF link field (return format: array). */
export type WpLink = { title: string | null; url: string | null; target: string | null } | null;
export const LINK_FIELDS = '{ title url target }';

/** An ACF image field, as WPGraphQL gives it. Render it with Image.astro. */
export interface WpImageNode {
  sourceUrl: string;
  srcSet: string | null;
  altText: string | null;
  mediaDetails: { width: number; height: number } | null;
}
export type WpImage = { node: WpImageNode } | null;
export const IMAGE_FIELDS = '{ node { sourceUrl srcSet altText mediaDetails { width height } } }';

/**
 * What to fetch for a component's buttons field (rs_buttons in WordPress), for ButtonRow.astro:
 * e.g. `heroButtons ${BUTTONS_FIELDS}`.
 */
export const BUTTONS_FIELDS = `{ link ${LINK_FIELDS} style }`;
export type ButtonsField = { link: WpLink; style: Choice }[] | null | undefined;

// ---------- Page settings (the "Page settings" box in the page's sidebar) ----------

export const SURFACES = ['light', 'subtle', 'accent', 'dark'] as const;
export type Surface = (typeof SURFACES)[number];

export const PAGE_SETTINGS_FIELDS = 'pageSettings { surface }';

/** The page's surface, for its <body> class: <body class={`surface-${pageSurface(page)}`}> */
export function pageSurface(page: { pageSettings?: { surface: Choice } | null } | null | undefined): Surface {
  const value = choice(page?.pageSettings?.surface, 'light');
  return (SURFACES as readonly string[]).includes(value) ? (value as Surface) : 'light';
}
