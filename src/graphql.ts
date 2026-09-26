import { components, type ComponentName } from './registry';
import { SETTINGS_FIELDS, PAGE_SETTINGS_FIELDS } from './settings';

export { BUTTONS_FIELDS, choice, pageSurface, SURFACES, type SectionSettings, type Surface } from './settings';
import type { Choice } from './settings';
export type { ComponentName };

/** GraphQL type of a component: card_grid -> PageSectionsSectionsCardGridLayout */
export const typeName = (name: string) =>
  `PageSectionsSections${name
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('')}Layout`;

/**
 * The piece of a GraphQL query that fetches a page's sections, to put inside `page { ... }`.
 * List exactly the components the site switched on in WordPress: asking for one that
 * isn't switched on makes the whole query fail.
 */
export function sectionsQuery(enabled: ComponentName[]) {
  const layouts = enabled.map(
    (name) => `... on ${typeName(name)} { ${SETTINGS_FIELDS} ${components[name].fields} }`,
  );
  return `pageSections { sections { __typename ${layouts.join(' ')} } }`;
}

/**
 * Everything the library needs from a page, to put inside `page { ... }`: its settings
 * (the surface for <body>) and its sections. Same rule as sectionsQuery for `enabled`.
 */
export function pageQuery(enabled: ComponentName[]) {
  return `${PAGE_SETTINGS_FIELDS} ${sectionsQuery(enabled)}`;
}

/**
 * What <Navigation> needs, to put at the top level of a query (next to page { ... }).
 * Only for sites with 'navigation' => true in their rnnbrwn_sections settings.
 */
export const NAVIGATION_QUERY = `
  generalSettings { title }
  navigationSettings {
    navigation {
      logo { node { sourceUrl mediaDetails { width height } } }
      logoDark { node { sourceUrl mediaDetails { width height } } }
      source
      navigationSections { target label }
      background
      width
    }
  }
  navigationMenu: menuItems(where: { location: MAIN_NAVIGATION, parentDatabaseId: 0 }, first: 50) {
    nodes { label url target childItems(first: 50) { nodes { label url target } } }
  }
`;

type NavigationImage = { node: { sourceUrl: string; mediaDetails: { width: number; height: number } | null } } | null;

export interface NavigationData {
  generalSettings: { title: string };
  navigationSettings: {
    navigation: {
      logo: NavigationImage;
      logoDark: NavigationImage;
      source: string | null;
      navigationSections: { target: Choice; label: string | null }[] | null;
      background: Choice;
      width: Choice;
    } | null;
  } | null;
  navigationMenu: { nodes: (NavigationMenuItem & { childItems: { nodes: NavigationMenuItem[] } | null })[] } | null;
}

export interface NavigationMenuItem {
  label: string | null;
  url: string | null;
  target: string | null;
}
