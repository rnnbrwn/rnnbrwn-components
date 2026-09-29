import { BASE, SHOTS, BACKGROUNDS, THEMES, browser, check, info, wait, pick, newPage, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/contact-bar/preview/';
const p = await newPage();

// Every Contact Bar section: its layout (from its class), the width it measures (rem), the boxes
// of its header, list and buttons, and each detail's box, whether its text fits, and its link.
const sections = () => p.evaluate(() => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  return [...document.querySelectorAll('.contact-bar')].map((s, i) => ({
    name: s.querySelector('.contact-bar__heading')?.textContent.trim().replace('Contact Bar: ', '') || `section ${i + 1} (no heading)`,
    beside: s.classList.contains('contact-bar--beside'),
    centre: s.classList.contains('contact-bar--centre'),
    inner: box(s.querySelector('.contact-bar__inner')),
    headerAlign: s.querySelector('.contact-bar__header') && getComputedStyle(s.querySelector('.contact-bar__header')).textAlign,
    buttonBox: (() => { const b = [...s.querySelectorAll('.contact-bar__buttons > *')].map((x) => x.getBoundingClientRect()); return b.length ? { l: Math.min(...b.map((r) => r.left)), r: Math.max(...b.map((r) => r.right)) } : null; })(),
    width: s.querySelector('.contact-bar__inner').getBoundingClientRect().width / rem,
    header: box(s.querySelector('.contact-bar__header')),
    list: box(s.querySelector('.contact-bar__list')),
    buttons: box(s.querySelector('.contact-bar__buttons')),
    items: [...s.querySelectorAll('.contact-bar__item')].map((li) => ({
      ...box(li),
      fits: [...li.querySelectorAll('.contact-bar__label, .contact-bar__value')].every((c) => c.scrollWidth <= c.clientWidth + 1),
      link: !!li.querySelector('a'),
    })),
  }));
});
const key = (list) => list.map((s) => JSON.stringify([s.header, s.list, s.buttons, s.items.map((b) => [b.l, b.t, b.w, b.h])])).join('|');

for (const w of [375, 800, 1440]) {
  await p.setViewport({ width: w, height: 900 });
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(200);
  check(`${w}px: no horizontal scrolling`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const base = await sections();

  // Row: details share a row once the section is 30rem wide; one under another below that.
  // Beside: the details list is one under another, always.
  const rowWrong = base.filter((s) => {
    const shared = s.items.length > 1 && Math.abs(s.items[1].t - s.items[0].t) < 1;
    const want = !s.beside && s.width >= 30;
    return shared !== want;
  }).map((s) => `${s.name}: ${s.width.toFixed(0)}rem`);
  check(`${w}px: details share a row in Row layout from 30rem, and are listed one under another otherwise`, rowWrong.length === 0, rowWrong.join('; '));

  // Beside from 50rem: header and buttons in the left column, details to their right; stacked when narrower.
  const besideWrong = base.filter((s) => s.beside).filter((s) => {
    const side = s.header && s.list.l >= s.header.r;
    const want = s.width >= 50;
    const buttonsLeft = !s.buttons || !want || (s.buttons.l === s.header.l && s.buttons.t >= s.header.b);
    return side !== want || !buttonsLeft;
  }).map((s) => `${s.name}: ${s.width.toFixed(0)}rem`);
  check(`${w}px: Beside puts the heading and buttons left of the details from 50rem, stacked below`, besideWrong.length === 0, besideWrong.join('; '));

  // Centred: the header's text, the details as a group (each row of them) and the buttons sit in
  // the middle of the section; Left: all start at its left edge. Beside is never centred.
  const mid = (a, b) => Math.abs((a.l - b.l) - (b.r - a.r)) <= 2;
  const alignWrong = base.filter((s) => {
    if (s.beside && s.centre) return true;
    const rows = [...new Set(s.items.map((b) => Math.round(b.t)))].map((t) => {
      const row = s.items.filter((b) => Math.round(b.t) === t);
      return { l: Math.min(...row.map((b) => b.l)), r: Math.max(...row.map((b) => b.r)) };
    });
    if (s.centre) return s.headerAlign && s.headerAlign !== 'center' || rows.some((r) => !mid(s.inner, r)) || (s.buttonBox && !mid(s.inner, s.buttonBox));
    return (s.headerAlign && s.headerAlign === 'center') || rows.some((r) => Math.abs(r.l - s.list.l) > 1);
  }).map((s) => s.name);
  check(`${w}px: Centred centres the header, each row of details and the buttons; Left keeps them at the left edge`, alignWrong.length === 0, alignWrong.join('; '));

  const orderWrong = base.filter((s) => !(s.beside && s.width >= 50)).filter((s) => (s.header && s.header.b > s.list.t) || (s.buttons && s.buttons.t < s.list.b)).map((s) => s.name);
  check(`${w}px: header above the details, buttons below (Row, and Beside when stacked)`, orderWrong.length === 0, orderWrong.join('; '));
  const overflow = base.filter((s) => s.items.some((b) => !b.fits || b.r > s.list.r + 1)).map((s) => s.name);
  check(`${w}px: every label and value fits (incl. the very long email address)`, overflow.length === 0, overflow.join('; '));

  // Tap targets: every linked detail is at least 44px tall, and tapping its icon or label follows the link.
  const tap = await p.evaluate(() => {
    const wrong = [];
    for (const li of document.querySelectorAll('.contact-bar__item--link')) {
      const a = li.querySelector('a');
      li.scrollIntoView({ block: 'center' });
      const r = li.getBoundingClientRect();
      if (r.height < 44) wrong.push(`${a.textContent.trim().slice(0, 20)}: ${r.height.toFixed(0)}px`);
      for (const part of [li.querySelector('.contact-bar__icon'), li.querySelector('.contact-bar__label')]) {
        if (!part) continue;
        const pr = part.getBoundingClientRect();
        const hit = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
        if (hit?.closest('a') !== a) wrong.push(`${a.textContent.trim().slice(0, 20)}: ${part.className.baseVal ?? part.className} not tappable`);
      }
    }
    return wrong;
  });
  check(`${w}px: each linked detail is ≥ 44px and its icon and label follow the link`, tap.length === 0, tap.slice(0, 3).join('; '));

  const moved = [];
  for (const [kind, v] of [...BACKGROUNDS.slice(1).map((s) => ['background', s]), ...THEMES.slice(1).map((s) => ['theme', s])]) {
    await pick(p, kind, v); await wait(150);
    if (key(await sections()) !== key(base)) moved.push(v);
  }
  check(`${w}px: everything keeps its size and position on every page background and theme`, moved.length === 0, moved.join(', '));
  await pick(p, 'background', 'white'); await pick(p, 'theme', ''); await wait(150);
  const clip = await p.evaluate(() => { const s = document.querySelectorAll('.contact-bar'); const top = s[0].getBoundingClientRect().top + scrollY - 10; return { top, height: s[4].getBoundingClientRect().bottom - s[0].getBoundingClientRect().top + 20 }; });
  await p.screenshot({ path: `${SHOTS}/contact-bar-${w}.png`, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.height, 4000) } });
}

// ---------- Contrast: every background × theme ----------
await p.setViewport({ width: 1440, height: 900 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
let worst = 99, worstWhere = '', worstIcon = 99, worstIconWhere = '', worstHover = 99, worstHoverWhere = '';
for (const theme of THEMES) {
  for (const bg of BACKGROUNDS) {
    await pick(p, 'theme', theme); await pick(p, 'background', bg); await wait(120);
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const role = (t, name) => { const probe = document.createElement('div'); probe.style.color = `var(--color-${name})`; probe.style.background = 'var(--color-bg)'; t.closest('.contact-bar__inner').append(probe); const cs = getComputedStyle(probe); const c = { fg: rgb(cs.color), bg: rgb(cs.backgroundColor) }; probe.remove(); return c; };
      const where = (t) => `${(t.className.baseVal ?? t.className).split(' ').pop()} in "${t.closest('.contact-bar').querySelector('.contact-bar__heading')?.textContent.slice(13, 50) ?? '(no heading)'}"`;
      let min = 99, at = '', icon = 99, iconAt = '', hover = 99, hoverAt = '';
      for (const t of document.querySelectorAll('.contact-bar__eyebrow, .contact-bar__heading, .contact-bar__intro, .contact-bar__label, .contact-bar__value, .contact-bar__link, .contact-bar .button--text')) {
        const c = contrastRatio(rgb(getComputedStyle(t).color), role(t, 'text').bg);
        if (c < min) { min = c; at = where(t); }
      }
      for (const t of document.querySelectorAll('.contact-bar__icon')) {
        const c = contrastRatio(rgb(getComputedStyle(t).stroke), role(t, 'text').bg);
        if (c < icon) { icon = c; iconAt = where(t); }
      }
      // Hovered links turn the primary colour.
      for (const t of document.querySelectorAll('.contact-bar__link')) {
        const { fg, bg } = role(t, 'primary');
        const c = contrastRatio(fg, bg);
        if (c < hover) { hover = c; hoverAt = where(t); }
      }
      return { min, at, icon, iconAt, hover, hoverAt };
    });
    const label = `${bg} page, ${theme || 'library default'} theme`;
    if (r.min < worst) { worst = r.min; worstWhere = `${r.at}, ${label}`; }
    if (r.icon < worstIcon) { worstIcon = r.icon; worstIconWhere = `${r.iconAt}, ${label}`; }
    if (r.hover < worstHover) { worstHover = r.hover; worstHoverWhere = `${r.hoverAt}, ${label}`; }
  }
}
check('text and link contrast ≥ 4.5:1 on every background × theme', worst >= 4.5, `lowest ${worst.toFixed(2)}:1: ${worstWhere}`);
check('hovered link (primary) contrast ≥ 4.5:1 on every background × theme', worstHover >= 4.5, `lowest ${worstHover.toFixed(2)}:1: ${worstHoverWhere}`);
check('icon contrast ≥ 3:1 (non-text) on every background × theme', worstIcon >= 3, `lowest ${worstIcon.toFixed(2)}:1: ${worstIconWhere}`);
await pick(p, 'background', 'white'); await pick(p, 'theme', '');

// ---------- Structure and links ----------
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const structure = await p.evaluate(() => [...document.querySelectorAll('.contact-bar')].map((s) => {
  const h = s.querySelector('.contact-bar__heading'), e = s.querySelector('.contact-bar__eyebrow'), list = s.querySelector('.contact-bar__list');
  return {
    h2: !h || h.tagName === 'H2',
    eyebrowFirst: !e || !!(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING),
    list: list.tagName === 'UL' && list.getAttribute('role') === 'list' && [...list.children].every((c) => c.tagName === 'LI'),
    iconsHidden: [...s.querySelectorAll('.contact-bar__icon')].every((i) => i.getAttribute('aria-hidden') === 'true'),
  };
}));
check('headings are h2, with the eyebrow just above', structure.every((s) => s.h2 && s.eyebrowFirst));
check('the details are a list; icons are hidden from screen readers', structure.every((s) => s.list && s.iconsHidden));

const links = await p.evaluate(() => {
  const first = document.querySelector('.contact-bar');
  const item = (type) => first.querySelector(`.contact-bar__item--${type}`);
  const a = (type) => item(type)?.querySelector('a');
  const label = (type) => item(type)?.querySelector('.contact-bar__label')?.textContent.trim();
  return {
    email: a('email')?.getAttribute('href'),
    phone: a('phone')?.getAttribute('href'),
    phoneText: a('phone')?.textContent.trim(),
    map: a('address')?.getAttribute('href'),
    mapTab: a('address')?.target === '_blank' && /noopener/.test(a('address')?.rel),
    mapNote: a('address')?.querySelector('.visually-hidden')?.textContent.includes('new tab'),
    otherLink: !!a('other'),
    otherIcon: !!item('other')?.querySelector('.contact-bar__icon'),
    labels: [label('email'), label('phone'), label('address'), label('other')],
    addressLines: a('address')?.querySelectorAll('br').length,
    noMap: [...document.querySelectorAll('.contact-bar__item--address')].some((li) => !li.querySelector('a')),
  };
});
check('email links to mailto:', links.email === 'mailto:hello@example.com', links.email);
check('phone links to tel: with only digits, and "(0)" dropped after +44; shown as typed', links.phone === 'tel:+441415550123' && links.phoneText === '+44 (0)141 555 0123', `${links.phone}, "${links.phoneText}"`);
check('"Link to a map" opens a Google Maps search in a new tab, announced to screen readers', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=12%20Example%20Street%2C%20Glasgow/.test(links.map) && links.mapTab && links.mapNote);
check('an address without "Link to a map" is plain text; address lines keep their line breaks', links.noMap && links.addressLines === 2);
check('Other has no link and no icon', !links.otherLink && !links.otherIcon);
check('empty labels default by type; Other shows its own', JSON.stringify(links.labels) === JSON.stringify(['Email', 'Telephone', 'Address', 'Opening hours']), links.labels.join(', '));

// Keyboard: each link is reached by Tab and shows a focus outline around the whole detail.
await p.evaluate(() => { const h = document.querySelector('.contact-bar__heading'); h.tabIndex = -1; h.focus(); });
await p.keyboard.press('Tab');
const outline = await p.evaluate(() => { const a = document.activeElement; return a?.classList.contains('contact-bar__link') ? getComputedStyle(a, '::after').outlineStyle : `focus on ${a?.tagName}`; });
check('keyboard focus shows an outline around the whole detail', outline === 'solid', outline);

// No JavaScript: the same details.
const withJs = await p.evaluate(() => document.querySelectorAll('.contact-bar__item').length);
const nojs = await browser.newPage(); await nojs.setJavaScriptEnabled(false);
await nojs.goto(PAGE, { waitUntil: 'networkidle0' });
const noJs = await nojs.evaluate(() => document.querySelectorAll('.contact-bar__item').length);
check('without JavaScript every detail is there', noJs === withJs && withJs > 0, `${noJs}/${withJs}`);
await nojs.close();

for (const bg of ['white', 'black']) {
  await p.goto(PAGE, { waitUntil: 'networkidle0' });
  await pick(p, 'background', bg); await wait(150);
  await axeCheck(p, `axe scan of all Contact Bar sections (${bg} page)`, '.contact-bar');
}

await finish();
