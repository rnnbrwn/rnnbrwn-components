import { BASE, SHOTS, SURFACES, BRANDS, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/card-grid/';
const p = await newPage();

// Every grid: its label (heading, or the first card's), columns used, and each card's box.
const grids = () => p.evaluate(() => [...document.querySelectorAll('.card-grid')].map((g) => {
  const cards = [...g.querySelectorAll('.card')];
  const boxes = cards.map((c) => { const r = c.getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(','); });
  const pad = parseFloat(getComputedStyle(g.querySelector('.card-grid__cards')).getPropertyValue('--card-pad')) || 0;
  const probe = document.createElement('div'); probe.style.width = 'var(--card-pad)'; g.querySelector('.card-grid__cards').append(probe);
  const padPx = probe.getBoundingClientRect().width; probe.remove();
  return {
    name: (g.querySelector('.card-grid__heading') ?? g.querySelector('.card__heading')).textContent.trim(),
    columns: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size,
    boxes: boxes.join(' '),
    padPx,
    plain: g.classList.contains('card-grid--plain'),
    headingLeft: Math.round(g.querySelector('.card-grid__heading')?.getBoundingClientRect().left ?? -1),
    firstCardLeft: Math.round(cards[0].getBoundingClientRect().left),
    // the painted panel (card box + --card-pad all round) stays on screen
    onScreen: cards.every((c) => { const r = c.getBoundingClientRect(); return r.left - padPx >= -0.5 && r.right + padPx <= innerWidth + 0.5; }),
    // two neighbouring panels never touch or overlap
    minPanelGap: Math.min(99, ...cards.flatMap((c, i) => cards.slice(i + 1).map((d) => {
      const a = c.getBoundingClientRect(), e = d.getBoundingClientRect();
      const dx = Math.max(e.left - a.right, a.left - e.right), dy = Math.max(e.top - a.bottom, a.top - e.bottom);
      return Math.max(dx, dy) - 2 * padPx;
    }))),
    // Last card: its width and right edge against the others, and its image height
    fill: g.classList.contains('card-grid--fill'),
    last: (() => {
      const r = cards.map((c) => c.getBoundingClientRect()), l = r.at(-1);
      const imgs = [...g.querySelectorAll('.card__image')].map((i) => Math.round(i.getBoundingClientRect().height));
      return { count: cards.length, width: Math.round(l.width), firstWidth: Math.round(r[0].width), right: Math.round(l.right), rowRight: Math.round(Math.max(...r.map((x) => x.right))), imgs: new Set(imgs).size };
    })(),
    ratios: [...g.querySelectorAll('.card__image')].map((i) => i.getBoundingClientRect().width / i.getBoundingClientRect().height),
  };
}));

// Expected columns at 1440px for each grid (by its seed heading), and at 375px always 1.
const WIDE = { '4 cards in 3 columns': 3, '5 cards in 3 columns': 3, '6 cards in 4 columns': 4, 'row is already full': 3, '3 columns, Panel': 3, '3 columns, Plain': 3, '2 columns, narrow': 2, '4 columns, wide': 4, '4 columns, Plain, full': 4, '4 columns, Panel, on Dark': 4, 'Text only': 3, 'one card': 1, 'wide content': 4 };
const expectAt1440 = (name) => Object.entries(WIDE).find(([k]) => name.includes(k))?.[1];

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await grids();
  info(`${w}px columns: ${base.map((g) => `${g.name.replace('Card Grid: ', '').slice(0, 22)}=${g.columns}`).join(', ')}`);
  if (w === 375) check('375px: every grid is one column', base.every((g) => g.columns === 1));
  if (w === 1440) {
    const wrong = base.filter((g) => expectAt1440(g.name) !== g.columns).map((g) => `${g.name}: ${g.columns}`);
    check('1440px: every grid shows the columns the editor picked', wrong.length === 0, wrong.join('; '));
  }
  check(`${w}px: card panels stay on screen`, base.every((g) => g.onScreen), base.filter((g) => !g.onScreen).map((g) => g.name).join('; '));
  const gap = Math.min(...base.filter((g) => !g.plain).map((g) => g.minPanelGap));
  check(`${w}px: neighbouring panels never touch`, gap > 4, `smallest gap ${gap.toFixed(1)}px`);
  const misaligned = base.filter((g) => g.headingLeft >= 0 && g.headingLeft !== g.firstCardLeft).map((g) => g.name);
  check(`${w}px: cards line up with the section heading`, misaligned.length === 0, misaligned.join('; '));
  check(`${w}px: Panel and Plain cards are exactly the same size and position`, base[0].boxes.split(' ').map((x) => x.split(',').slice(0, 1).concat(x.split(',').slice(2)).join()).join() === base[1].boxes.split(' ').map((x) => x.split(',').slice(0, 1).concat(x.split(',').slice(2)).join()).join());
  // It should stretch only when its row isn't already full.
  const fillWrong = base.filter((g) => g.fill && (g.last.right !== g.last.rowRight || (g.last.count % g.columns ? g.last.width <= g.last.firstWidth : g.last.width !== g.last.firstWidth))).map((g) => g.name);
  check(`${w}px: "Fill the row": the last card reaches the end of its row (and only stretches when there's space)`, fillWrong.length === 0, fillWrong.join('; '));
  const colWrong = base.filter((g) => !g.fill && g.last.width !== g.last.firstWidth).map((g) => g.name);
  check(`${w}px: "Column width": the last card is as wide as the others`, colWrong.length === 0, colWrong.join('; '));
  const imgWrong = base.filter((g) => g.last.imgs > 1).map((g) => g.name);
  check(`${w}px: every image in a grid is the same height, a stretched last card's too`, imgWrong.length === 0, imgWrong.join('; '));
  const badRatio = base.flatMap((g) => g.ratios.slice(0, g.fill ? -1 : undefined)).filter((r) => Math.abs(r - 1.5) > 0.02);
  check(`${w}px: every card image is cropped to 3:2`, badRatio.length === 0, badRatio.map((r) => r.toFixed(2)).join(', '));
  let moved = [];
  for (const [kind, v] of [...SURFACES.slice(1).map((s) => ['surface', s]), ...BRANDS.slice(1).map((s) => ['brand', s])]) {
    await pick(p, kind, v); await wait(150);
    (await grids()).forEach((g, i) => { if (g.boxes !== base[i].boxes) moved.push(`${g.name} on ${v}`); });
  }
  check(`${w}px: every card keeps its size and position on every page surface and brand`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(150);
  const top = await p.evaluate(() => document.querySelector('.card-grid').getBoundingClientRect().top + scrollY - 10);
  const height = await p.evaluate(() => { const g = document.querySelectorAll('.card-grid'); return g[1].getBoundingClientRect().bottom - g[0].getBoundingClientRect().top + 20; });
  await p.screenshot({ path: `${SHOTS}/card-grid-${w}.png`, clip: { x: 0, y: top, width: w, height: Math.min(height, 4000) } });
}

// Contrast: every card text against what's actually behind it (the card fill for Panel, the
// section's colour for Plain), on every page surface × brand.
await p.setViewport({ width: 1440, height: 900 });
let worst = 99, worstWhere = '';
for (const brand of BRANDS) {
  for (const surface of SURFACES) {
    await pick(p, 'brand', brand); await pick(p, 'surface', surface); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      let min = 99, where = '';
      for (const card of document.querySelectorAll('.card')) {
        const plain = card.closest('.card-grid--plain');
        const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; card.append(probe);
        const bg = rgb(plain ? getComputedStyle(probe).backgroundColor : getComputedStyle(card, '::before').backgroundColor); probe.remove();
        for (const t of card.querySelectorAll('.card__eyebrow, .card__heading, .card__text, .card__more')) {
          const c = contrastRatio(rgb(getComputedStyle(t).color), bg);
          if (c < min) { min = c; where = `${t.className.split(' ').find((x) => x.startsWith('card__'))} in "${card.closest('.card-grid').querySelector('.card-grid__heading, .card__heading').textContent.trim().slice(11, 50)}"`; }
        }
      }
      // The section's own eyebrow, heading and intro, against the section's colour.
      for (const t of document.querySelectorAll('.card-grid__eyebrow, .card-grid__heading, .card-grid__intro')) {
        const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; t.parentElement.append(probe);
        const c = contrastRatio(rgb(getComputedStyle(t).color), rgb(getComputedStyle(probe).backgroundColor)); probe.remove();
        if (c < min) { min = c; where = `${t.className.split(' ').find((x) => x.startsWith('card-grid__'))} in "${t.closest('.card-grid').querySelector('.card-grid__heading')?.textContent.trim().slice(11, 50)}"`; }
      }
      return { min, where };
    });
    if (r.min < worst) { worst = r.min; worstWhere = `${r.where}, ${surface} page, ${brand || 'library default'} brand`; }
  }
}
check('card and section text contrast (incl. eyebrows) ≥ 4.5:1 on every surface × brand', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
await pick(p, 'surface', 'light'); await pick(p, 'brand', '');

// Links: one per linked card, named by its heading, stretched over the whole card.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const linkInfo = await p.evaluate(() => [...document.querySelectorAll('.card')].map((c) => ({
  heading: c.querySelector('.card__heading').textContent.trim(),
  links: c.querySelectorAll('a').length,
  linkText: c.querySelector('a')?.textContent.trim() ?? null,
  href: c.querySelector('a')?.getAttribute('href') ?? null,
  more: c.querySelector('.card__more')?.getAttribute('aria-hidden') ?? null,
  target: c.querySelector('a')?.target,
  rel: c.querySelector('a')?.rel,
})));
check('each card has at most one link', linkInfo.every((l) => l.links <= 1));
check('a card link is named by its heading', linkInfo.filter((l) => l.links).every((l) => l.linkText.startsWith(l.heading.replace(' (opens in a new tab)', ''))));
check('cards without a link have no link or arrow', linkInfo.filter((l) => !l.links).every((l) => l.more === null) && linkInfo.some((l) => !l.links));
check('"Read more →" is hidden from screen readers (not a second link)', linkInfo.filter((l) => l.links).every((l) => l.more === 'true'));
const nt = linkInfo.find((l) => l.target === '_blank');
check('a new-tab card says so and has rel=noopener', nt && nt.rel.includes('noopener') && nt.linkText.includes('(opens in a new tab)'));
check('card links to the CMS became site links', linkInfo.every((l) => !l.href?.includes('localhost:8080')), [...new Set(linkInfo.map((l) => l.href))].join(' '));
const eyebrows = await p.evaluate(() => [...document.querySelectorAll('.card-grid')].map((g) => {
  const e = g.querySelector('.card-grid__eyebrow'), h = g.querySelector('.card-grid__heading');
  return { name: h?.textContent ?? '', has: !!e, before: !e || !h || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) };
}));
check('the section eyebrow shows only when set, just above the heading', eyebrows.every((e) => e.before) && eyebrows.some((e) => e.has) && !eyebrows.find((e) => e.name.includes('no section eyebrow')).has, `${eyebrows.filter((e) => e.has).length} of ${eyebrows.length} grids have one`);
const levels = await p.evaluate(() => [...document.querySelectorAll('.card-grid')].map((g) => `${g.querySelector('.card-grid__heading') ? 'h2' : '-'}>${g.querySelector('.card__heading').tagName.toLowerCase()}`));
check('card headings are h3 under a section heading, h2 without one', levels.every((l) => l === 'h2>h3' || l === '->h2') && levels.includes('->h2'), [...new Set(levels)].join(' '));

// Click on the image corner of the card that links to #card-grid: the whole card is the link.
const corner = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card')].find((c) => c.querySelector('a')?.getAttribute('href') === '#card-grid');
  card.scrollIntoView({ block: 'center' });
  const r = card.querySelector('.card__image').getBoundingClientRect();
  return { x: r.left + 8, y: r.top + 8 };
});
await wait(100);
await p.mouse.click(corner.x, corner.y); await wait(200);
check('clicking anywhere on a linked card follows its link', await p.evaluate(() => location.hash === '#card-grid'));
// Hover lifts a Panel card.
const hoverCard = await p.evaluate(() => { const c = document.querySelector('.card-grid--panel .card--link'); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.mouse.move(hoverCard.x, hoverCard.y); await wait(300);
const hover = await p.evaluate(() => { const c = document.querySelector('.card-grid--panel .card--link'); return { shadow: getComputedStyle(c, '::before').boxShadow, underline: getComputedStyle(c.querySelector('.card__heading')).textDecorationLine }; });
check('hovering a linked Panel card lifts it and underlines its heading', hover.shadow !== 'none' && hover.underline === 'underline', `${hover.underline}; shadow ${hover.shadow === 'none' ? 'none' : 'yes'}`);
await p.mouse.move(0, 0);

// Keyboard: Tab reaches each card link once, and the outline goes round the whole card.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.focus('.card__link');
const ring = await p.evaluate(() => { const a = document.activeElement, c = a.closest('.card').getBoundingClientRect(), after = getComputedStyle(a, '::after'); return { style: after.outlineStyle, inset: after.inset, cardW: Math.round(c.width) }; });
check('keyboard focus shows an outline round the whole card', ring.style === 'solid', `::after outline ${ring.style}, inset ${ring.inset}`);
const firstGrid = await p.evaluate(() => [...document.querySelector('.card-grid').querySelectorAll('a')].length);
const tabbed = [];
for (let i = 0; i < firstGrid; i++) { tabbed.push(await p.evaluate(() => document.activeElement.className)); await p.keyboard.press('Tab'); }
check('Tab goes card by card, then to the section\'s buttons', tabbed.filter((c) => c === 'card__link').length === firstGrid - 1 && tabbed.at(-1) !== 'card__link' || tabbed.every((c) => c === 'card__link' || c.includes('button')), tabbed.join(' → '));

// Reduced motion: no transitions.
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.card-grid--panel .card'), '::before').transitionDuration);
check('reduced motion: the hover lift has no animation', dur === '0s', dur);
await p.emulateMediaFeatures([]);

// No JavaScript: same cards.
const withJs = await p.evaluate(() => document.querySelectorAll('.card').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJsCards = await nojs.evaluate(() => document.querySelectorAll('.card').length);
check('without JavaScript every card is there', noJsCards === withJs && withJs > 0, `${noJsCards}/${withJs}`);
await nojs.close();

// Accessibility, on a light and a dark page.
for (const surface of ['light', 'dark']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', surface); await wait(150);
  await axeCheck(p, `axe scan of all Card Grids (${surface} page)`, '.card-grid');
}
await pick(p, 'surface', 'light');

await finish();
