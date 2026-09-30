import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/testimonials/preview/';
const p = await newPage();

// Every Testimonials section: its label, layout, columns used, and each quote's box.
const sections = () => p.evaluate(() => [...document.querySelectorAll('.testimonials')].map((s, index) => {
  const quotes = [...s.querySelectorAll('.quote')];
  const rects = quotes.map((q) => q.getBoundingClientRect());
  const probe = document.createElement('div'); probe.style.width = 'var(--quote-pad)'; s.querySelector('.testimonials__quotes').append(probe);
  const padPx = probe.getBoundingClientRect().width; probe.remove();
  // Quotes in the same row (same top): their names' bottoms should match.
  const rows = {};
  quotes.forEach((q, i) => { const by = q.querySelector('.quote__by'); if (by) (rows[Math.round(rects[i].top)] ??= []).push(Math.round(by.getBoundingClientRect().bottom)); });
  return {
    name: s.querySelector('.testimonials__heading')?.textContent.trim() || `(no heading #${index})`,
    large: s.classList.contains('testimonials--large'),
    plain: s.classList.contains('testimonials--plain'),
    centre: s.classList.contains('testimonials--centre'),
    fill: s.classList.contains('testimonials--fill'),
    columns: new Set(rects.map((r) => Math.round(r.left))).size,
    boxes: rects.map((r) => [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(',')).join(' '),
    onScreen: rects.every((r) => r.left - padPx >= -0.5 && r.right + padPx <= innerWidth + 0.5),
    namesLevel: Object.values(rows).every((b) => Math.max(...b) - Math.min(...b) <= 1),
    last: { count: quotes.length, width: Math.round(rects.at(-1).width), firstWidth: Math.round(rects[0].width), right: Math.round(rects.at(-1).right), rowRight: Math.round(Math.max(...rects.map((r) => r.right))) },
    photos: [...s.querySelectorAll('.quote__photo')].map((i) => { const r = i.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), round: getComputedStyle(i).borderRadius === '50%' }; }),
    textSize: parseFloat(getComputedStyle(s.querySelector('.quote__text p')).fontSize),
    // Centred: each person (photo + name) sits in the middle of its quote.
    centred: quotes.every((q) => { const a = q.querySelector('.quote__by')?.getBoundingClientRect(), f = q.getBoundingClientRect(); return !a || Math.abs((a.left + a.right) / 2 - (f.left + f.right) / 2) <= 1; }),
  };
}));

const WIDE = { 'grid, 3 columns': 3, 'grid, Plain': 3, '2 columns, narrow': 2, 'large': 1, 'on Accent': 3, '4 quotes in 3': 3, '5 in 3': 3, 'six quotes': 3, 'wide content': 3, '(no heading': 2 };
const expectAt1440 = (name) => Object.entries(WIDE).find(([k]) => name.includes(k))?.[1];

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();
  info(`${w}px columns: ${base.map((s) => `${s.name.replace('Testimonials: ', '').slice(0, 20)}=${s.columns}`).join(', ')}`);
  if (w === 375) check('375px: every section is one column', base.every((s) => s.columns === 1));
  if (w === 1440) {
    const wrong = base.filter((s) => expectAt1440(s.name) !== s.columns).map((s) => `${s.name}: ${s.columns}`);
    check('1440px: every grid shows the columns the editor picked; Large is one column', wrong.length === 0, wrong.join('; '));
    const big = base.filter((s) => s.large), small = base.filter((s) => !s.large);
    check('1440px: Large quotes are bigger text than grid quotes', Math.min(...big.map((s) => s.textSize)) > Math.max(...small.map((s) => s.textSize)), `${big[0].textSize}px vs ${small[0].textSize}px`);
  }
  check(`${w}px: quote panels stay on screen`, base.every((s) => s.onScreen), base.filter((s) => !s.onScreen).map((s) => s.name).join('; '));
  check(`${w}px: names line up across each row of quotes`, base.every((s) => s.namesLevel), base.filter((s) => !s.namesLevel).map((s) => s.name).join('; '));
  check(`${w}px: Panel and Plain (and Left and Centred) quotes are exactly the same size and position`, base[0].boxes.split(' ').map((b) => b.split(',').filter((_, i) => i !== 1).join()).join() === base[1].boxes.split(' ').map((b) => b.split(',').filter((_, i) => i !== 1).join()).join());
  const fillWrong = base.filter((s) => s.fill && (s.last.right !== s.last.rowRight || (s.last.count % s.columns ? s.last.width <= s.last.firstWidth : s.last.width !== s.last.firstWidth))).map((s) => s.name);
  check(`${w}px: "Fill the row": the last quote reaches the end of its row (and only stretches when there's space)`, fillWrong.length === 0, fillWrong.join('; '));
  const colWrong = base.filter((s) => !s.fill && s.last.width !== s.last.firstWidth).map((s) => s.name);
  check(`${w}px: "Column width": the last quote is as wide as the others`, colWrong.length === 0, colWrong.join('; '));
  const photos = base.flatMap((s) => s.photos);
  check(`${w}px: every photo is a circle (square box, 50% radius), whatever its original shape`, photos.length > 0 && photos.every((ph) => ph.w === ph.h && ph.round), [...new Set(photos.map((ph) => `${ph.w}x${ph.h}`))].join(' '));
  check(`${w}px: Centred puts each person in the middle of its quote`, base.filter((s) => s.centre).every((s) => s.centred));
  let moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    (await sections()).forEach((s, i) => { if (s.boxes !== base[i].boxes) moved.push(`${s.name} on ${v}`); });
  }
  check(`${w}px: every quote keeps its size and position on every page background and theme`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.testimonials'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[4].getBoundingClientRect().bottom + scrollY - top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/testimonials-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 6000) } });
}

// Contrast: quote, name and role against what's behind them (the quote's fill for Panel, the
// section's colour for Plain), and the section's header; every page background × theme. The
// quote mark is decorative, so it's only listed (≥ 3:1 is the aim for graphics).
await p.setViewport({ width: 1440, height: 900 });
let worst = 99, worstWhere = '', worstMark = 99, worstMarkWhere = '';
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const sectionBg = (el) => { const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; el.append(probe); const c = rgb(getComputedStyle(probe).backgroundColor); probe.remove(); return c; };
      let min = 99, where = '', mark = 99, markWhere = '';
      for (const q of document.querySelectorAll('.quote')) {
        const bg = q.closest('.testimonials--plain') ? sectionBg(q) : rgb(getComputedStyle(q, '::before').backgroundColor);
        const label = q.closest('.testimonials').querySelector('.testimonials__heading')?.textContent.trim().slice(14, 50);
        for (const t of q.querySelectorAll('.quote__text p, .quote__name, .quote__role')) {
          const c = contrastRatio(rgb(getComputedStyle(t).color), bg);
          if (c < min) { min = c; where = `${t.className || 'quote'} in "${label}"`; }
        }
        const m = contrastRatio(rgb(getComputedStyle(q.querySelector('.quote__text'), '::before').color), bg);
        if (m < mark) { mark = m; markWhere = `"${label}"`; }
      }
      for (const t of document.querySelectorAll('.testimonials__eyebrow, .testimonials__heading, .testimonials__intro')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), sectionBg(t.parentElement));
        if (c < min) { min = c; where = `${t.className.split(' ').find((x) => x.startsWith('testimonials__'))}`; }
      }
      return { min, where, mark, markWhere };
    });
    const at = `, ${bg} page, ${theme || 'library default'} theme`;
    if (r.min < worst) { worst = r.min; worstWhere = r.where + at; }
    if (r.mark < worstMark) { worstMark = r.mark; worstMarkWhere = r.markWhere + at; }
  }
}
check('quote, name, role and header text contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
info(`quote mark (decorative) lowest contrast ${worstMark.toFixed(2)}:1: ${worstMarkWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// Markup: each quote a figure with a blockquote and a figcaption; the quote mark and photo are
// decorative; paragraphs come from line breaks; no links or headings inside a quote.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const markup = await p.evaluate(() => {
  const quotes = [...document.querySelectorAll('.quote')];
  return {
    figures: quotes.every((q) => q.querySelector(':scope > figure > blockquote + figcaption, :scope > figure > blockquote:only-child')),
    mark: getComputedStyle(document.querySelector('.quote__text'), '::before').content,
    photoAlts: [...document.querySelectorAll('.quote__photo')].map((i) => i.getAttribute('alt')),
    twoParas: quotes.some((q) => q.querySelectorAll('blockquote p').length === 2),
    noRole: quotes.some((q) => q.querySelector('.quote__name') && !q.querySelector('.quote__role')),
    noPhoto: quotes.some((q) => q.querySelector('.quote__by') && !q.querySelector('.quote__photo')),
    inside: quotes.filter((q) => q.querySelector('a, h1, h2, h3, h4, h5, h6')).length,
    list: [...document.querySelectorAll('.testimonials__quotes')].every((l) => l.tagName === 'UL'),
  };
});
check('each quote is a figure: blockquote, then figcaption', markup.figures);
check('the quote mark is decorative CSS with empty alt text', /\/\s*""$/.test(markup.mark), markup.mark);
check('photos are decorative (alt="")', markup.photoAlts.length > 0 && markup.photoAlts.every((a) => a === ''));
check('a line break in the Quote starts a new paragraph', markup.twoParas);
check('quotes without a role or photo still show the name', markup.noRole && markup.noPhoto);
check('quotes are a list, with no links or headings inside a quote', markup.list && markup.inside === 0);

// No JavaScript: the same quotes.
const withJs = await p.evaluate(() => document.querySelectorAll('.quote').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJsQuotes = await nojs.evaluate(() => document.querySelectorAll('.quote').length);
check('without JavaScript every quote is there', noJsQuotes === withJs && withJs > 0, `${noJsQuotes}/${withJs}`);
await nojs.close();

// Accessibility, on a white and a black page.
for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all Testimonials (${bg} page)`, '.testimonials');
}

await finish();
