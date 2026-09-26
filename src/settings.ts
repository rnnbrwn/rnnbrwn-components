// The shared Settings tab every component has in WordPress (rs_settings() in
// rnnbrwn-themes/rnnbrwn-base/sections/sections.php), and the page's own settings.

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

/**
 * The lane a section's content lines up with: its Width, or for a full-width section its
 * Content width (the background runs edge to edge, the content stays in this lane).
 */
export function contentLane(section: SectionSettings): 'narrow' | 'content' | 'wide' {
  const width = choice(section.width, 'content');
  const lane = width === 'full' ? choice(section.contentWidth, 'content') : width;
  return lane === 'narrow' || lane === 'wide' ? lane : 'content';
}

/** How wide a section's content lane can get, in rem (for images' `sizes`). */
export const LANE_REM = { narrow: 40, content: 60, wide: 80 } as const;

/**
 * What to fetch for a component's buttons field (rs_buttons in WordPress), for ButtonRow.astro:
 * e.g. `heroButtons ${BUTTONS_FIELDS}`.
 */
export const BUTTONS_FIELDS = '{ link { title url target } style }';

// ---------- Page settings (the "Page settings" box in the page's sidebar) ----------

export const SURFACES = ['light', 'subtle', 'accent', 'dark'] as const;
export type Surface = (typeof SURFACES)[number];

export const PAGE_SETTINGS_FIELDS = 'pageSettings { surface }';

/** The page's surface, for its <body> class: <body class={`surface-${pageSurface(page)}`}> */
export function pageSurface(page: { pageSettings?: { surface: Choice } | null } | null | undefined): Surface {
  const value = choice(page?.pageSettings?.surface, 'light');
  return (SURFACES as readonly string[]).includes(value) ? (value as Surface) : 'light';
}
