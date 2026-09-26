import { BASE, SHOTS, SURFACES, BRANDS, browser, check, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
// Buttons (the Button component and the Buttons section). Run against a BUILT rnnbrwn.xyz
// served locally; see README.md.
const PAGE = BASE + '/components/buttons/';
const p = await newPage();

const geometry = () => p.evaluate(() => [...document.querySelectorAll('.buttons .button')].map((a) => {
  const r = a.getBoundingClientRect();
  return [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(',');
}));

// Layout: no sideways scrolling, buttons stay inside their section, and nothing moves when the page
// surface or brand changes (backgrounds never change layout).
for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(150);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const outside = await p.evaluate(() => [...document.querySelectorAll('.buttons .button')].filter((a) => {
    const r = a.getBoundingClientRect(), row = a.closest('.button-row').getBoundingClientRect();
    return r.left < row.left - 0.5 || r.right > row.right + 0.5;
  }).map((a) => a.textContent.trim()));
  check(`${w}px: every button fits inside its row`, outside.length === 0, outside.slice(0, 3).join('; '));
  const base = await geometry();
  const moved = [];
  for (const [kind, v] of [...SURFACES.slice(1).map((s) => ['surface', s]), ...BRANDS.slice(1).map((t) => ['brand', t])]) {
    await pick(p, kind, v); await wait(120);
    (await geometry()).forEach((g, i) => { if (g !== base[i]) moved.push(`button ${i + 1} on ${v}`); });
  }
  check(`${w}px: buttons keep their size and position on every page surface and brand`, moved.length === 0, moved.slice(0, 3).join('; '));
  await pick(p, 'surface', 'light'); await pick(p, 'brand', ''); await wait(120);
  const sizes = await p.evaluate(() => [...document.querySelectorAll('.buttons .button')].map((a) => Math.round(a.getBoundingClientRect().height)));
  check(`${w}px: every button is at least 44px tall`, Math.min(...sizes) >= 44, `smallest ${Math.min(...sizes)}px`);
  const centred = await p.evaluate(() => [...document.querySelectorAll('.button-row--centre')].map((row) => {
    const r = row.getBoundingClientRect(), a = row.firstElementChild.getBoundingClientRect(), z = row.lastElementChild.getBoundingClientRect();
    // only meaningful when the buttons share a line
    return Math.round(a.top) !== Math.round(z.top) || Math.abs((a.left - r.left) - (r.right - z.right)) <= 1;
  }));
  check(`${w}px: centred rows are centred`, centred.every(Boolean));
  const shotTop = await p.evaluate(() => document.querySelector('.buttons').getBoundingClientRect().top + scrollY - 10);
  const shotBottom = await p.evaluate(() => { const s = document.querySelectorAll('.buttons'); return s[s.length - 1].getBoundingClientRect().bottom + scrollY + 10; });
  await p.screenshot({ path: `${SHOTS}/buttons-${w}.png`, clip: { x: 0, y: shotTop, width: w, height: shotBottom - shotTop } });
}
const wrapped = await p.evaluate(() => { const row = [...document.querySelectorAll('.buttons')].pop(); return [...row.querySelectorAll('.button')].some((a) => a.getBoundingClientRect().height > 50); });
await p.setViewport({ width: 375, height: 900 }); await p.goto(PAGE, { waitUntil: 'networkidle0' });
const wrappedPhone = await p.evaluate(() => { const row = [...document.querySelectorAll('.buttons')].pop(); return [...row.querySelectorAll('.button')].some((a) => a.getBoundingClientRect().height > 50); });
check('long labels wrap onto a second line on a phone', wrappedPhone, `wrapped at 1440px too: ${wrapped}`);

// Contrast: every button's text (and an outline's border) against what's behind it, at rest and
// on hover, on every page surface and brand. Colours go through a canvas: color-mix() values aren't rgb().
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); // no transitions mid-measurement
const measure = () => p.evaluate(() => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
  return [...document.querySelectorAll('.buttons .button')].map((a) => {
    // what's behind the button: its own fill if it has one, otherwise its surface's background
    const surface = getComputedStyle(a.closest('[class*="surface-"]') ?? document.body).getPropertyValue('--color-bg').trim();
    const own = rgba(getComputedStyle(a).backgroundColor);
    const probe = document.createElement('span'); probe.style.color = surface; document.body.append(probe);
    const behind = own[3] === 255 ? own.slice(0, 3) : rgba(getComputedStyle(probe).color).slice(0, 3);
    probe.remove();
    const cs = getComputedStyle(a);
    return { name: a.textContent.trim(), style: a.className.replace('button', '').trim() || 'solid', text: contrastRatio(rgba(cs.color), behind), border: contrastRatio(rgba(cs.borderTopColor), behind) };
  });
});
let worst = { text: 99 }, worstBorder = { border: 99 }, count = 0;
const note = (rows, state, where) => rows.forEach((r) => {
  count++;
  if (r.text < worst.text) worst = { ...r, state, where };
  if (r.style === 'button--outline' && r.border < worstBorder.border) worstBorder = { ...r, state, where };
});
for (const brand of BRANDS) {
  await pick(p, 'brand', brand);
  for (const surface of SURFACES) {
    await pick(p, 'surface', surface); await wait(60);
    note(await measure(), 'rest', `${brand || 'default'}/${surface} page`);
    // hover each button in turn and measure it
    const n = await p.$$eval('.buttons .button', (x) => x.length);
    for (let i = 0; i < n; i++) {
      const el = (await p.$$('.buttons .button'))[i];
      await el.hover();
      const rows = await measure();
      note([rows[i]], 'hover', `${brand || 'default'}/${surface} page`);
    }
  }
}
await p.mouse.move(0, 0);
check('button text is at least 4.5:1 at rest and on hover (every button, surface and brand)', worst.text >= 4.5, `${count} measured; lowest ${worst.text.toFixed(2)}:1, "${worst.name}" ${worst.state}, ${worst.where}`);
check('outline borders are at least 3:1', worstBorder.border >= 3, `lowest ${worstBorder.border.toFixed(2)}:1, "${worstBorder.name}" ${worstBorder.state}, ${worstBorder.where}`);
await pick(p, 'brand', ''); await pick(p, 'surface', 'light');

// Hover: Solid and Outline never underline; their fill changes and a shadow appears, without moving
const hover = [];
for (const style of ['solid', 'outline', 'text']) {
  const sel = style === 'solid' ? '.buttons .button:not(.button--outline):not(.button--text)' : `.buttons .button--${style}`;
  const read = () => p.$eval(sel, (a) => { const cs = getComputedStyle(a), r = a.getBoundingClientRect(); return { line: cs.textDecorationLine, shadow: cs.boxShadow, bg: cs.backgroundColor, box: [r.x + scrollX, r.y + scrollY, r.width, r.height].map(Math.round).join() }; });
  const rest = await read();
  await p.hover(sel);
  const on = await read();
  await p.mouse.move(0, 0);
  hover.push({ style, rest, on });
}
const boxed = hover.filter((h) => h.style !== 'text');
check('Solid and Outline: no underline on hover', boxed.every((h) => h.on.line === 'none'), boxed.map((h) => `${h.style} ${h.on.line}`).join(', '));
check('Solid and Outline: a shadow and a fill change on hover', boxed.every((h) => h.on.shadow !== 'none' && h.on.bg !== h.rest.bg));
check('Text links: underlined, no shadow', hover[2].on.line === 'underline' && hover[2].on.shadow === 'none');
check('hovering never moves or resizes a button', hover.every((h) => h.on.box === h.rest.box));

// Arrows, links and new tabs
const info = await p.evaluate(() => [...document.querySelectorAll('.buttons .button')].map((a) => ({
  name: a.textContent.trim(), cls: a.className, href: a.getAttribute('href'), target: a.target, rel: a.rel,
  icon: a.querySelector('.button__icon')?.classList[1] ?? '', hidden: a.querySelector('.button__icon')?.getAttribute('aria-hidden'),
})));
const external = (x) => /^https?:/.test(x.href);
check('text links get the → arrow', info.filter((x) => x.cls.includes('--text') && !external(x) && !x.target).every((x) => x.icon === 'button__icon--next'));
check('links to other websites or new tabs get the ↗ arrow', info.filter((x) => external(x) || x.target).every((x) => x.icon === 'button__icon--out'), info.filter((x) => external(x)).length + ' such links');
check('Solid and Outline links on the site have no arrow', info.filter((x) => !x.cls.includes('--text') && !external(x) && !x.target).every((x) => !x.icon));
check('arrows are hidden from screen readers', info.filter((x) => x.icon).every((x) => x.hidden === 'true'));
check('a new-tab button says so and has rel=noopener', info.filter((x) => x.target === '_blank').every((x) => x.rel.includes('noopener') && x.name.includes('(opens in a new tab)')));
check('button links to the CMS became site links', info.every((x) => !x.href.includes('localhost:8080')), [...new Set(info.map((x) => x.href))].join(' '));
check('an anchor link stays an anchor', info.some((x) => x.href === '#buttons'));

// Motion: the arrow nudge is instant with reduced motion
const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.button__icon')).transitionDuration);
check('reduced motion: no animated arrows', dur === '0s', dur);
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

// Keyboard: Tab reaches every button in order, each with a visible outline
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const expected = info.map((x) => x.name);
await p.focus('.buttons .button');
const reached = [], rings = [];
for (let i = 0; i < expected.length; i++) {
  const [name, ring] = await p.evaluate(() => [document.activeElement.textContent.trim(), getComputedStyle(document.activeElement).outlineStyle]);
  reached.push(name); rings.push(ring);
  await p.keyboard.press('Tab');
}
check('Tab reaches every button in reading order', JSON.stringify(reached) === JSON.stringify(expected), `${reached.length} buttons`);
check('keyboard focus shows an outline on every button', rings.every((r) => r === 'solid'));

// Accessibility scan
await axeCheck(p, 'axe scan of the whole Buttons page');

// No JavaScript: buttons are plain links, all still there
const noJs = await browser.newPage();
await noJs.setJavaScriptEnabled(false);
await noJs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJsCount = await noJs.$$eval('.buttons a.button[href]', (x) => x.length);
check('without JavaScript every button is still a working link', noJsCount === info.length, `${noJsCount} of ${info.length}`);

await finish();
