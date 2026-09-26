import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { mkdirSync } from 'node:fs';
// Run against a BUILT rnnbrwn.xyz served locally; see README.md.
const BASE = process.env.BASE_URL || 'http://localhost:4500';
const SHOTS = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const axeSource = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const PAGE = BASE + '/components/media-text/';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results = [];
const check = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (p, kind, v) => p.evaluate((k, v) => document.querySelector(`[data-preview="${k}"][data-value="${v}"]`).click(), kind, v);
const SURFACES = ['light', 'subtle', 'accent', 'dark'];
const BRANDS = ['', 'forest', 'terracotta', 'harbour', 'plum', 'monochrome'];
const p = await b.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && errors.push(`${r.status()} ${r.url()}`));

// Every Media Text: its options (from its classes), and the image's and text's boxes.
const sections = () => p.evaluate(() => [...document.querySelectorAll('.media-text')].map((s, i) => {
  const img = s.querySelector('.media-text__media img'), text = s.querySelector('.media-text__content');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  const cls = (prefix) => [...s.classList].find((c) => c.startsWith(prefix))?.slice(prefix.length);
  return {
    name: s.querySelector('.media-text__heading')?.textContent.trim().replace('Media Text: ', '') || `section ${i + 1} (no heading)`,
    side: cls('media-text--image-'),
    split: [...s.classList].find((c) => ['media-text--half', 'media-text--image-wider', 'media-text--text-wider'].includes(c)).slice(13),
    align: cls('media-text--align-'),
    shape: s.querySelector('.media-text__media').dataset.shape,
    focus: s.querySelector('.media-text__media').dataset.focus,
    position: getComputedStyle(img).objectPosition,
    natural: img.naturalWidth / img.naturalHeight,
    img: box(img),
    text: box(text),
  };
}));
const key = (list) => list.map((s) => JSON.stringify([s.img, s.text])).join('|');
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(200);
  // Lazy images: bring each into view so it loads before measuring its natural shape.
  await p.evaluate(async () => { for (const i of document.querySelectorAll('.media-text img')) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();

  if (w === 375) {
    const wrong = base.filter((s) => s.text && !(s.img.b <= s.text.t)).map((s) => s.name);
    check('375px: every image sits above its text', wrong.length === 0, wrong.join('; '));
  }
  if (w === 1440) {
    const sideWrong = base.filter((s) => s.text && (s.side === 'left' ? !(s.img.r <= s.text.l) : !(s.text.r <= s.img.l))).map((s) => s.name);
    check('1440px: image and text side by side, the image on the chosen side', sideWrong.length === 0, sideWrong.join('; '));
    // Split: image width ÷ text width, near 1, 3/2 or 2/3 (the column gap is shared, so allow a little).
    const want = { half: 1, 'image-wider': 1.5, 'text-wider': 2 / 3 };
    const splitWrong = base.filter((s) => s.text && Math.abs(s.img.w / s.text.w - want[s.split]) > 0.03).map((s) => `${s.name}: ${(s.img.w / s.text.w).toFixed(2)}`);
    check('1440px: the split sets the image and text widths', splitWrong.length === 0, splitWrong.join('; '));
    const alignWrong = base.filter((s) => s.text && !({
      top: near(s.img.t, s.text.t),
      middle: near(s.img.t + s.img.h / 2, s.text.t + s.text.h / 2),
      bottom: near(s.img.b, s.text.b),
    })[s.align]).map((s) => `${s.name} (${s.align})`);
    check('1440px: the text lines up with the image\'s top, middle or bottom as chosen', alignWrong.length === 0, alignWrong.join('; '));
  }
  // Shape: Original keeps the upload's proportions; the others crop to theirs.
  const ratio = { landscape: 1.5, square: 1, portrait: 0.8 };
  const shapeWrong = base.filter((s) => Math.abs(s.img.w / s.img.h - (s.shape === 'original' ? s.natural : ratio[s.shape])) > 0.02).map((s) => `${s.name}: ${(s.img.w / s.img.h).toFixed(2)}`);
  check(`${w}px: every image has its chosen shape`, shapeWrong.length === 0, shapeWrong.join('; '));

  const moved = [];
  for (const [kind, v] of [...SURFACES.slice(1).map((s) => ['surface', s]), ...BRANDS.slice(1).map((s) => ['brand', s])]) {
    await pick(p, kind, v); await wait(150);
    if (key(await sections()) !== key(base)) moved.push(v);
  }
  check(`${w}px: images and text keep their size and position on every page surface and brand`, moved.length === 0, moved.join(', '));
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.media-text'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[3].getBoundingClientRect().bottom - s[0].getBoundingClientRect().top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/media-text-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 4000) } });
}

// Keep in view: the crop point follows the editor's choice.
const pos = { center: '50% 50%', top: '50% 0%', bottom: '50% 100%', left: '0% 50%', right: '100% 50%' };
const focusWrong = (await sections()).filter((s) => s.shape !== 'original' && s.position !== pos[s.focus]).map((s) => `${s.name}: ${s.position}`);
check('"Keep in view" sets the crop point', focusWrong.length === 0, focusWrong.join('; '));

// Contrast: all the text and links against the section's colour, every page surface × brand.
let worst = 99, worstWhere = '';
for (const brand of BRANDS) {
  for (const surface of SURFACES) {
    await pick(p, 'brand', brand); await pick(p, 'surface', surface); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      let min = 99, where = '';
      for (const t of document.querySelectorAll('.media-text__eyebrow, .media-text__heading, .media-text .prose :is(p, li, h3, a), .media-text .button--text')) {
        const probe = document.createElement('div'); probe.style.background = 'var(--color-bg)'; t.closest('.media-text__content').append(probe);
        const c = ratio(rgb(getComputedStyle(t).color), rgb(getComputedStyle(probe).backgroundColor)); probe.remove();
        if (c < min) { min = c; where = `${t.tagName.toLowerCase()}.${t.className || ''} in "${t.closest('.media-text').querySelector('.media-text__heading')?.textContent.slice(12, 50) ?? '(no heading)'}"`; }
      }
      return { min, where };
    });
    if (r.min < worst) { worst = r.min; worstWhere = `${r.where}, ${surface} page, ${brand || 'library default'} brand`; }
  }
}
check('text and link contrast ≥ 4.5:1 on every surface × brand', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
await pick(p, 'surface', 'light'); await pick(p, 'brand', '');

// Structure: h2 headings, text before the image in the page, eyebrow above the heading,
// every image with an alt attribute, links made into site links. (Reloaded: the loop above
// switched the images to eager loading.)
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const structure = await p.evaluate(() => [...document.querySelectorAll('.media-text')].map((s) => {
  const h = s.querySelector('.media-text__heading'), e = s.querySelector('.media-text__eyebrow'), img = s.querySelector('img'), text = s.querySelector('.media-text__content');
  return {
    h2: !h || h.tagName === 'H2',
    textFirst: !text || !!(text.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING),
    eyebrowFirst: !e || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING),
    alt: img.hasAttribute('alt'),
    lazy: img.loading === 'lazy',
    cmsLinks: [...s.querySelectorAll('a')].filter((a) => a.href.includes('localhost:8080')).length,
  };
}));
check('headings are h2, with the eyebrow just above', structure.every((s) => s.h2 && s.eyebrowFirst));
check('the text comes before the image in the page (screen reader order)', structure.every((s) => s.textFirst));
check('every image has an alt attribute and loads lazily', structure.every((s) => s.alt && s.lazy));
check('links to the CMS became site links', structure.every((s) => s.cmsLinks === 0));

// No JavaScript: the same sections.
const withJs = await p.evaluate(() => document.querySelectorAll('.media-text img').length);
const nojs = await b.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJs = await nojs.evaluate(() => document.querySelectorAll('.media-text img').length);
check('without JavaScript every section and image is there', noJs === withJs && withJs > 0, `${noJs}/${withJs}`);
await nojs.close();

// Accessibility, on a light and a dark page.
for (const surface of ['light', 'dark']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', surface); await wait(150);
  await p.evaluate(axeSource);
  const axeRes = await p.evaluate(async () => { const r = await axe.run(document.querySelectorAll('.media-text'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }); return { v: r.violations.map((v) => `${v.id}: ${v.nodes.length}`), inc: r.incomplete.map((v) => `${v.id}: ${v.nodes.length}`) }; });
  check(`axe scan of all Media Text sections (${surface} page)`, axeRes.v.length === 0, axeRes.v.join(', ') || `no violations; needs a human: ${axeRes.inc.join(', ') || 'nothing'}`);
}

console.log(results.join('\n'));
console.log('page errors:', errors.length ? errors : 'none');
await b.close();
