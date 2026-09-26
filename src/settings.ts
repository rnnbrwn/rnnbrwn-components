// The shared Settings tab every component has in WordPress (rs_settings() in
// rnnbrwn-themes/rnnbrwn-base/sections/sections.php), and the page's own settings.

// WPGraphQL returns dropdown (select) fields as a one-item list.
export type Choice = string[] | null;

export interface SectionSettings {
  __typename: string;
  width: Choice;
  spacing: Choice;
  background: Choice;
  anchor: string | null;
}

/** First value of a dropdown field, or a fallback if it's empty. */
export const choice = (value: Choice | undefined, fallback: string) => value?.[0] || fallback;

export const SETTINGS_FIELDS = 'width spacing background anchor';

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
