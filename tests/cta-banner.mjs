import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/cta-banner/preview/';
const p = await newPage();

// Every CTA Banner section: its layout (from its class), the width it measures (rem), and the
// boxes of its header and buttons (and of the buttons themselves, for alignment).
const sections = () => p.evaluate(() => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  return [...document.querySelectorAll('.cta-banner')].map((s, i) => {
    const buttons = [...s.querySelectorAll('.cta-banner__buttons > *')].map((x) => x.getBoundingClientRect());
    return {
      name: s.querySelector('.cta-banner__heading')?.textContent.trim().replace('CTA Banner: ', '') || `section ${i + 1}`,
      beside: s.classList.contains('cta-banner--beside'),
      width: s.querySelector('.cta-banner__inner').getBoundingClientRect().width / rem,
      inner: box(s.querySelector('.cta-banner__inner')),
      header: box(s.querySelector('.cta-banner__header')),
      headerAlign: getComputedStyle(s.querySelector('.cta-banner__header')).textAlign,
      buttons: box(s.querySelector('.cta-banner__buttons')),
      buttonSpan: buttons.length ? { l: Math.min(...buttons.map((r) => r.left)), r: Math.max(...buttons.map((r) => r.right)), minH: Math.min(...buttons.map((r) => r.height)) } : null,
      headingSize: parseFloat(getComputedStyle(s.querySelector('.cta-banner__heading')).fontSize),
    };
  });
});
const key = (list) => list.map((s) => JSON.stringify([s.header, s.buttons])).join('|');

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();
  check(`${w}px: every banner has a heading and at least one button`, base.every((s) => s.header && s.buttons), base.filter((s) => !s.buttons).map((s) => s.name).join('; '));

  // Beside from 50rem: the buttons to the right of the text, their right edge at the section's
  // right edge, and the two centred up and down against each other. Narrower (and Centred): the
  // buttons under the text.
  const mid = (a, b) => Math.abs((a.t + a.h / 2) - (b.t + b.h / 2)) <= 2;
  const layoutWrong = base.filter((s) => {
    const side = s.buttons.l >= s.header.r;
    const want = s.beside && s.width >= 50;
    if (side !== want) return true;
    if (want) return Math.abs(s.buttonSpan.r - s.inner.r) > 1 || !mid(s.header, s.buttons);
    return s.buttons.t < s.header.b;
  }).map((s) => `${s.name}: ${s.width.toFixed(0)}rem`);
  check(`${w}px: Beside puts the buttons right of the text from 50rem (right-aligned, centred up and down); under it otherwise`, layoutWrong.length === 0, layoutWrong.join('; '));

  // Alignment: Centred centres the text and the buttons; Beside keeps the text left, and the
  // buttons left while they're under the text.
  const centred = (a, b) => Math.abs((a.l - b.l) - (b.r - a.r)) <= 2;
  const alignWrong = base.filter((s) => {
    if (!s.beside) return s.headerAlign !== 'center' || !centred(s.inner, s.buttonSpan);
    if (s.headerAlign === 'center' || Math.abs(s.header.l - s.inner.l) > 1) return true;
    return s.width < 50 && Math.abs(s.buttonSpan.l - s.inner.l) > 1;
  }).map((s) => s.name);
  check(`${w}px: Centred centres the text and buttons; Beside keeps the text at the left edge`, alignWrong.length === 0, alignWrong.join('; '));

  // The heading is a step smaller than a section's h2 (--step-3, the h3 size).
  const sizes = await p.evaluate(() => {
    const probe = (tag) => { const el = document.createElement(tag); document.querySelector('.cta-banner__inner').append(el); const s = parseFloat(getComputedStyle(el).fontSize); el.remove(); return s; };
    return { h2: probe('h2'), h3: probe('h3') };
  });
  check(`${w}px: the heading is h3-sized (--step-3), smaller than a section heading`, base.every((s) => Math.abs(s.headingSize - sizes.h3) < 0.5) && sizes.h3 < sizes.h2, `${base[0].headingSize}px vs h2 ${sizes.h2}px`);
  check(`${w}px: every button is at least 44px tall`, base.every((s) => s.buttonSpan.minH >= 44 - 0.5), String(Math.min(...base.map((s) => s.buttonSpan.minH))));

  const moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    if (key(await sections()) !== key(base)) moved.push(v);
  }
  check(`${w}px: everything keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.cta-banner'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[5].getBoundingClientRect().bottom - s[0].getBoundingClientRect().top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/cta-banner-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 4000) } });
}

// ---------- Contrast: every background × theme ----------
// Text against the section's background; Solid and Outline button labels against their own fill.
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
let worst = 99, worstWhere = '';
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const sectionBg = (t) => { const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; t.closest('.cta-banner__inner').append(probe); const c = rgb(getComputedStyle(probe).backgroundColor); probe.remove(); return c; };
      const where = (t) => `${t.className.split(' ').pop()} in "${t.closest('.cta-banner').querySelector('.cta-banner__heading')?.textContent.slice(12, 50)}"`;
      let min = 99, at = '';
      for (const t of document.querySelectorAll('.cta-banner__eyebrow, .cta-banner__heading, .cta-banner__intro, .cta-banner .button')) {
        const cs = getComputedStyle(t);
        const fill = cs.backgroundColor;
        const behind = t.matches('.button') && rgb(fill).length && !/rgba\(0, 0, 0, 0\)|transparent/.test(fill) ? rgb(fill) : sectionBg(t);
        const c = contrastRatio(rgb(cs.color), behind);
        if (c < min) { min = c; at = where(t); }
      }
      return { min, at };
    });
    if (r.min < worst) { worst = r.min; worstWhere = `${r.at}, ${bg} page, ${theme || 'library default'} theme`; }
  }
}
check('text and button contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// ---------- Structure ----------
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const structure = await p.evaluate(() => [...document.querySelectorAll('.cta-banner')].map((s) => {
  const h = s.querySelector('.cta-banner__heading'), e = s.querySelector('.cta-banner__eyebrow');
  return {
    h2: h?.tagName === 'H2',
    eyebrowFirst: !e || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING),
    buttonsAfter: !!(h.compareDocumentPosition(s.querySelector('.cta-banner__buttons')) & Node.DOCUMENT_POSITION_FOLLOWING),
    links: [...s.querySelectorAll('.cta-banner__buttons > *')].every((b) => b.tagName === 'A' && b.getAttribute('href')),
  };
}));
check('headings are h2, with the eyebrow just above and the buttons after (reading order)', structure.every((s) => s.h2 && s.eyebrowFirst && s.buttonsAfter));
check('buttons are links with an address', structure.every((s) => s.links));

// No JavaScript: the same banners and buttons.
const count = () => document.querySelectorAll('.cta-banner .button').length;
const withJs = await p.evaluate(count);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJs = await nojs.evaluate(count);
check('without JavaScript every banner and button is there', noJs === withJs && withJs > 0, `${noJs}/${withJs}`);
await nojs.close();

for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all CTA Banner sections (${bg} page)`, '.cta-banner');
}

await finish();
