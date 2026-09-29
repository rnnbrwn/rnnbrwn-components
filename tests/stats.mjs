import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/stats/preview/';
const p = await newPage();

// Every Stats section: its settings (from its classes), the width it measures (rem), the boxes of
// its header, list and buttons, and each figure's box, rules (which of ::before / ::after show)
// and text alignment.
const sections = () => p.evaluate(() => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  return [...document.querySelectorAll('.stats')].map((s, i) => ({
    name: s.querySelector('.stats__heading')?.textContent.trim().replace('Stats: ', '') || `section ${i + 1} (no heading)`,
    centre: s.classList.contains('stats--centre'),
    colour: s.classList.contains('stats--text') ? 'text' : 'brand',
    width: s.querySelector('.stats__inner').getBoundingClientRect().width / rem,
    header: box(s.querySelector('.stats__header')),
    list: box(s.querySelector('.stats__list')),
    buttons: box(s.querySelector('.stats__buttons')),
    items: [...s.querySelectorAll('.stats__item')].map((li) => ({
      ...box(li),
      above: getComputedStyle(li, '::before').display !== 'none',
      before: getComputedStyle(li, '::after').display !== 'none',
      align: getComputedStyle(li).textAlign,
      fits: [...li.children].every((c) => c.scrollWidth <= c.clientWidth + 1),
    })),
  }));
});
const key = (list) => list.map((s) => JSON.stringify([s.header, s.list, s.buttons, s.items.map((b) => [b.l, b.t, b.w, b.h])])).join('|');

// How many figures should share a row at this width: 2 from 30rem, 3 from 40rem, 4 as 2×2 from
// 30rem and 4 in a row from 50rem; one per row below that.
const wantColumns = (n, w) => (n === 1 ? 1 : n === 2 ? (w >= 30 ? 2 : 1) : n === 3 ? (w >= 40 ? 3 : 1) : w >= 50 ? 4 : w >= 30 ? 2 : 1);

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();

  // Columns: counted from how many figures share the first row's top.
  const colsWrong = base.filter((s) => {
    const cols = s.items.filter((b) => Math.abs(b.t - s.items[0].t) < 1).length;
    return cols !== wantColumns(s.items.length, s.width);
  }).map((s) => `${s.name}: ${s.items.filter((b) => Math.abs(b.t - s.items[0].t) < 1).length} across at ${s.width.toFixed(0)}rem`);
  check(`${w}px: figures share a row only when all of a row fits (2 / 3 / 2×2 or 4)`, colsWrong.length === 0, colsWrong.join('; '));

  // Rules: a rule above a figure exactly when it isn't in the first row, and one before it
  // exactly when it isn't first in its row.
  const rulesWrong = base.filter((s) => s.items.some((b, n) => {
    const firstRow = Math.abs(b.t - s.items[0].t) < 1;
    const firstInRow = n === 0 || Math.abs(b.t - s.items[n - 1].t) >= 1;
    return b.above === firstRow || b.before === firstInRow;
  })).map((s) => s.name);
  check(`${w}px: rules sit between rows and between figures in a row, nowhere else`, rulesWrong.length === 0, rulesWrong.join('; '));

  // Order: header, then the figures, then the buttons; every figure's text fits its column.
  const orderWrong = base.filter((s) => (s.header && s.header.b > s.list.t) || (s.buttons && s.buttons.t < s.list.b)).map((s) => s.name);
  check(`${w}px: header above the figures, buttons below`, orderWrong.length === 0, orderWrong.join('; '));
  const overflow = base.filter((s) => s.items.some((b) => !b.fits)).map((s) => s.name);
  check(`${w}px: every figure, label and text fits its column (incl. "£2.5m+")`, overflow.length === 0, overflow.join('; '));
  const alignWrong = base.filter((s) => s.items.some((b) => b.align !== (s.centre ? 'center' : 'start'))).map((s) => s.name);
  check(`${w}px: figures are centred exactly where Alignment is Centred`, alignWrong.length === 0, alignWrong.join('; '));

  const moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    if (key(await sections()) !== key(base)) moved.push(v);
  }
  check(`${w}px: everything keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.stats'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[4].getBoundingClientRect().bottom - s[0].getBoundingClientRect().top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/stats-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 4000) } });
}

// ---------- Colour: Brand or Text, every background × theme ----------
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
let worst = 99, worstWhere = '', worstFigure = 99, worstFigureWhere = '', colourWrong = new Set();
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const role = (t, name) => { const probe = document.createElement('div'); probe.style.color = `var(--color-${name})`; probe.style.background = 'var(--color-bg)'; t.closest('.stats__inner').append(probe); const cs = getComputedStyle(probe); const c = { fg: rgb(cs.color), bg: rgb(cs.backgroundColor) }; probe.remove(); return c; };
      const where = (t) => `${t.className.split(' ').pop()} in "${t.closest('.stats').querySelector('.stats__heading')?.textContent.slice(7, 50) ?? '(no heading)'}"`;
      let min = 99, at = '', fig = 99, figAt = '';
      const wrong = [];
      for (const t of document.querySelectorAll('.stats__eyebrow, .stats__heading, .stats__intro, .stats__label, .stats__text, .stats .button--text, .stats__figure')) {
        const want = t.closest('.stats').classList.contains('stats--text') ? 'text' : 'brand';
        const { fg: roleFg, bg } = role(t, want);
        const fg = rgb(getComputedStyle(t).color);
        const c = contrastRatio(fg, bg);
        if (t.classList.contains('stats__figure')) {
          if (fg.join() !== roleFg.join()) wrong.push(where(t));
          if (c < fig) { fig = c; figAt = where(t); }
        } else if (c < min) { min = c; at = where(t); }
      }
      return { min, at, fig, figAt, wrong };
    });
    const label = `${bg} page, ${theme || 'library default'} theme`;
    if (r.min < worst) { worst = r.min; worstWhere = `${r.at}, ${label}`; }
    if (r.fig < worstFigure) { worstFigure = r.fig; worstFigureWhere = `${r.figAt}, ${label}`; }
    r.wrong.forEach((x) => colourWrong.add(`${x}, ${label}`));
  }
}
check('figures are in the chosen colour role (Brand or Text) on every background × theme', colourWrong.size === 0, [...colourWrong].slice(0, 3).join('; '));
check('text and link contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
check('figure contrast ≥ 4.5:1 on every background × theme', worstFigure >= 4.5, `lowest ${worstFigure.toFixed(2)}:1: ${worstFigureWhere}`);
if (worstFigure < 4.5 && worstFigure >= 3) info('figures are large bold text, for which WCAG AA asks 3:1');
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// ---------- Structure ----------
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const structure = await p.evaluate(() => [...document.querySelectorAll('.stats')].map((s) => {
  const h = s.querySelector('.stats__heading'), e = s.querySelector('.stats__eyebrow'), list = s.querySelector('.stats__list');
  const first = s.querySelector('.stats__item');
  return {
    h2: !h || h.tagName === 'H2',
    eyebrowFirst: !e || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING),
    list: list.tagName === 'UL' && list.getAttribute('role') === 'list' && [...list.children].every((c) => c.tagName === 'LI'),
    figureFirst: first.firstElementChild.classList.contains('stats__figure'),
  };
}));
check('headings are h2, with the eyebrow just above', structure.every((s) => s.h2 && s.eyebrowFirst));
check('the figures are a list, each read figure first ("400+, Events covered")', structure.every((s) => s.list && s.figureFirst));

// No JavaScript: the same figures.
const withJs = await p.evaluate(() => document.querySelectorAll('.stats__item').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJs = await nojs.evaluate(() => document.querySelectorAll('.stats__item').length);
check('without JavaScript every figure is there', noJs === withJs && withJs > 0, `${noJs}/${withJs}`);
await nojs.close();

for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all Stats sections (${bg} page)`, '.stats');
}

await finish();
