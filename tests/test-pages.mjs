import { BASE, SHOTS, check, wait, newPage, axeCheck, finish } from './lib.mjs';
// The component pages themselves (rnnbrwn.xyz's ComponentsLayout.astro): the sidebar reaches every
// page, each component page shows only its component in its preview area (one copy with Settings
// controls: playground.mjs checks those), the toolbar switches change the preview and not the page's
// own parts, and the test Navigation menu lists every page.

// Sidebar order: the overview and Example Site, Foundations, Sections, Parts, Site.
const PAGES = {
  Overview: '', 'Example Site': 'example-site', Tokens: 'tokens',
  Hero: 'hero', 'Rich Text': 'rich-text', 'Card Grid': 'card-grid', 'Media Text': 'media-text', Accordion: 'accordion', Stats: 'stats', Testimonials: 'testimonials', 'Contact Bar': 'contact-bar', 'CTA Banner': 'cta-banner',
  Buttons: 'buttons', Placeholder: 'placeholder',
  Navigation: 'navigation', Footer: 'footer',
};
const SECTIONS = ['Hero', 'Rich Text', 'Card Grid', 'Media Text', 'Accordion', 'Stats', 'Testimonials', 'Contact Bar', 'CTA Banner'];
const PARTS = ['Buttons', 'Placeholder'];
const SITE = ['Navigation', 'Footer'];

// The page's preview area (the one-copy view): its sections' components, how many show, and
// whether it has the site's Navigation and Footer.
const framed = (p) => p.evaluate(() => {
  const area = document.querySelector('[data-preview] [data-view-only="one"]');
  if (!area) return null;
  const sections = [...area.querySelectorAll('.l-page > section')];
  return {
    types: [...new Set(sections.filter((s) => s.className).map((s) => s.classList[0]))],
    shown: [...area.querySelectorAll('.l-page > *')].filter((s) => s.checkVisibility()).length,
    count: sections.length,
    tokens: !!area.querySelector('#colours'),
    playground: !!area.querySelector('[data-playground]'),
    nav: !!area.querySelector('.site-nav'),
    footer: !!area.querySelector('.site-footer'),
  };
});

for (const [label, viewport] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 375, height: 800, isMobile: true, hasTouch: true }]]) {
  const p = await newPage();
  await p.setViewport(viewport);
  await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
  const links = await p.evaluate(() => [...document.querySelectorAll('.docs-nav a')].map((a) => a.textContent.replace(/\s*,.*$|\s*\d+\s*test versions$/, '').replace(/\d+$/, '').trim()));
  check(`${label}: the sidebar lists every page, grouped`, JSON.stringify(links) === JSON.stringify(Object.keys(PAGES)), links.join(' · '));
  if (label === 'phone') {
    const hidden = await p.evaluate(() => getComputedStyle(document.querySelector('.docs-nav')).display === 'none');
    check('phone: the sidebar is behind the Menu button', hidden);
  }
  for (const [name, slug] of Object.entries(PAGES)) {
    if (label === 'phone') { await p.tap('.docs-menu-toggle'); await wait(150); }
    const link = await p.evaluateHandle((n) => [...document.querySelectorAll('.docs-nav a')].find((a) => a.firstChild.textContent.trim() === n), name);
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }), label === 'phone' ? link.tap() : link.click()]);
    const r = await p.evaluate(() => ({
      path: location.pathname,
      h1: document.querySelector('h1')?.textContent.trim(),
      h1Count: document.querySelectorAll('h1').length,
      current: document.querySelector('.docs-nav [aria-current="page"]')?.firstChild.textContent.trim(),
      menuOpen: document.querySelector('.docs-nav')?.hasAttribute('data-open'),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    const want = slug ? `/components/${slug}/` : '/components/';
    const f = await framed(p);
    let shows;
    if (!slug) shows = f === null;
    else if (slug === 'tokens') shows = f?.tokens;
    else if (slug === 'example-site') shows = f?.nav && f.footer && f.count > 0;
    else if (SITE.includes(name)) shows = f?.nav && f.footer;
    else shows = f?.playground && f.types.length === 1 && f.shown === 1 && !f.nav && !f.footer;
    const expectH1 = slug ? name : 'Components';
    check(`${label}: "${name}" goes to ${want}, marked current, showing ${slug ? 'its preview' : 'no preview'}`,
      r.path === want && r.h1 === expectH1 && r.h1Count === 1 && r.current === name && !r.menuOpen && r.overflow <= 0 && shows,
      `${r.path}, h1 "${r.h1}", preview ${f ? `${f.types.join(', ') || (f.tokens ? 'tokens' : 'no sections')}${f.nav ? ', with Navigation and Footer' : ''}` : 'none'}`);
  }
  await p.close();
}

const p = await newPage();
await p.setViewport({ width: 1440, height: 900 });

// The overview, Sections, Parts and Site pages list their pages.
await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
const lists = await p.evaluate(() => [...document.querySelectorAll('.component-list')].map((ul) => [...ul.querySelectorAll('a')].map((a) => a.textContent.trim()).join(', ')));
check('overview lists Foundations, Sections, Parts and Site', JSON.stringify(lists) === JSON.stringify(['Tokens', SECTIONS.join(', '), PARTS.join(', '), SITE.join(', ')]), lists.join(' | '));
await p.screenshot({ path: SHOTS + '/overview-1440.png' });
for (const [page, names] of [['sections', SECTIONS], ['parts', PARTS], ['site', SITE]]) {
  await p.goto(`${BASE}/components/${page}/`, { waitUntil: 'networkidle0' });
  const listed = await p.evaluate(() => [...document.querySelectorAll('.component-list a')].map((a) => a.textContent.trim()).join(', '));
  check(`the ${page} page lists its pages`, listed === names.join(', '), listed);
}

// Toolbar: the theme and width change the preview area; the page background is set on it and on
// <body> (which decides panels, as on a real site), while the top bar, sidebar and page keep their
// colours. The theme and width carry over to the next page; the background starts again from WordPress.
await p.goto(BASE + '/components/card-grid/', { waitUntil: 'networkidle0' });
const own = () => p.evaluate(() => ['.docs-bar', '.docs-nav', '.docs-main'].map((sel) => getComputedStyle(document.querySelector(sel)).backgroundColor).join(' '));
const before = await own();
// On the view of all its test versions.
await p.click('[data-view="all"]');
await p.click('[data-set="background"][data-value="black"]');
await p.select('[data-set-theme]', 'forest');
await p.click('[data-set="width"][data-value="phone"]');
await wait(300);
const s = await p.evaluate(() => {
  const area = document.querySelector('[data-preview]');
  return {
    area: area.className, theme: area.dataset.theme ?? '', width: Math.round(area.getBoundingClientRect().width), body: document.body.className, rootTheme: document.documentElement.dataset.theme ?? '',
    // Sections on another background than the page's, and not full width: panels (painted by ::before).
    panels: [...document.querySelectorAll('[data-view-only="all"] .l-page > [class*="bg-"]:not(.bg-black):not([data-width="full"])')].map((s) => getComputedStyle(s, '::before').content !== 'none'),
    pressed: [...document.querySelectorAll('[data-set][aria-pressed="true"]')].map((b) => b.dataset.value).join(','),
  };
});
check('the switches change the preview (background, theme, 375px wide)', s.area.includes('bg-black') && s.body.includes('bg-black') && s.theme === 'forest' && s.width === 375 && s.pressed === 'black,phone', `${s.area}, body ${s.body}, ${s.theme}, ${s.width}px wide, pressed ${s.pressed}`);
check('…a section on another background becomes a panel on the black page, as on a real site', s.panels.length > 0 && s.panels.every(Boolean), `${s.panels.filter(Boolean).length} of ${s.panels.length} are panels`);
const after = await own();
check('…and not the top bar, sidebar or page', after === before && s.rootTheme === '', after);
await p.screenshot({ path: SHOTS + '/component-page-switched-1440.png' });
await p.goto(BASE + '/components/stats/', { waitUntil: 'networkidle0' });
const next = await p.evaluate(() => { const area = document.querySelector('[data-preview]'); return [area.dataset.theme, area.className, document.body.className, area.style.inlineSize]; });
check('on the next page the theme and width carry over; the background is WordPress\'s again', next[0] === 'forest' && next[1].includes('bg-white') && next[2].includes('bg-white') && next[3] === '375px', next.join(', '));
await p.select('[data-set-theme]', '');
await p.click('[data-set="width"][data-value="full"]');
await wait(300);

// A token in "Built from" goes to its section of the Tokens page, below the top bar.
const token = await p.evaluate(() => document.querySelector('.docs-chips a[href*="#spacing"]')?.getAttribute('href'));
await p.goto(BASE + token, { waitUntil: 'networkidle0' });
await wait(300);
const at = await p.evaluate(() => [Math.round(document.getElementById('spacing').getBoundingClientRect().top), Math.round(document.querySelector('.docs-bar').getBoundingClientRect().bottom)]);
check('a token in "Built from" opens the Tokens page at its section, below the top bar', token === '/components/tokens/#spacing' && at[0] >= at[1] && at[0] < 200, `${token}, section ${at[0]}px from the top`);

await p.goto(BASE + '/components/card-grid/', { waitUntil: 'networkidle0' });
await axeCheck(p, 'axe: a component page');
await p.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
await p.goto(BASE + '/components/card-grid/', { waitUntil: 'networkidle0' });
await p.tap('.docs-menu-toggle'); await wait(150);
await axeCheck(p, 'axe: phone, menu open');
await p.screenshot({ path: SHOTS + '/component-menu-375.png' });
await p.keyboard.press('Escape'); await wait(100);
const closed = await p.evaluate(() => [document.querySelector('.docs-nav').hasAttribute('data-open'), document.activeElement?.className]);
check('phone: Escape closes the menu and returns to its button', !closed[0] && closed[1] === 'docs-menu-toggle', closed.join(', '));
await p.close();

// The test Navigation menu (in the previews that have it) lists every page; sections, parts and
// site components are sub-links of Sections, Parts and Site.
{
  const p = await newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto(BASE + '/components/example-site/preview/', { waitUntil: 'networkidle0' });
  const menu = await p.evaluate(() => [...document.querySelectorAll('.site-nav__links a')].map((a) => a.textContent.trim()));
  const want = ['Components', 'Example Site', 'Sections', ...SECTIONS, 'Parts', ...PARTS, 'Site', ...SITE];
  check('the test Navigation menu lists every page (Sections, Parts and Site with sub-links)', JSON.stringify(menu) === JSON.stringify(want), menu.join(' · '));
  await p.close();
}

// Full width with a Content width: the section (and its background) reaches both screen edges,
// its content is exactly as wide as the chosen lane, centred. At 1440px the lanes are their
// full widths: narrow 640px, content 960px, wide 1280px.
{
  const p = await newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const LANES = { narrow: 640, content: 960, wide: 1280 };
  const wrong = [];
  let count = 0;
  for (const slug of ['placeholder', 'card-grid', 'media-text']) {
    await p.goto(`${BASE}/components/${slug}/preview/`, { waitUntil: 'networkidle0' });
    const found = await p.evaluate(() => [...document.querySelectorAll('main [data-width="full"][data-inner]')].map((s) => {
      const r = s.getBoundingClientRect(), c = [...s.children].find((k) => getComputedStyle(k).position !== 'absolute').getBoundingClientRect();
      return { lane: s.dataset.inner, left: r.left, right: r.right, inner: Math.round(c.width), centred: Math.abs((c.left - r.left) - (r.right - c.right)) < 1 };
    }));
    for (const f of found) {
      count++;
      if (f.left !== 0 || f.right !== 1440 || f.inner !== LANES[f.lane] || !f.centred) wrong.push(`${slug} ${f.lane}: ${f.inner}px`);
    }
    if (slug === 'placeholder') check('the Placeholder page has full-width sections with narrow and wide content', ['narrow', 'wide'].every((l) => found.some((f) => f.lane === l)));
  }
  check('full-width sections: background edge to edge, content as wide as its Content width', wrong.length === 0 && count > 0, wrong.join('; ') || `${count} sections`);
  await p.close();
}
await finish();
