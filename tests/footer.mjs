// Footer: layout at each screen size (stacked on phones, brand beside the columns when there's
// room), size and position unchanged on every background and theme, text/link/icon contrast, 44px tap
// targets, landmarks and names, the current page, new tabs, site links, the logo for dark
// backgrounds, no JavaScript needed, axe.
import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/';
const p = await newPage();

// The Single line layout (seeded with FOOTER_LAYOUT=line, see README.md) gets its own checks.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
if (await p.$('.site-footer--line')) {
  info('Footer layout: Single line');
  const lineGeometry = () => p.evaluate(() => [...document.querySelectorAll('.site-footer, .site-footer__line')].map((el) => { const b = el.getBoundingClientRect(); return [b.left, b.top + scrollY, b.width, b.height].map(Math.round).join(','); }).join(' | '));
  for (const w of [375, 800, 1440]) {
    await p.setViewport({ width: w, height: 900 });
    await p.goto(PAGE, { waitUntil: 'networkidle0' });
    await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
    check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
    const edges = await p.evaluate(() => [document.querySelector('.site-footer__line'), document.querySelector('.site-nav__bar')].map((el) => Math.round(el.getBoundingClientRect().left)));
    check(`${w}px: the line starts where the navigation does (same Width)`, edges[0] === edges[1], edges.join(' vs '));
    const base = await lineGeometry(), moved = [];
    for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
      await pick(p, kind, v); await wait(120);
      if ((await lineGeometry()) !== base) moved.push(v);
    }
    check(`${w}px: the line keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
    await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(120);
    await p.evaluate(() => document.querySelector('.site-footer').scrollIntoView());
    const box = await p.evaluate(() => { const b = document.querySelector('.site-footer').getBoundingClientRect(); return { y: b.top + scrollY, h: b.height }; });
    await p.screenshot({ path: `${SHOTS}/footer-line-${w}.png`, clip: { x: 0, y: box.y, width: w, height: box.h }, captureBeyondViewport: true });
  }
  const s = await p.evaluate(() => {
    const f = document.querySelector('.site-footer');
    return { text: f.innerText.trim(), extras: f.querySelectorAll('a, nav, img, h2, ul').length, landmark: f.tagName === 'FOOTER' && !f.closest('main') };
  });
  check('only the line: no logo, links, headings or lists', s.extras === 0);
  check('the line shows the © years, name and small print', new RegExp(`^© 2024–${new Date().getFullYear()} RNNBRWN Test pages, not indexed\\.$`).test(s.text), s.text);
  check('the footer is a page-level <footer> (a contentinfo landmark)', s.landmark);
  const low = [];
  for (const theme of THEMES) for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(100);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      return contrastRatio(rgb(getComputedStyle(document.querySelector('.site-footer__line')).color), rgb(getComputedStyle(document.querySelector('.site-footer')).backgroundColor));
    });
    low.push([`${theme || 'default'}/${bg}`, r]);
  }
  const fails = low.filter(([, r]) => r < 4.5);
  check('the line is at least 4.5:1 on every background × theme', fails.length === 0, fails.map(([w, r]) => `${w} ${r.toFixed(2)}`).join(', ') || `lowest ${Math.min(...low.map(([, r]) => r)).toFixed(2)}:1`);
  await pick(p, 'theme', ''); await pick(p, 'background', 'white');
  await axeCheck(p, 'axe scan of the footer', '.site-footer');
  await finish();
  process.exit(0);
}

// Boxes of the footer's parts, to compare between backgrounds and themes.
const geometry = () => p.evaluate(() => {
  const r = (el) => [el.left, el.top + scrollY, el.width, el.height].map(Math.round).join(',');
  return [...document.querySelectorAll('.site-footer, .site-footer__brand, .site-footer__column, .site-footer__bottom')].map((el) => r(el.getBoundingClientRect())).join(' | ');
});

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));

  const layout = await p.evaluate(() => {
    const brand = document.querySelector('.site-footer__brand').getBoundingClientRect();
    const nav = document.querySelector('.site-footer__columns').getBoundingClientRect();
    const tops = [...document.querySelectorAll('.site-footer__column')].map((c) => Math.round(c.getBoundingClientRect().top));
    return { beside: Math.abs(brand.top - nav.top) < 2 && nav.left > brand.right, perRow: tops.filter((t) => t === tops[0]).length };
  });
  if (w === 1440) check(`${w}px: brand area beside the columns, all four in one row`, layout.beside && layout.perRow === 4, `${layout.perRow} in the first row`);
  else check(`${w}px: brand area above the columns`, !layout.beside);
  if (w === 375) check(`${w}px: two columns side by side on a phone`, layout.perRow === 2, `${layout.perRow} in the first row`);
  info(`${w}px: ${layout.perRow} columns in the first row`);

  const base = await geometry();
  const moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(120);
    if ((await geometry()) !== base) moved.push(v);
  }
  check(`${w}px: footer keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);

  const small = await p.evaluate(() => [...document.querySelectorAll('.site-footer a')]
    .map((a) => { const b = a.getBoundingClientRect(); return [a.textContent.trim() || a.getAttribute('href'), Math.round(b.height), Math.round(b.width)]; })
    .filter(([, h, wd]) => h < 44 || wd < 24));
  check(`${w}px: every footer link is at least 44px tall`, small.length === 0, small.slice(0, 3).map((s) => s.join(' ')).join('; '));

  await p.evaluate(() => document.querySelector('.site-footer').scrollIntoView());
  const box = await p.evaluate(() => { const b = document.querySelector('.site-footer').getBoundingClientRect(); return { y: b.top + scrollY, h: b.height }; });
  await p.screenshot({ path: `${SHOTS}/footer-${w}.png`, clip: { x: 0, y: box.y, width: w, height: box.h }, captureBeyondViewport: true });
}

// Contrast: text, muted text, links and icons against the footer's background, every background × theme.
await p.setViewport({ width: 1440, height: 900 });
const worst = [];
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const footer = document.querySelector('.site-footer');
      const bg = rgb(getComputedStyle(footer).backgroundColor);
      const text = [...footer.querySelectorAll('.site-footer__text, .site-footer__heading, .site-footer__links a, .site-footer__bottom p, .site-footer__small-links a, .site-footer__logo span')];
      const minText = Math.min(...text.map((t) => contrastRatio(rgb(getComputedStyle(t).color), bg)));
      const icons = [...footer.querySelectorAll('.site-footer__social a')];
      const minIcon = Math.min(...icons.map((a) => contrastRatio(rgb(getComputedStyle(a).color), bg)));
      return { minText, minIcon };
    });
    worst.push({ where: `${theme || 'default'}/${bg}`, ...r });
  }
}
const lowText = worst.filter((x) => x.minText < 4.5), lowIcon = worst.filter((x) => x.minIcon < 3);
check('text and links are at least 4.5:1 on every background × theme', lowText.length === 0, lowText.map((x) => `${x.where} ${x.minText.toFixed(2)}`).join(', ') || `lowest ${Math.min(...worst.map((x) => x.minText)).toFixed(2)}:1`);
check('social icons are at least 3:1 on every background × theme', lowIcon.length === 0, lowIcon.map((x) => x.where).join(', ') || `lowest ${Math.min(...worst.map((x) => x.minIcon)).toFixed(2)}:1`);

// The logo for dark backgrounds replaces the normal one on Black and Brand.
const logos = {};
for (const bg of BACKGROUNDS) {
  await pick(p, 'theme', ''); await pick(p, 'background', bg); await wait(100);
  logos[bg] = await p.evaluate(() => [...document.querySelectorAll('.site-footer__logo img')].filter((i) => i.getBoundingClientRect().width > 0).map((i) => i.src.split('/').pop()).join(','));
}
check('the dark-background logo shows on Black and Brand, the normal one elsewhere', logos.black.includes('dark') && logos.brand.includes('dark') && !logos.white.includes('dark') && !logos.surface.includes('dark') && !logos.accent.includes('dark'), JSON.stringify(logos));
await pick(p, 'background', 'white');

// Structure and names
const s = await p.evaluate(() => {
  const f = document.querySelector('.site-footer');
  return {
    landmark: f.tagName === 'FOOTER' && !f.closest('main, article, section'),
    navs: [...f.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')),
    socialNames: [...f.querySelectorAll('.site-footer__social a')].map((a) => a.textContent.trim()),
    iconsHidden: [...f.querySelectorAll('.site-footer__social svg')].every((svg) => svg.getAttribute('aria-hidden') === 'true'),
    headings: [...f.querySelectorAll('h2')].map((h) => h.textContent.trim()),
    current: [...f.querySelectorAll('[aria-current="page"]')].map((a) => a.getAttribute('href')),
    newTab: [...f.querySelectorAll('a[target="_blank"]')].map((a) => [a.rel, a.textContent.includes('(opens in a new tab)')]),
    cmsLinks: [...f.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => h.includes('localhost:8080')),
    copyright: f.querySelector('.site-footer__bottom p').textContent.replace(/\s+/g, ' ').trim(),
    hashLinks: [...f.querySelectorAll('a')].filter((a) => a.getAttribute('href') === '#').length,
  };
});
check('the footer is a page-level <footer> (a contentinfo landmark)', s.landmark);
check('two navigation landmarks with their own names', s.navs.join(',') === 'Footer,Small print', s.navs.join(','));
check('social links are named after their platform, icons hidden from screen readers', s.socialNames.every(Boolean) && s.iconsHidden, s.socialNames.join(', '));
check('column headings are h2s; a # heading is text, not a link', s.headings.join(',') === 'Sections,Parts,Elsewhere' && s.hashLinks === 0, s.headings.join(','));
check('the current page is marked in the footer', s.current.includes('/components/'), s.current.join(','));
check('a new-tab link says so and has rel=noopener', s.newTab.length > 0 && s.newTab.every(([rel, note]) => rel.includes('noopener') && note));
check('links to the CMS became site links', s.cmsLinks.length === 0, s.cmsLinks.join(' '));
check('© line shows the year range, name and small print', new RegExp(`^© 2024–${new Date().getFullYear()} RNNBRWN Test pages, not indexed\\.$`).test(s.copyright), s.copyright);

// Keyboard: focus outline on a footer link and on a social icon.
const ring = [];
for (const sel of ['.site-footer__links a', '.site-footer__social a']) {
  await p.focus(sel); await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift'); await p.keyboard.press('Tab');
  ring.push(await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle));
}
check('keyboard focus shows an outline on links and icons', ring.every((r) => r === 'solid'), ring.join(','));

await axeCheck(p, 'axe scan of the footer (white)', '.site-footer');
await pick(p, 'background', 'black'); await wait(120);
await axeCheck(p, 'axe scan of the footer (black)', '.site-footer');

// No JavaScript: the footer doesn't use any, so it's the same.
const withJs = await p.evaluate(() => document.querySelector('.site-footer').innerText);
const noJs = await newPage({ errors: false });
await noJs.setJavaScriptEnabled(false);
await noJs.setViewport({ width: 1440, height: 900 });
await noJs.goto(PAGE, { waitUntil: 'networkidle0' });
check('without JavaScript the footer shows the same content', (await noJs.evaluate(() => document.querySelector('.site-footer').innerText)) === withJs);

// On every other test page too.
const pages = await p.evaluate(() => [...document.querySelectorAll('.site-footer__links a')].filter((a) => a.origin === location.origin).map((a) => a.href));
const missing = [];
for (const url of pages) {
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  if (!(await p.$('.site-footer'))) missing.push(url);
}
check('every page linked from the footer has the footer', missing.length === 0 && pages.length > 0, missing.join(' ') || `${pages.length} pages`);
await finish();
