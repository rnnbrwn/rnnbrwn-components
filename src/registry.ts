// Every component in the library. The key is its ACF layout name, matching
// rnnbrwn-themes/rnnbrwn-base/sections/components/<name with dashes>.php;
// `fields` is what to fetch from GraphQL, on top of the shared settings.
import Accordion from './components/Accordion.astro';
import Buttons from './components/Buttons.astro';
import CardGrid from './components/CardGrid.astro';
import ContactBar from './components/ContactBar.astro';
import CtaBanner from './components/CtaBanner.astro';
import Hero from './components/Hero.astro';
import LogoStrip from './components/LogoStrip.astro';
import MediaText from './components/MediaText.astro';
import Placeholder from './components/Placeholder.astro';
import RichText from './components/RichText.astro';
import Stats from './components/Stats.astro';
import Testimonials from './components/Testimonials.astro';
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
  accordion: {
    component: Accordion,
    fields: `eyebrow heading intro accordionItems { title body } accordionButtons ${BUTTONS_FIELDS} opening firstOpen layout`,
  },
  stats: {
    component: Stats,
    fields: `eyebrow heading intro statsFigures { figure label text } statsButtons ${BUTTONS_FIELDS} figureColour alignment`,
  },
  testimonials: {
    component: Testimonials,
    fields: `eyebrow heading intro testimonialsQuotes { quote name role photo ${IMAGE} } testimonialsButtons ${BUTTONS_FIELDS} layout columns lastQuote quoteStyle alignment`,
  },
  logo_strip: {
    component: LogoStrip,
    fields: `eyebrow heading intro logoStripLogos { image ${IMAGE} name link ${LINK} } logoColour alignment`,
  },
  contact_bar: {
    component: ContactBar,
    fields: `eyebrow heading intro contactBarDetails { type label email phone text mapLink } contactBarButtons ${BUTTONS_FIELDS} layout alignment`,
  },
  cta_banner: {
    component: CtaBanner,
    fields: `eyebrow heading intro ctaBannerButtons ${BUTTONS_FIELDS} layout`,
  },
  buttons: { component: Buttons, fields: `buttonsButtons ${BUTTONS_FIELDS} alignment` },
  placeholder: { component: Placeholder, fields: 'heading note' },
};

export type ComponentName = keyof typeof components;
