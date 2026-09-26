import { BASE, SHOTS, SURFACES, BRANDS, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/hero/';
const p = await newPage();

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
  for (const [kind, v] of [...SURFACES.slice(1).map((s) => ['surface', s]), ...BRANDS.slice(1).map((s) => ['brand', s])]) {
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
  info(`${w}px: full-width photo loaded ${chosen}`);
  const tall = await p.evaluate(() => [...document.querySelectorAll('.hero')].map((h) => [h.classList.contains('hero--tall'), Math.round(h.querySelector('.hero__content').getBoundingClientRect().height)]));
  const minTall = Math.min(...tall.filter(([t]) => t).map(([, hgt]) => hgt)), maxStd = Math.max(...tall.filter(([t]) => !t).map(([, hgt]) => hgt));
  check(`${w}px: Tall Heroes are at least the tall height`, minTall >= 380, `tall ≥ ${minTall}px, standard up to ${maxStd}px`);
  await p.screenshot({ path: `${SHOTS}/hero-${w}.png`, fullPage: false, clip: { x: 0, y: await p.evaluate(() => document.querySelector('.hero').getBoundingClientRect().top + scrollY - 10), width: w, height: await p.evaluate(() => { const hs = document.querySelectorAll('.hero'); return hs[hs.length - 1].getBoundingClientRect().bottom - hs[0].getBoundingClientRect().top + 20; }) } });
}

// Worst-case contrast of text over photos: the tint over each extreme of the test photo.
await p.setViewport({ width: 1440, height: 900 });
const extremes = ['#ffffff', '#000000', '#e50053', '#fece00', '#3b5bdb'];
for (const brand of BRANDS) {
  await pick(p, 'brand', brand); await pick(p, 'surface', 'light'); await wait(200);
  const rows = await p.evaluate((extremes) => {
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    return [...document.querySelectorAll('.hero--photo')].map((h) => {
      const tint = getComputedStyle(h.querySelector('.hero__media'), '::after').backgroundColor; // colour with alpha
      const texts = [...h.querySelectorAll('.hero__eyebrow, .hero__heading, .hero__intro, .button--outline, .button--text')];
      let worst = 99, where = '';
      for (const P of extremes) {
        // composite the tint over the photo pixel on a canvas
        cv.clearRect(0, 0, 1, 1); cv.fillStyle = P; cv.fillRect(0, 0, 1, 1); cv.fillStyle = tint; cv.fillRect(0, 0, 1, 1);
        const bg = [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3);
        for (const t of texts) { const r = contrastRatio(rgb(getComputedStyle(t).color), bg); if (r < worst) { worst = r; where = `${t.className.split(' ')[0]} over ${P}`; } }
      }
      const per = {};
      for (const t of texts) { let m = 99; for (const P of extremes) { cv.clearRect(0, 0, 1, 1); cv.fillStyle = P; cv.fillRect(0, 0, 1, 1); cv.fillStyle = tint; cv.fillRect(0, 0, 1, 1); const bg = [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); m = Math.min(m, contrastRatio(rgb(getComputedStyle(t).color), bg)); } const k = t.className.split(' ')[0].replace('hero__', ''); per[k] = Math.min(per[k] ?? 99, m); }
      return `${h.querySelector('.hero__heading').textContent.slice(24).padEnd(32)} worst ${worst.toFixed(1)}:1  [${Object.entries(per).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}]`;
    });
  }, extremes);
  info(`photo contrast, ${brand || 'library default'} brand:`);
  rows.forEach((r) => info(`  ${r}`));
}
await pick(p, 'brand', '');

// Accessibility
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await axeCheck(p, 'axe scan of all Heroes', '.hero');
const alts = await p.evaluate(() => [...document.querySelectorAll('.hero__media img')].map((i) => `${i.closest('.hero').querySelector('.hero__heading').textContent.slice(6, 40)}: alt="${i.alt}"`));
// Decorative photos must have alt=""; the described one uses the Media Library's alt text (the real test photo may have none).
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
await finish();
