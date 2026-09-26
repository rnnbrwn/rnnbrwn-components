import { components, type ComponentName } from './registry';
import { SETTINGS_FIELDS, PAGE_SETTINGS_FIELDS } from './settings';

export { choice, pageSurface, SURFACES, type SectionSettings, type Surface } from './settings';
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
    nodes { label url target }
  }
`;

type NavigationImage = { node: { sourceUrl: string; mediaDetails: { width: number; height: number } | null } };

export interface NavigationData {
  generalSettings: { title: string };
  navigationSettings: {
    navigation: {
      logo: NavigationImage | null;
      logoDark: NavigationImage | null;
      source: string | null;
      navigationSections: { target: string[] | null; label: string | null }[] | null;
      background: string[] | null;
      width: string[] | null;
    } | null;
  } | null;
  navigationMenu: { nodes: { label: string | null; url: string | null; target: string | null }[] } | null;
}
