import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/accordion/preview/';
const p = await newPage();

// Every Accordion: its layout (from its class), the boxes of its header, items and buttons, the
// title rows' boxes, and which items are open.
const sections = () => p.evaluate(() => [...document.querySelectorAll('.accordion')].map((s, i) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  return {
    name: s.querySelector('.accordion__heading')?.textContent.trim().replace('Accordion: ', '') || `section ${i + 1} (no heading)`,
    beside: s.classList.contains('accordion--beside'),
    header: box(s.querySelector('.accordion__header')),
    items: box(s.querySelector('.accordion__items')),
    buttons: box(s.querySelector('.accordion__buttons')),
    summaries: [...s.querySelectorAll('summary')].map(box),
    open: [...s.querySelectorAll('details')].map((d) => d.open),
  };
}));
const key = (list) => list.map((s) => JSON.stringify([s.header, s.items, s.buttons, s.summaries])).join('|');

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();

  // Beside: the items to the right of the header, their tops level, the buttons under the header,
  // once the section is at least 50rem wide; stacked (header above the items) otherwise.
  const layoutWrong = base.filter((s) => s.header && s.items).filter((s) => {
    const side = s.items.l >= s.header.r; // laid out side by side
    if (side) return !(s.beside && Math.abs(s.items.t - s.header.t) < 2 && (!s.buttons || (s.buttons.t >= s.header.b && s.buttons.r <= s.items.l)));
    return !(s.header.b <= s.items.t);
  }).map((s) => s.name);
  check(`${w}px: header beside the items (tops level, buttons under the header) or above them`, layoutWrong.length === 0, layoutWrong.join('; '));
  const besideNow = base.filter((s) => s.beside && s.items.l >= s.header.r).map((s) => s.name);
  if (w === 375) check('375px: every Accordion is stacked', besideNow.length === 0, besideNow.join('; '));
  if (w === 1440) {
    // The narrow "beside" test is 40rem wide: too narrow, so stacked.
    const want = base.filter((s) => s.beside && !s.name.includes('narrow')).map((s) => s.name);
    check('1440px: "Heading beside the items" sits beside them, except in a narrow section', want.length > 0 && want.every((n) => besideNow.includes(n)) && besideNow.length === want.length, besideNow.join('; '));
  }

  // Tap targets: every title row at least 44px tall and the full width of the items.
  const small = base.flatMap((s) => s.summaries.filter((b) => b.h < 44 || Math.abs(b.w - s.items.w) > 1).map(() => s.name));
  check(`${w}px: every title row is ≥ 44px tall and spans the items`, small.length === 0, [...new Set(small)].join('; '));

  const moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    if (key(await sections()) !== key(base)) moved.push(v);
  }
  check(`${w}px: everything keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.accordion'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[3].getBoundingClientRect().bottom - s[0].getBoundingClientRect().top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/accordion-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 4000) } });
}

// ---------- Opening and closing (1440px) ----------
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const start = await sections();
const firstOpenWrong = start.filter((s) => {
  const wantFirst = /first item open|Surface|Brand|Accent|Black/.test(s.name);
  return s.open[0] !== wantFirst || s.open.slice(1).some(Boolean);
}).map((s) => s.name);
check('only the first item starts open, and only where "First item starts open" is on', firstOpenWrong.length === 0, firstOpenWrong.join('; '));

// Several at once (section 1): open two, both stay open; click again to close.
const openState = (i) => p.evaluate((i) => [...document.querySelectorAll('.accordion')[i].querySelectorAll('details')].map((d) => d.open), i);
const clickTitle = async (i, n) => { await p.evaluate((i, n) => document.querySelectorAll('.accordion')[i].querySelectorAll('summary')[n].scrollIntoView({ block: 'center' }), i, n); await (await p.$$(`.accordion`))[i].$$('summary').then((s) => s[n].click()); await wait(350); };
await clickTitle(0, 0); await clickTitle(0, 1);
check('"Several at once": two items open together', JSON.stringify(await openState(0)) === '[true,true,false,false]', JSON.stringify(await openState(0)));
await clickTitle(0, 0);
check('clicking an open title closes it', JSON.stringify(await openState(0)) === '[false,true,false,false]', JSON.stringify(await openState(0)));

// One at a time (section 2, first open): opening another closes it.
await clickTitle(1, 2);
check('"One at a time": opening an item closes the open one', JSON.stringify(await openState(1)) === '[false,false,true,false]', JSON.stringify(await openState(1)));
const groups = await p.evaluate(() => [...document.querySelectorAll('.accordion')].map((s) => [...new Set([...s.querySelectorAll('details')].map((d) => d.name))]));
const oneAtATime = groups.filter((g) => g[0]);
check('each "One at a time" section has its own group name; the others have none', oneAtATime.length === 2 && new Set(oneAtATime.map((g) => g[0])).size === 2 && groups.every((g) => g.length === 1), JSON.stringify(groups));

// The icon: + closed (upright bar turned 90°), − open (turned 180°, flat).
const icons = await p.evaluate(() => [...document.querySelectorAll('.accordion')[1].querySelectorAll('details')].map((d) => getComputedStyle(d.querySelector('.accordion__icon'), '::after').rotate));
check('the icon is + when closed and − when open', JSON.stringify(icons) === '["90deg","90deg","180deg","90deg"]', icons.join(' '));
check('the icon is hidden from screen readers', await p.evaluate(() => [...document.querySelectorAll('.accordion__icon')].every((i) => i.getAttribute('aria-hidden') === 'true')));

// Hover underlines the title.
const [s0] = await (await p.$$('.accordion'))[0].$$('summary'); await s0.hover(); await wait(100);
check('hovering a title underlines it', await p.evaluate(() => getComputedStyle(document.querySelector('.accordion summary:hover .accordion__title')).textDecorationLine === 'underline'));

// Keyboard: Tab reaches each title in order; Enter and Space open and close.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.querySelector('.accordion__intro').setAttribute('tabindex', '-1'));
await p.focus('.accordion__intro');
await p.keyboard.press('Tab');
const focus1 = await p.evaluate(() => document.activeElement === document.querySelector('.accordion summary'));
await p.keyboard.press('Enter'); await wait(350);
const afterEnter = await openState(0);
await p.keyboard.press('Space'); await wait(350);
const afterSpace = await openState(0);
await p.keyboard.press('Tab');
const focus2 = await p.evaluate(() => document.activeElement.textContent.trim().startsWith('What does it cost?'));
const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
check('Tab reaches the titles in order, with a focus outline', focus1 && focus2 && ring === 'solid', `first ${focus1}, second ${focus2}, outline ${ring}`);
check('Enter opens a focused item and Space closes it', afterEnter[0] === true && afterSpace[0] === false, `${afterEnter[0]} → ${afterSpace[0]}`);

// Motion: opening slides where the browser supports animating <details>; none with reduced motion.
const opening = async () => {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  return p.evaluate(async () => {
    const d = document.querySelector('.accordion details'); const closed = d.getBoundingClientRect().height;
    d.open = true; await new Promise((r) => setTimeout(r, 60)); const mid = d.getBoundingClientRect().height;
    await new Promise((r) => setTimeout(r, 400)); const end = d.getBoundingClientRect().height;
    return { closed, mid, end, supported: CSS.supports('selector(::details-content)') && CSS.supports('interpolate-size: allow-keywords') };
  });
};
const anim = await opening();
if (anim.supported) check('opening slides open (part-way after 60ms)', anim.mid > anim.closed + 1 && anim.mid < anim.end - 1, `${anim.closed.toFixed(0)} → ${anim.mid.toFixed(0)} → ${anim.end.toFixed(0)}px`);
else info('this Chrome can\'t animate <details>: opening snaps (expected fallback)');
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const still = await opening();
check('with reduced motion an item opens at once', Math.abs(still.mid - still.end) < 1, `${still.mid.toFixed(0)} vs ${still.end.toFixed(0)}px after 60ms`);
await p.emulateMediaFeatures([]);

// ---------- Contrast: every text, link and the icon, all items open, every background × theme ----------
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.querySelectorAll('.accordion details').forEach((d) => { d.removeAttribute('name'); d.open = true; }));
let worst = 99, worstWhere = '', worstIcon = 99, worstIconWhere = '';
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const bgOf = (t) => { const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; t.closest('.accordion__inner').append(probe); const c = rgb(getComputedStyle(probe).backgroundColor); probe.remove(); return c; };
      const where = (t) => `${t.tagName.toLowerCase()}.${t.className || ''} in "${t.closest('.accordion').querySelector('.accordion__heading')?.textContent.slice(11, 50) ?? '(no heading)'}"`;
      let min = 99, at = '', icon = 99, iconAt = '';
      for (const t of document.querySelectorAll('.accordion__eyebrow, .accordion__heading, .accordion__intro, .accordion__title, .accordion .prose :is(p, li, h3, a), .accordion .button--text')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), bgOf(t));
        if (c < min) { min = c; at = where(t); }
      }
      for (const t of document.querySelectorAll('.accordion__icon')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), bgOf(t));
        if (c < icon) { icon = c; iconAt = where(t); }
      }
      return { min, at, icon, iconAt };
    });
    const label = `${bg} page, ${theme || 'library default'} theme`;
    if (r.min < worst) { worst = r.min; worstWhere = `${r.at}, ${label}`; }
    if (r.icon < worstIcon) { worstIcon = r.icon; worstIconWhere = `${r.iconAt}, ${label}`; }
  }
}
check('text and link contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
check('icon contrast ≥ 3:1 (a graphic) on every background × theme', worstIcon >= 3, `lowest ${worstIcon.toFixed(2)}:1: ${worstIconWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// ---------- Structure ----------
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const structure = await p.evaluate(() => [...document.querySelectorAll('.accordion')].map((s) => {
  const h = s.querySelector('.accordion__heading'), e = s.querySelector('.accordion__eyebrow');
  return {
    h2: !h || h.tagName === 'H2',
    eyebrowFirst: !e || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING),
    native: [...s.querySelectorAll('.accordion__item')].every((d) => d.tagName === 'DETAILS' && d.firstElementChild.tagName === 'SUMMARY'),
    cmsLinks: [...s.querySelectorAll('a')].filter((a) => a.href.includes('localhost:8080')).length,
  };
}));
check('headings are h2, with the eyebrow just above', structure.every((s) => s.h2 && s.eyebrowFirst));
check('every item is a native <details> with a <summary>', structure.every((s) => s.native));
check('links to the CMS became site links', structure.every((s) => s.cmsLinks === 0));

// No JavaScript: every item is there, and opening still works (it's the browser's own).
const withJs = await p.evaluate(() => document.querySelectorAll('.accordion details').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJs = await nojs.evaluate(() => document.querySelectorAll('.accordion details').length);
const [firstSummary] = await nojs.$$('.accordion summary'); await firstSummary.click(); await wait(350);
const opensNoJs = await nojs.evaluate(() => document.querySelector('.accordion details').open);
check('without JavaScript every item is there and opens', noJs === withJs && withJs > 0 && opensNoJs, `${noJs}/${withJs}, opens: ${opensNoJs}`);
await nojs.close();

// Accessibility, on a white and a black page, with every item open.
for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await p.evaluate(() => document.querySelectorAll('.accordion details').forEach((d) => { d.removeAttribute('name'); d.open = true; }));
  await axeCheck(p, `axe scan of all Accordion sections, items open (${bg} page)`, '.accordion');
}

await finish();
