import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { mkdirSync } from 'node:fs';
// Run against a BUILT rnnbrwn.xyz served locally; see README.md.
const BASE = process.env.BASE_URL || 'http://localhost:4500';
const SHOTS = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const axeSource = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const PAGE = BASE + '/components/hero/';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results = [];
const check = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (p, kind, v) => p.evaluate((k, v) => document.querySelector(`[data-preview="${k}"][data-value="${v}"]`).click(), kind, v);
const p = await b.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && errors.push(`${r.status()} ${r.url()}`));

// Geometry of every hero: content box, media box, section box
const geometry = () => p.evaluate(() => [...document.querySelectorAll('.hero')].map((h) => {
  const r = (el) => el ? [el.left, el.top + scrollY, el.width, el.height].map(Math.round).join(',') : '-';
  return { name: h.querySelector('.hero__heading').textContent, content: r(h.querySelector('.hero__content').getBoundingClientRect()), media: r(h.querySelector('.hero__media')?.getBoundingClientRect()) };
}));

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', 'light'); await pick(p, 'brand', '');
  await wait(200);
  const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(`${w}px: no horizontal scrolling`, !hscroll);
  const base = await geometry();
  let moved = [];
  for (const [kind, v] of [['surface', 'subtle'], ['surface', 'accent'], ['surface', 'dark'], ['brand', 'forest'], ['brand', 'terracotta'], ['brand', 'harbour'], ['brand', 'plum'], ['brand', 'monochrome']]) {
    await pick(p, kind, v); await wait(150);
    const g = await geometry();
    g.forEach((x, i) => { if (x.content !== base[i].content || x.media !== base[i].media) moved.push(`${x.name} on ${v}`); });
  }
  check(`${w}px: every Hero keeps its size and position on every page surface and brand`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(150);
  // media stays inside the screen and covers the section
  const media = await p.evaluate(() => [...document.querySelectorAll('.hero--photo')].map((h) => {
    const m = h.querySelector('.hero__media').getBoundingClientRect(), s = h.getBoundingClientRect(), full = h.dataset.width === 'full';
    return { name: h.querySelector('.hero__heading').textContent, ok: m.left >= -0.5 && m.right <= innerWidth + 0.5 && (full ? Math.round(m.width) === innerWidth : m.width > s.width) && m.height > s.height * 0.9 };
  }));
  check(`${w}px: photos fill their Hero and stay on screen`, media.every((m) => m.ok), media.filter((m) => !m.ok).map((m) => m.name).join('; '));
  // which image file the browser chose for a full-width photo
  const chosen = await p.evaluate(() => document.querySelector('.hero--photo[data-width="full"] img').currentSrc.split('/').pop());
  results.push(`INFO  ${w}px: full-width photo loaded ${chosen}`);
  const tall = await p.evaluate(() => [...document.querySelectorAll('.hero')].map((h) => [h.classList.contains('hero--tall'), Math.round(h.querySelector('.hero__content').getBoundingClientRect().height)]));
  const minTall = Math.min(...tall.filter(([t]) => t).map(([, hgt]) => hgt)), maxStd = Math.max(...tall.filter(([t]) => !t).map(([, hgt]) => hgt));
  check(`${w}px: Tall Heroes are at least the tall height`, minTall >= 380, `tall ≥ ${minTall}px, standard up to ${maxStd}px`);
  await p.screenshot({ path: `${SHOTS}/hero-${w}.png`, fullPage: false, clip: { x: 0, y: await p.evaluate(() => document.querySelector('.hero').getBoundingClientRect().top + scrollY - 10), width: w, height: await p.evaluate(() => { const hs = document.querySelectorAll('.hero'); return hs[hs.length - 1].getBoundingClientRect().bottom - hs[0].getBoundingClientRect().top + 20; }) } });
}

// Worst-case contrast of text over photos: the tint over each extreme of the test photo.
await p.setViewport({ width: 1440, height: 900 });
const extremes = ['#ffffff', '#000000', '#e50053', '#fece00', '#3b5bdb'];
for (const brand of ['', 'forest', 'terracotta', 'harbour', 'plum', 'monochrome']) {
  await pick(p, 'brand', brand); await pick(p, 'surface', 'light'); await wait(200);
  const rows = await p.evaluate((extremes) => {
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    return [...document.querySelectorAll('.hero--photo')].map((h) => {
      const tint = getComputedStyle(h.querySelector('.hero__media'), '::after').backgroundColor; // colour with alpha
      const texts = [...h.querySelectorAll('.hero__eyebrow, .hero__heading, .hero__intro, .button--secondary')];
      let worst = 99, where = '';
      for (const P of extremes) {
        // composite the tint over the photo pixel on a canvas
        cv.clearRect(0, 0, 1, 1); cv.fillStyle = P; cv.fillRect(0, 0, 1, 1); cv.fillStyle = tint; cv.fillRect(0, 0, 1, 1);
        const bg = [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3);
        for (const t of texts) { const r = ratio(rgb(getComputedStyle(t).color), bg); if (r < worst) { worst = r; where = `${t.className.split(' ')[0]} over ${P}`; } }
      }
      const per = {};
      for (const t of texts) { let m = 99; for (const P of extremes) { cv.clearRect(0, 0, 1, 1); cv.fillStyle = P; cv.fillRect(0, 0, 1, 1); cv.fillStyle = tint; cv.fillRect(0, 0, 1, 1); const bg = [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); m = Math.min(m, ratio(rgb(getComputedStyle(t).color), bg)); } const k = t.className.split(' ')[0].replace('hero__', ''); per[k] = Math.min(per[k] ?? 99, m); }
      return `${h.querySelector('.hero__heading').textContent.slice(24).padEnd(32)} worst ${worst.toFixed(1)}:1  [${Object.entries(per).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}]`;
    });
  }, extremes);
  results.push(`INFO  photo contrast, ${brand || 'library default'} brand:`);
  rows.forEach((r) => results.push(`        ${r}`));
}
await pick(p, 'brand', '');

// Accessibility
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.evaluate(axeSource);
const axeRes = await p.evaluate(async () => { const r = await axe.run(document.querySelectorAll('.hero'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }); return { v: r.violations.map((v) => `${v.id}: ${v.nodes.length}`), inc: r.incomplete.map((v) => `${v.id}: ${v.nodes.length}`) }; });
check('axe scan of all Heroes', axeRes.v.length === 0, axeRes.v.join(', ') || `no violations; needs a human: ${axeRes.inc.join(', ') || 'nothing'}`);
const alts = await p.evaluate(() => [...document.querySelectorAll('.hero__media img')].map((i) => `${i.closest('.hero').querySelector('.hero__heading').textContent.slice(6, 40)}: alt="${i.alt}"`));
// Decorative photos must have alt=""; the described one uses the Media Library's alt text (penrice has none yet).
const decorativeOk = alts.filter((a) => !a.includes('on Accent')).every((a) => a.endsWith('alt=""'));
check('photos are decorative unless "Describe the photo" is on', decorativeOk, alts.join(' | '));
const newTab = await p.evaluate(() => { const a = [...document.querySelectorAll('.hero .button')].find((x) => x.target === '_blank'); return a && a.rel.includes('noopener') && a.textContent.includes('(opens in a new tab)'); });
check('a new-tab button says so and has rel=noopener', newTab);
const buttons = await p.evaluate(() => [...document.querySelectorAll('.hero .button')].map((a) => Math.round(a.getBoundingClientRect().height)));
check('buttons are at least 44px tall', Math.min(...buttons) >= 44, `smallest ${Math.min(...buttons)}px`);
const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('.hero .button')].map((a) => a.getAttribute('href')))].join(' '));
check('button links to the CMS became site links', !links.includes('localhost:8080'), links);
await p.focus('.hero .button'); await p.keyboard.press('Tab'); 
const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth);
check('keyboard focus on a button shows an outline', ring.startsWith('solid'), ring);
const lazy = await p.evaluate(() => [...document.querySelectorAll('.hero__media img')].map((i) => i.loading).join(','));
check('photos on a page where the Hero is not first load lazily', lazy.split(',').every((l) => l === 'lazy'), lazy);
console.log(results.join('\n'));
console.log('page errors:', errors.length ? errors : 'none');
await b.close();
