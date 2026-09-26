// Every component in the library. The key is its ACF layout name, matching
// rnnbrwn-themes/rnnbrwn-base/sections/components/<name with dashes>.php;
// `fields` is what to fetch from GraphQL, on top of the shared settings.
import Placeholder from './components/Placeholder.astro';
import RichText from './components/RichText.astro';

export const components = {
  rich_text: { component: RichText, fields: 'heading body' },
  placeholder: { component: Placeholder, fields: 'heading note' },
};

export type ComponentName = keyof typeof components;
