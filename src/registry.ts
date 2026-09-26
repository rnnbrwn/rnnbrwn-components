// Every component in the library. The key is its ACF layout name, matching
// rnnbrwn-themes/rnnbrwn-base/sections/components/<name with dashes>.php;
// `fields` is what to fetch from GraphQL, on top of the shared settings.
import Buttons from './components/Buttons.astro';
import CardGrid from './components/CardGrid.astro';
import Hero from './components/Hero.astro';
import MediaText from './components/MediaText.astro';
import Placeholder from './components/Placeholder.astro';
import RichText from './components/RichText.astro';
import { BUTTONS_FIELDS, IMAGE_FIELDS as IMAGE, LINK_FIELDS as LINK } from './settings';

export const components = {
  hero: {
    component: Hero,
    fields: `variant eyebrow heading intro heroButtons ${BUTTONS_FIELDS} height image ${IMAGE} focus imageInformative alignment`,
  },
  rich_text: { component: RichText, fields: 'heading body' },
  card_grid: {
    component: CardGrid,
    fields: `eyebrow heading intro cardGridCards { image ${IMAGE} eyebrow heading text link ${LINK} } cardGridButtons ${BUTTONS_FIELDS} columns lastCard cardStyle`,
  },
  media_text: {
    component: MediaText,
    fields: `image ${IMAGE} eyebrow heading body mediaTextButtons ${BUTTONS_FIELDS} imageSide imageShape focus split textAlignment`,
  },
  buttons: { component: Buttons, fields: `buttonsButtons ${BUTTONS_FIELDS} alignment` },
  placeholder: { component: Placeholder, fields: 'heading note' },
};

export type ComponentName = keyof typeof components;
