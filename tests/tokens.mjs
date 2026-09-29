import { BASE, SHOTS, BACKGROUNDS, THEMES, check, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
// The Tokens page (/components/tokens/): the library's colours and sizes, drawn with the live
// custom properties and their values filled in by the page's script. Checked on its preview page,
// the page its frame shows.
const PAGE = BASE + '/components/tokens/preview/';
const p = await newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });

// Every token the library declares on :root (palette, spacing, type, widths, radii) is on the page,
// so a new one in the settings can't be left off.
const missing = await p.evaluate(() => {
  const declared = new Set();
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.selectorText !== ':root') continue;
      for (const name of rule.style) if (/^--(palette|space|step|width|radius)-/.test(name)) declared.add(name);
    }
  }
  const shown = new Set([...document.querySelectorAll('[data-token]')].map((el) => el.dataset.token));
  return { count: declared.size, missing: [...declared].filter((name) => !shown.has(name)) };
});
check('every palette, spacing, type, width and radius token is listed', missing.count > 30 && missing.missing.length === 0, missing.missing.join(', ') || `${missing.count} tokens`);

const empty = () => p.evaluate(() => [...document.querySelectorAll('[data-hex], [data-ratio], [data-now], [data-range]')]
  .filter((el) => !el.textContent.trim()).map((el) => el.closest('[data-token]')?.dataset.token));
const e = await empty();
check('every value is filled in', e.length === 0, e.join(', ') || 'none empty');

// The hex shown for each colour is the colour actually drawn.
const wrong = await p.evaluate(() => [...document.querySelectorAll('[data-chip]')].filter((chip) => {
  const [r, g, b] = getComputedStyle(chip).backgroundColor.match(/[\d.]+/g).map(Number);
  const shown = chip.closest('[data-token]').querySelector('[data-hex]').textContent;
  return getComputedStyle(chip).backgroundColor.startsWith('rgb(') && shown !== '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}).map((chip) => chip.closest('[data-token]').dataset.token));
check('hex codes match the drawn colours', wrong.length === 0, wrong.join(', ') || 'all match');

// The five backgrounds each show every role, and no text role is below its contrast minimum.
const bgs = await p.evaluate(() => [...document.querySelectorAll('.tokens__background')].map((card) => ({
  name: card.querySelector('h4').textContent,
  roles: card.querySelectorAll('.tokens__role').length,
  low: [...card.querySelectorAll('[data-low]')].map((r) => r.dataset.token),
})));
check('five backgrounds, ten roles each', bgs.length === BACKGROUNDS.length && bgs.every((b) => b.roles === 10), bgs.map((b) => `${b.name} ${b.roles}`).join(', '));

// Every theme: values follow the theme switch, and every text role passes (as theme-contrast.mjs).
const brand = () => p.evaluate(() => document.querySelector('[data-token="--palette-brand"] [data-hex]').textContent);
const brands = new Set();
for (const theme of THEMES) {
  await pick(p, 'theme', theme);
  await wait(100);
  brands.add(await brand());
  const low = await p.evaluate(() => [...document.querySelectorAll('[data-low]')].map((r) => r.closest('.tokens__background')?.querySelector('h4').textContent + ' ' + r.dataset.token));
  check(`${theme || 'default'} theme: every text colour shown passes its contrast minimum`, low.length === 0, low.join(', ') || 'all pass');
}
check('the brand colour shown changes with the theme', brands.size === THEMES.length, [...brands].join(' '));
await pick(p, 'theme', '');

// The page background switch recolours the page; the listed tokens are unchanged.
for (const bg of BACKGROUNDS) {
  await pick(p, 'background', bg);
  await wait(100);
  check(`page background ${bg}: values stay filled in`, (await empty()).length === 0);
}
await pick(p, 'background', 'white');
await axeCheck(p, 'axe: white page background');
await pick(p, 'background', 'black');
await axeCheck(p, 'axe: black page background');
await pick(p, 'background', 'white');

// Phone: nothing wider than the screen. At 320px (where fluid sizes start growing) they're at their smallest.
await p.setViewport({ width: 320, height: 800, isMobile: true });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check('phone: no sideways scrolling', overflow <= 0, `${overflow}px`);
const spaceNow = await p.evaluate(() => document.querySelector('[data-token="--space-s"] [data-now]').textContent);
check('phone: fluid sizes are at their small-screen size', spaceNow === '16px', `--space-s ${spaceNow}`);
await p.screenshot({ path: SHOTS + '/tokens-320.png', fullPage: true });

// The overview and the sidebar link to it.
await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
const links = await p.evaluate(() => [...document.querySelectorAll('a[href="/components/tokens/"]')].map((a) => a.closest('.docs-nav, .component-list') ? 'found' : ''));
check('the overview and the sidebar link to the Tokens page', links.filter(Boolean).length === 2, `${links.length} links`);

await finish();
