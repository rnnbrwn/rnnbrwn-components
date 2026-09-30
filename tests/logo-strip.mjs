import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/logo-strip/preview/';
const p = await newPage();

// Every Logo Strip: its label, alignment, and each logo's box.
const strips = () => p.evaluate(() => [...document.querySelectorAll('.logo-strip')].map((s, index) => {
  const list = s.querySelector('.logo-strip__logos').getBoundingClientRect();
  const logos = [...s.querySelectorAll('.logo')];
  const rects = logos.map((l) => l.getBoundingClientRect());
  // Each row (same middle: linked logos are taller, a tap target): how far its logos sit from the list's left and right edges.
  const rows = {};
  s.querySelectorAll('.logo-strip__item').forEach((li) => { const r = li.getBoundingClientRect(); const row = (rows[Math.round((r.top + r.bottom) / 2)] ??= { left: 1e9, right: -1e9 }); row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); });
  return {
    name: s.querySelector('.logo-strip__heading')?.textContent.trim() || `(no heading #${index})`,
    centre: s.classList.contains('logo-strip--centre'),
    heights: [...new Set(rects.map((r) => Math.round(r.height)))],
    tooWide: rects.filter((r) => r.width > r.height * 4 + 0.5).length,
    inside: rects.every((r) => r.left >= list.left - 0.5 && r.right <= list.right + 0.5),
    rows: Object.values(rows).map((r) => ({ left: Math.round(r.left - list.left), right: Math.round(list.right - r.right) })),
    boxes: rects.map((r) => [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(',')).join(' '),
  };
}));

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await strips();
  const heights = [...new Set(base.flatMap((s) => s.heights))];
  check(`${w}px: every logo is the same height`, heights.length === 1, `${heights.join(', ')}px`);
  check(`${w}px: no logo is wider than four times its height`, base.every((s) => s.tooWide === 0));
  check(`${w}px: logos stay inside their section's lane`, base.every((s) => s.inside), base.filter((s) => !s.inside).map((s) => s.name).join('; '));
  const leftWrong = base.filter((s) => !s.centre && s.rows.some((r) => r.left !== 0)).map((s) => s.name);
  check(`${w}px: Left: every row starts at the left edge`, leftWrong.length === 0, leftWrong.join('; '));
  const centreWrong = base.filter((s) => s.centre && s.rows.some((r) => Math.abs(r.left - r.right) > 1)).map((s) => s.name);
  check(`${w}px: Centred: every row is centred, the last one too`, centreWrong.length === 0, centreWrong.join('; '));
  info(`${w}px rows: ${base.map((s) => `${s.name.replace('Logo Strip: ', '').slice(0, 18)}=${s.rows.length}`).join(', ')}`);
  let moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    (await strips()).forEach((s, i) => { if (s.boxes !== base[i].boxes) moved.push(`${s.name} on ${v}`); });
  }
  check(`${w}px: every logo keeps its size and position on every page background and theme`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.logo-strip'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[6].getBoundingClientRect().bottom + scrollY - top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/logo-strip-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 6000) } });
}

// Single colour: the filter paints the logo in its section's text colour; check that colour
// against the section's colour on every page background × theme. Header text too.
await p.setViewport({ width: 1440, height: 900 });
let worst = 99, worstWhere = '', paintWrong = 0;
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const role = (el, prop) => { const probe = document.createElement('div'); probe.style.color = `var(${prop})`; el.append(probe); const c = rgb(getComputedStyle(probe).color); probe.remove(); return c; };
      let min = 99, where = '', wrong = 0;
      for (const l of document.querySelectorAll('.logo-strip--single .logo')) {
        const paint = rgb(getComputedStyle(l.closest('.logo-strip__inner').querySelector('.logo-strip__tint')).color), text = role(l.parentElement, '--color-text');
        if (paint.join() !== text.join()) wrong++;
        const c = contrastRatio(paint, role(l.parentElement, '--color-bg'));
        if (c < min) { min = c; where = `Single colour logo in "${l.closest('.logo-strip').querySelector('.logo-strip__heading')?.textContent.trim().slice(12, 50)}"`; }
      }
      for (const t of document.querySelectorAll('.logo-strip__eyebrow, .logo-strip__heading, .logo-strip__intro')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), role(t.parentElement, '--color-bg'));
        if (c < min) { min = c; where = t.className.split(' ').find((x) => x.startsWith('logo-strip__')); }
      }
      return { min, where, wrong };
    });
    paintWrong += r.wrong;
    if (r.min < worst) { worst = r.min; worstWhere = `${r.where}, ${bg} page, ${theme || 'library default'} theme`; }
  }
}
check('Single colour logos are painted in the text colour on every background × theme', paintWrong === 0, `${paintWrong} not`);
check('Single colour logos and header text contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// Names and links.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const names = await p.evaluate(() => ({
  imgs: [...document.querySelectorAll('img.logo')].map((i) => i.alt),
  filters: [...document.querySelectorAll('.logo-strip--single')].map((s) => { const id = s.querySelector('filter')?.id; return !!id && getComputedStyle(s.querySelector('.logo')).filter.includes(id); }),
  links: [...document.querySelectorAll('.logo-strip__link')].map((a) => { const r = a.getBoundingClientRect(); return { h: r.height, w: r.width, name: (a.querySelector('img')?.alt ?? '') + a.textContent, href: a.getAttribute('href'), target: a.target, rel: a.rel }; }),
}));
check('every logo is an image named by the Name field (alt text)', names.imgs.length > 0 && names.imgs.every((a) => a.length > 0));
check('each Single colour strip uses its own filter', names.filters.length > 0 && names.filters.every(Boolean) && (await p.evaluate(() => new Set([...document.querySelectorAll('.logo-strip filter')].map((f) => f.id)).size === document.querySelectorAll('.logo-strip filter').length)));

// Every logo is actually drawn: a screenshot of it differs from one with it hidden. (A setting
// that paints nothing, e.g. a CSS mask on an image from another address, still has the right
// computed colour, so colour checks alone can't tell.)
let blank = [];
for (const [i, name] of (await p.evaluate(() => [...document.querySelectorAll('.logo')].map((l) => l.alt))).entries()) {
  const el = (await p.$$('.logo'))[i];
  await el.scrollIntoView(); await wait(50);
  const shown = await el.screenshot();
  await p.evaluate((i) => { document.querySelectorAll('.logo')[i].style.visibility = 'hidden'; }, i);
  const hidden = await el.screenshot();
  await p.evaluate((i) => { document.querySelectorAll('.logo')[i].style.visibility = ''; }, i);
  if (Buffer.compare(shown, hidden) === 0) blank.push(`#${i} ${name}`);
}
check('every logo is actually drawn, Original and Single colour', blank.length === 0, blank.slice(0, 4).join('; '));
check('linked logos are at least 44px tall', names.links.length > 0 && names.links.every((l) => l.h >= 44), `smallest ${Math.min(...names.links.map((l) => l.h)).toFixed(0)}px`);
check('a link is named by its logo\'s Name', names.links.every((l) => l.name.startsWith('Wide logo') || l.name.startsWith('Two-colour logo')));
const nt = names.links.find((l) => l.target === '_blank');
check('a new-tab logo says so and has rel=noopener', nt && nt.rel.includes('noopener') && nt.name.includes('(opens in a new tab)'));
check('logo links to the CMS became site links', names.links.every((l) => !l.href?.includes('localhost:8080')), [...new Set(names.links.map((l) => l.href))].join(' '));

// Keyboard: the first link shows a focus outline; Tab moves to the next linked logo.
await p.focus('.logo-strip__link');
const focus = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
await p.keyboard.press('Tab');
const next = await p.evaluate(() => document.activeElement.className);
check('keyboard: a linked logo shows a focus outline, and Tab moves to the next one', focus === 'solid' && next.includes('logo-strip__link'), `${focus}; next: ${next}`);

// Reduced motion: no hover lift animation.
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.logo-strip__link')).transitionDuration);
check('reduced motion: the hover lift has no animation', dur === '0s', dur);
// High contrast (Windows forced colours): Single colour logos follow the system text colour.
// (puppeteer's emulateMediaFeatures doesn't allow forced-colors, so ask Chrome directly.)
await p.emulateMediaFeatures([]);
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const forced = await p.evaluate(() => {
  const probe = document.body.appendChild(document.createElement('div')); probe.style.color = 'CanvasText';
  const want = getComputedStyle(probe).color; probe.remove();
  return { got: getComputedStyle(document.querySelector('.logo-strip__tint')).color, want };
});
check('high-contrast mode: Single colour logos use the system text colour', forced.got === forced.want, `${forced.got} vs ${forced.want}`);
await cdp.send('Emulation.setEmulatedMedia', { features: [] });

// No JavaScript: the same logos.
const withJs = await p.evaluate(() => document.querySelectorAll('.logo').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJsLogos = await nojs.evaluate(() => document.querySelectorAll('.logo').length);
check('without JavaScript every logo is there', noJsLogos === withJs && withJs > 0, `${noJsLogos}/${withJs}`);
await nojs.close();

// Accessibility, on a white and a black page.
for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all Logo Strips (${bg} page)`, '.logo-strip');
}

await finish();
