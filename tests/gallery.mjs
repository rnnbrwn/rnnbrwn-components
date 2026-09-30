import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/gallery/preview/';
const p = await newPage();

const RATIO = { landscape: 1.5, square: 1, portrait: 0.8 };

// Every Gallery: its label, settings, columns in use, and each image's box.
const galleries = () => p.evaluate(() => [...document.querySelectorAll('.gallery')].map((g, index) => {
  const grid = g.querySelector('.gallery__grid').getBoundingClientRect();
  const rects = [...g.querySelectorAll('.gallery__image')].map((i) => i.getBoundingClientRect());
  const header = g.querySelector('.gallery__header')?.getBoundingClientRect();
  const heading = g.querySelector('.gallery__heading');
  return {
    name: heading?.textContent.trim() || `(no heading #${index})`,
    shape: ['landscape', 'square', 'portrait'].find((s) => g.classList.contains(`gallery--${s}`)),
    max: Number([...g.classList].find((c) => c.startsWith('gallery--max-')).slice(13)),
    centre: g.classList.contains('gallery--centre'),
    cols: new Set(rects.map((r) => Math.round(r.top))).size ? rects.filter((r) => Math.round(r.top) === Math.round(rects[0].top)).length : 0,
    count: rects.length,
    sizes: [...new Set(rects.map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`))],
    ratio: rects[0] ? rects[0].width / rects[0].height : 0,
    inside: rects.every((r) => r.left >= grid.left - 0.5 && r.right <= grid.right + 0.5),
    firstLeft: rects[0] ? Math.round(rects[0].left - grid.left) : 0,
    headingOffset: heading ? Math.round((heading.getBoundingClientRect().left - header.left) - (header.right - heading.getBoundingClientRect().right)) : 0,
    boxes: rects.map((r) => [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(',')).join(' '),
  };
}));

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await galleries();
  check(`${w}px: every image in a gallery is the same size`, base.every((g) => g.sizes.length === 1), base.filter((g) => g.sizes.length > 1).map((g) => `${g.name}: ${g.sizes.join(' ')}`).join('; '));
  const shapeWrong = base.filter((g) => Math.abs(g.ratio - RATIO[g.shape]) > 0.02).map((g) => `${g.name}: ${g.ratio.toFixed(2)}`);
  check(`${w}px: images are cropped to their Image shape`, shapeWrong.length === 0, shapeWrong.join('; '));
  check(`${w}px: images stay inside their section's lane`, base.every((g) => g.inside), base.filter((g) => !g.inside).map((g) => g.name).join('; '));
  const tooMany = base.filter((g) => g.count > 1 && (g.cols > g.max || g.cols < Math.min(2, g.count))).map((g) => `${g.name}: ${g.cols}`);
  check(`${w}px: between 2 and the chosen Columns side by side`, tooMany.length === 0, tooMany.join('; '));
  if (w === 375) check('375px: two columns on a phone', base.filter((g) => g.count > 1).every((g) => g.cols === 2), base.map((g) => g.cols).join(','));
  if (w === 1440) {
    const wrong = base.filter((g) => g.count > 1 && !g.name.includes('narrow') && g.cols !== g.max).map((g) => `${g.name}: ${g.cols}/${g.max}`);
    check('1440px: the chosen number of columns (content lane or wider)', wrong.length === 0, wrong.join('; '));
  }
  check(`${w}px: the last row is left unfilled (starts at the left)`, base.every((g) => g.firstLeft === 0));
  const centreWrong = base.filter((g) => g.centre && Math.abs(g.headingOffset) > 2).map((g) => g.name);
  check(`${w}px: Centred headings are centred`, centreWrong.length === 0, centreWrong.join('; '));
  info(`${w}px columns: ${base.map((g) => `${g.name.replace('Gallery: ', '').slice(0, 16)}=${g.cols}`).join(', ')}`);
  let moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    (await galleries()).forEach((g, i) => { if (g.boxes !== base[i].boxes) moved.push(`${g.name} on ${v}`); });
  }
  check(`${w}px: every image keeps its size and position on every page background and theme`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.gallery'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[3].getBoundingClientRect().bottom + scrollY - top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/gallery-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 6000) } });
}

// Header text contrast on every page background × theme (the grid is images only).
await p.setViewport({ width: 1440, height: 900 });
const rgbSource = `(() => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  window.rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  window.role = (el, prop) => { const probe = document.createElement('div'); probe.style.color = 'var(' + prop + ')'; el.append(probe); const c = rgb(getComputedStyle(probe).color); probe.remove(); return c; };
})()`;
let worst = 99, worstWhere = '';
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    await p.evaluate(rgbSource);
    const r = await p.evaluate(() => {
      let min = 99, where = '';
      for (const t of document.querySelectorAll('.gallery__eyebrow, .gallery__heading, .gallery__intro, .lightbox__count, .lightbox__caption, .lightbox__button')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), role(t.parentElement, '--color-bg'));
        if (c < min) { min = c; where = t.className.split(' ').find((x) => x.startsWith('gallery__') || x.startsWith('lightbox__')); }
      }
      return { min, where };
    });
    if (r.min < worst) { worst = r.min; worstWhere = `${r.where}, ${bg} page, ${theme || 'library default'} theme`; }
  }
}
check('header and lightbox text contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// Links: each is named and goes to the full image.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const links = await p.evaluate(() => [...document.querySelectorAll('.gallery__link')].map((a) => ({ name: a.querySelector('img').alt, href: a.getAttribute('href'), popup: a.getAttribute('aria-haspopup') })));
check('every image link has a name (alt text, caption, or "Image n of m")', links.length > 0 && links.every((l) => l.name.trim().length > 0), `${links.filter((l) => /^Image \d+ of \d+$/.test(l.name)).length} named by position`);
check('every image links to its full image', links.every((l) => /\.(jpe?g|png|webp|gif|avif)$/i.test(l.href) && !/-\d+x\d+\./.test(l.href)));
check('with JavaScript, links announce that they open a dialog', links.every((l) => l.popup === 'dialog'));

// ---------- Lightbox ----------
const state = () => p.evaluate(() => {
  const d = document.querySelector('.gallery__lightbox[open]');
  if (!d) return { open: false, focus: document.activeElement?.className ?? '', focusHref: document.activeElement?.getAttribute('href') };
  const img = d.querySelector('.lightbox__image');
  const r = img.getBoundingClientRect();
  const cap = d.querySelector('.lightbox__caption');
  return {
    open: true, src: img.getAttribute('src'), alt: img.alt, count: d.querySelector('.lightbox__count').textContent,
    caption: cap.hidden ? null : cap.textContent, focusInside: d.contains(document.activeElement), focusOnPage: document.activeElement !== document.body && !d.contains(document.activeElement), focus: document.activeElement.className,
    fits: r.width <= innerWidth && r.bottom <= innerHeight + 0.5 && r.top >= -0.5, imgH: r.height,
    scrollLocked: getComputedStyle(document.documentElement).overflow === 'hidden',
    buttons: [...d.querySelectorAll('.lightbox__button')].map((b) => { const br = b.getBoundingClientRect(); return Math.min(br.width, br.height); }),
    hasNav: !!d.querySelector('.lightbox__prev'),
  };
});

for (const w of [375, 1440]) {
  await p.setViewport({ width: w, height: w === 375 ? 700 : 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('.gallery')][0].querySelectorAll('.gallery__link').length);
  await (await p.$('.gallery__link')).click();
  await wait(400);
  let s = await state();
  const firstHref = await p.evaluate(() => document.querySelector('.gallery__link').href);
  check(`${w}px: clicking an image opens the lightbox with that image`, s.open && s.src === firstHref, s.src);
  check(`${w}px: the lightbox shows "1 of ${hrefs}"`, s.count === `1 of ${hrefs}`, s.count);
  check(`${w}px: the whole image fits on screen`, s.fits && s.imgH > 100, `${Math.round(s.imgH)}px tall`);
  check(`${w}px: lightbox buttons are at least 44px`, s.buttons.every((b) => b >= 44), s.buttons.map(Math.round).join(','));
  check(`${w}px: focus is inside the lightbox, and the page behind doesn't scroll`, s.focusInside && s.scrollLocked, s.focus);
  await p.screenshot({ path: `${SHOTS}/gallery-lightbox-${w}.png` });
  await p.keyboard.press('Escape'); await wait(400);
}

// Keyboard and buttons, on the first gallery.
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const total = await p.evaluate(() => document.querySelector('.gallery').querySelectorAll('.gallery__link').length);
await p.focus('.gallery__link');
const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
check('keyboard: an image link shows a focus outline', outline === 'solid', outline);
await p.keyboard.press('Enter'); await wait(400);
let s = await state();
check('keyboard: Enter opens the lightbox, focus on Close', s.open && s.focus.includes('lightbox__close'), s.focus);
await p.keyboard.press('ArrowRight'); await wait(100);
s = await state();
check('→ shows the next image', s.count === `2 of ${total}`, s.count);
await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await wait(100);
s = await state();
check('← from the first image goes round to the last', s.count === `${total} of ${total}`, s.count);
await p.click('.gallery__lightbox[open] .lightbox__next'); await wait(100);
s = await state();
check('Next from the last goes round to the first', s.count === `1 of ${total}`, s.count);
await p.click('.gallery__lightbox[open] .lightbox__next'); await wait(100);
s = await state();
check('the count is announced (aria-live)', await p.evaluate(() => document.querySelector('.gallery__lightbox[open] .lightbox__count').getAttribute('aria-live') === 'polite'));
// A modal dialog lets Tab reach the browser's own toolbar, but never the page behind.
let escaped = false;
for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); if ((await state()).focusOnPage) escaped = true; }
check('Tab never reaches the page behind the lightbox', !escaped);
await p.focus('.gallery__lightbox[open] .lightbox__close');
// Captions: shown for images that have one, hidden for those that don't.
const caps = [];
for (let i = 0; i < total; i++) { caps.push((await state()).caption); await p.keyboard.press('ArrowRight'); await wait(50); }
check('captions show for images that have one, and are hidden otherwise', caps.some((c) => c) && caps.every((c) => c === null || c.length > 0), `${caps.filter(Boolean).length} of ${total} captioned`);
check('captions are plain text (no HTML tags or entities)', caps.filter(Boolean).every((c) => !/[<>]|&#?\w+;/.test(c)));
// Swipe (touch): left for the next image.
const before = (await state()).count;
const cdp = await p.createCDPSession();
const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 450 }] });
await touch('touchStart', 900); await touch('touchMove', 700); await touch('touchMove', 500); await touch('touchEnd'); await wait(150);
const after = (await state()).count;
check('swiping left shows the next image', parseInt(after) === (parseInt(before) % total) + 1, `${before} → ${after}`);
// Closing: Escape, back to the image last shown.
await p.keyboard.press('ArrowRight'); await wait(100);
const shown = parseInt((await state()).count) - 1;
await p.keyboard.press('Escape'); await wait(400);
s = await state();
const shownHref = await p.evaluate((i) => document.querySelector('.gallery').querySelectorAll('.gallery__link')[i].getAttribute('href'), shown);
check('Escape closes it, and focus returns to the image last shown', !s.open && s.focusHref === shownHref, `${s.focus} ${s.focusHref?.split('/').pop()}`);
check('the page scrolls again once closed', await p.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden'));
// Clicking the dark space beside the image closes it; clicking the image doesn't.
await p.click('.gallery__link'); await wait(400);
await p.click('.gallery__lightbox[open] .lightbox__image'); await wait(100);
const stillOpen = (await state()).open;
await p.mouse.click(720, 60); await wait(400);
check('clicking the image keeps it open; clicking the space around closes it', stillOpen && !(await state()).open);
// One image: no Previous, Next or count.
const one = await p.evaluate(() => [...document.querySelectorAll('.gallery')].findIndex((g) => g.querySelectorAll('.gallery__link').length === 1));
await (await p.$$('.gallery'))[one].$('.gallery__link').then((l) => l.click()); await wait(400);
s = await state();
check('one image: no Previous or Next, and no count', s.open && !s.hasNav && (await p.evaluate(() => document.querySelector('.gallery__lightbox[open] .lightbox__count').hidden)));
await axeCheck(p, 'axe scan of the open lightbox', '.gallery__lightbox[open]');
await p.keyboard.press('Escape'); await wait(400);
// A modifier click (new tab) isn't taken over.
const newTab = await p.evaluate(() => { const a = document.querySelector('.gallery__link'); const e = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }); a.dispatchEvent(e); return { prevented: e.defaultPrevented, open: !!document.querySelector('.gallery__lightbox[open]') }; });
check('Cmd/Ctrl-click still opens the image in a new tab, not the lightbox', !newTab.prevented && !newTab.open);

// Reduced motion: no fade or zoom.
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const dur = await p.evaluate(() => [getComputedStyle(document.querySelector('.gallery__image')).transitionDuration, getComputedStyle(document.querySelector('.gallery__lightbox')).transitionDuration]);
check('reduced motion: no hover zoom or fade', dur.every((d) => d.split(', ').every((x) => x === '0s')), dur.join(' / '));
await p.emulateMediaFeatures([]);

// No JavaScript: every image is there, and a click opens the image itself.
const withJs = await p.evaluate(() => document.querySelectorAll('.gallery__image').length);
const nojs = await newPage({ errors: false }); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJsImages = await nojs.evaluate(() => document.querySelectorAll('.gallery__image').length);
const target = await nojs.evaluate(() => document.querySelector('.gallery__link').href);
await Promise.all([nojs.waitForNavigation(), nojs.click('.gallery__link')]);
check('without JavaScript every image is there, and a click opens the full image', noJsImages === withJs && withJs > 0 && nojs.url() === target, `${noJsImages}/${withJs}`);
await nojs.close();

// Accessibility, on a white and a black page.
for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all Galleries (${bg} page)`, '.gallery');
}

await finish();
