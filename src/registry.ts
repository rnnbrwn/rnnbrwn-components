// Every component in the library. The key is its ACF layout name, matching
// rnnbrwn-themes/rnnbrwn-base/sections/components/<name with dashes>.php;
// `fields` is what to fetch from GraphQL, on top of the shared settings.
import Hero from './components/Hero.astro';
import Placeholder from './components/Placeholder.astro';
import RichText from './components/RichText.astro';

const LINK = '{ title url target }';
const IMAGE = '{ node { sourceUrl srcSet altText mediaDetails { width height } } }';

export const components = {
  hero: {
    component: Hero,
    fields: `variant eyebrow heading intro primaryLink ${LINK} secondaryLink ${LINK} height image ${IMAGE} focus imageInformative alignment`,
  },
  rich_text: { component: RichText, fields: 'heading body' },
  placeholder: { component: Placeholder, fields: 'heading note' },
};

export type ComponentName = keyof typeof components;
