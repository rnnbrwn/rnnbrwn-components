// Every component in the library. The key is its ACF layout name, matching
// rnnbrwn-themes/rnnbrwn-base/sections/components/<name with dashes>.php;
// `fields` is what to fetch from GraphQL, on top of the shared settings.
import Buttons from './components/Buttons.astro';
import Hero from './components/Hero.astro';
import Placeholder from './components/Placeholder.astro';
import RichText from './components/RichText.astro';
import { BUTTONS_FIELDS } from './settings';

const IMAGE = '{ node { sourceUrl srcSet altText mediaDetails { width height } } }';

export const components = {
  hero: {
    component: Hero,
    fields: `variant eyebrow heading intro heroButtons ${BUTTONS_FIELDS} height image ${IMAGE} focus imageInformative alignment`,
  },
  rich_text: { component: RichText, fields: 'heading body' },
  buttons: { component: Buttons, fields: `buttonsButtons ${BUTTONS_FIELDS} alignment` },
  placeholder: { component: Placeholder, fields: 'heading note' },
};

export type ComponentName = keyof typeof components;
