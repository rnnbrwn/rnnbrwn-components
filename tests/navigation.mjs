import { BASE, SHOTS, browser, check, wait, pick, axeCheck, finish } from './lib.mjs';
const PAGE = BASE + '/components/navigation/preview/';
const state = (p) => p.evaluate(() => {
  const btn = document.querySelector('.site-nav__toggle'), menu = document.querySelector('.site-nav__menu');
  const ms = getComputedStyle(menu), r = menu.getBoundingClientRect();
  return { expanded: btn.getAttribute('aria-expanded'), btnShown: getComputedStyle(btn).display !== 'none', visibility: ms.visibility, opacity: ms.opacity,
    rect: [r.left, r.top, r.width, r.height].map(Math.round), inertMain: document.querySelector('main').inert,
    overflow: getComputedStyle(document.documentElement).overflow, focus: document.activeElement?.className || '', focusText: document.activeElement?.textContent.trim() || '' };
});
const tabs = async (p, n) => { const seq = []; for (let i = 0; i < n; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; return (a.closest('header') ? 'header:' : 'PAGE:') + (a.textContent.trim().replace(/\s+/g, ' ') || a.className || a.tagName); })); } return seq; };
const axe = (p, label) => axeCheck(p, `axe scan (whole page): ${label}`);

// ---- Phone ----
let p = await browser.newPage();
await p.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
let s = await state(p);
check('closed: menu hidden, page usable and scrollable', s.visibility === 'hidden' && !s.inertMain && s.overflow !== 'hidden');
await axe(p, 'phone, menu closed');
await p.tap('.site-nav__toggle'); await wait(60);
const mid = await p.evaluate(() => Number(getComputedStyle(document.querySelector('.site-nav__menu')).opacity));
await wait(400);
s = await state(p);
check('open: menu covers the whole screen', JSON.stringify(s.rect) === JSON.stringify([0, 0, 375, 800]), s.rect.join(','));
check('open: fades in (not instant)', mid > 0 && mid < 1, `opacity 60ms in = ${mid.toFixed(2)}`);
const cover = await p.evaluate(() => {
  const at = (x, y) => document.elementFromPoint(x, y);
  const btn = document.querySelector('.site-nav__toggle').getBoundingClientRect(), logo = document.querySelector('.site-nav__logo').getBoundingClientRect();
  return {
    button: !!at(btn.left + btn.width / 2, btn.top + btn.height / 2)?.closest('.site-nav__toggle'),
    logo: !!at(logo.left + 5, logo.top + logo.height / 2)?.closest('.site-nav__logo'),
    page: [[180, 500], [40, 760], [340, 700]].every(([x, y]) => at(x, y)?.closest('.site-nav')),
    firstLinkBelowBar: document.querySelector('.site-nav__links a').getBoundingClientRect().top >= document.querySelector('.site-nav__bar').getBoundingClientRect().bottom,
  };
});
check('open: logo and close button stay visible on top', cover.button && cover.logo);
check('open: nothing of the page shows or can be tapped', cover.page);
check('open: links start below the bar', cover.firstLinkBelowBar);
check('open: page behind is inert (unreachable by keyboard and screen readers)', s.inertMain);
check('open: page behind cannot scroll', s.overflow === 'hidden');
await p.mouse.move(180, 500); await p.mouse.wheel({ deltaY: 600 }); await wait(300);
await p.touchscreen.touchStart(180, 600); await p.touchscreen.touchMove(180, 200); await p.touchscreen.touchEnd(); await wait(300);
check('open: swiping or scrolling does not move the page', (await p.evaluate(() => scrollY)) === 0);
await axe(p, 'phone, menu open');
await p.screenshot({ path: SHOTS + '/fs-open.png' });
await p.focus('.site-nav__toggle');
const seq = await tabs(p, 9);
// After the last link focus briefly leaves the web page for the browser's own toolbar (<body> is
// reported): that's normal. What matters is that no element of the page itself gets focus.
const label = (x) => (x.startsWith('PAGE:') && x.length > 200 ? '(browser toolbar)' : x.replace('header:', ''));
check('open: Tab cycles through the menu and never reaches the page', seq.every((x) => x.startsWith('header:') || label(x) === '(browser toolbar)'), seq.map(label).join(' → '));
await p.focus('.site-nav__toggle');
await p.keyboard.press('Escape'); await wait(400);
s = await state(p);
check('Escape closes, focus back on the button, page restored', s.expanded === 'false' && s.visibility === 'hidden' && s.focus.includes('site-nav__toggle') && !s.inertMain && s.overflow !== 'hidden');
await p.tap('.site-nav__toggle'); await wait(400);
await p.tap('.site-nav__toggle'); await wait(400);
s = await state(p);
check('the close button closes and restores the page', s.expanded === 'false' && !s.inertMain && s.overflow !== 'hidden');
await p.tap('.site-nav__toggle'); await wait(400);
// A section of this page ("On phones", with the Footer below it so it can scroll to the top of the screen).
await p.evaluate(() => { const a = document.querySelector('.site-nav__links a'); a.href = location.pathname + '#on-phones'; a.click(); }); await wait(600);
s = await state(p);
const anchorTop = await p.evaluate(() => Math.round(document.getElementById('on-phones').getBoundingClientRect().top));
check('following an in-page link closes the menu and scrolls to the section', s.expanded === 'false' && !s.inertMain && Math.abs(anchorTop) < 5, `section top ${anchorTop}px`);
// opening when scrolled part-way
await p.evaluate(() => window.scrollTo(0, 30)); await wait(100);
await p.tap('.site-nav__toggle'); await wait(400);
const scrolled = await p.evaluate(() => ({ y: scrollY, bar: Math.round(document.querySelector('.site-nav__bar').getBoundingClientRect().top), link: Math.round(document.querySelector('.site-nav__links a').getBoundingClientRect().top), barBottom: Math.round(document.querySelector('.site-nav__bar').getBoundingClientRect().bottom) }));
check('opening while scrolled a little brings the bar to the top', scrolled.y === 0 && scrolled.link >= scrolled.barBottom, `scrollY ${scrolled.y}, bar bottom ${scrolled.barBottom}, first link ${scrolled.link}`);
await p.setViewport({ width: 1024, height: 800 }); await wait(400);
s = await state(p);
check('widening the window closes it and restores the page', s.expanded === 'false' && !s.inertMain && s.overflow !== 'hidden' && !s.btnShown && s.visibility === 'visible');
await p.close();

// ---- Many links: the menu itself scrolls ----
p = await browser.newPage();
await p.setViewport({ width: 375, height: 260 }); // short enough that four links don't fit
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.click('.site-nav__toggle'); await wait(400);
const scrolls = await p.evaluate(() => { const m = document.querySelector('.site-nav__menu'); m.scrollTop = 1000; return { can: m.scrollHeight > m.clientHeight, moved: m.scrollTop > 0, lastVisible: document.querySelector('.site-nav__links li:last-child a').getBoundingClientRect().bottom <= innerHeight }; });
check('short screen: the menu scrolls so every link can be reached', scrolls.can && scrolls.moved && scrolls.lastVisible);
await p.close();

// ---- Desktop unchanged ----
p = await browser.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
s = await state(p);
const barH = await p.evaluate(() => Math.round(document.querySelector('.site-nav').getBoundingClientRect().height));
check('desktop: links in the bar, no button, page untouched', !s.btnShown && s.visibility === 'visible' && !s.inertMain && barH < 100, `header ${barH}px tall`);
await axe(p, 'desktop');
await p.close();

// ---- Reduced motion, no JS, dark ----
p = await browser.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.click('.site-nav__toggle'); await wait(20);
const rm = await p.evaluate(() => ({ o: getComputedStyle(document.querySelector('.site-nav__menu')).opacity, t: getComputedStyle(document.querySelector('.site-nav__links')).translate }));
check('reduced motion: appears instantly, links don\'t move', rm.o === '1' && (rm.t === 'none' || rm.t === '0px'), `opacity ${rm.o}, translate ${rm.t}`);
await p.close();
p = await browser.newPage();
await p.setJavaScriptEnabled(false);
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
s = await state(p);
// Page usable: the links are an ordinary list in the page (not an overlay), with the page after them.
const flow = await p.evaluate(() => ({ position: getComputedStyle(document.querySelector('.site-nav__menu')).position, below: document.querySelector('main').getBoundingClientRect().top >= document.querySelector('.site-nav__menu').getBoundingClientRect().bottom }));
check('no JavaScript: links shown under the bar, no button, page usable', !s.btnShown && s.visibility === 'visible' && flow.position === 'static' && flow.below, `menu ${s.rect[3]}px tall, ${flow.position}`);
await p.close();
p = await browser.newPage();
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await pick(p, 'background', 'black');
await p.click('.site-nav__toggle'); await wait(400);
await axe(p, 'phone, menu open, dark page');
await p.screenshot({ path: SHOTS + '/fs-open-dark.png' });
await p.close();

// ---- Sub-links: a dropdown on wider screens (the test menu's "Parts": Buttons, Placeholder) ----
// Found by its link, since Sections comes first in the test menu (and a CSS selector works without JavaScript too).
const PARTS = '.site-nav__item:has(> .site-nav__parent > a[href$="/components/parts/"])';
const sub = (p) => p.evaluate((sel) => {
  const item = document.querySelector(sel);
  const btn = item.querySelector(".site-nav__sub-toggle"), list = item.querySelector('.site-nav__sub'), r = list.getBoundingClientRect();
  return { shown: getComputedStyle(list).visibility === 'visible', expanded: btn.getAttribute('aria-expanded'), btnShown: getComputedStyle(btn).display !== 'none',
    focus: document.activeElement?.textContent.trim() || document.activeElement?.tagName, right: Math.round(r.right), left: Math.round(r.left),
    parentLeft: Math.round(item.querySelector('a').getBoundingClientRect().left), subLinkLeft: Math.round(list.querySelector('a').getBoundingClientRect().left), mainTop: Math.round(document.querySelector('main').getBoundingClientRect().top) };
}, PARTS);
const subCenter = (p, selector) => p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, selector);
p = await browser.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
let d = await sub(p);
const names = await p.evaluate((sel) => { const btn = document.querySelector(`${sel} .site-nav__sub-toggle`); return { name: btn.textContent.trim(), controls: !!document.getElementById(btn.getAttribute('aria-controls'))?.matches('.site-nav__sub') }; }, PARTS);
check('dropdown: closed at first, its button is labelled and controls it', !d.shown && d.expanded === 'false' && d.btnShown && names.name === 'Parts menu' && names.controls, `"${names.name}"`);
const mainTop = d.mainTop;
// Keyboard: the parent link, then its button; Enter opens; Tab goes through the sub-links; tabbing out closes.
await p.focus(`${PARTS} > .site-nav__parent > a`);
let kseq = await tabs(p, 1);
d = await sub(p);
check('dropdown: closed sub-links are skipped by Tab (parent link → its button)', d.focus === 'Parts menu' && !d.shown, kseq.join(' → '));
await p.keyboard.press('Enter'); await wait(300);
d = await sub(p);
check('dropdown: Enter on the button opens it', d.expanded === 'true' && d.shown);
check('dropdown: opening it doesn\'t move the page', d.mainTop === mainTop, `main top ${mainTop} → ${d.mainTop}`);
check('dropdown: stays on screen', d.right <= 1280 && d.left >= 0, `${d.left}–${d.right}px`);
kseq = await tabs(p, 3);
d = await sub(p);
check('dropdown: Tab goes through its links, then tabbing out closes it', kseq[0] === 'header:Buttons' && kseq[1] === 'header:Placeholder' && d.expanded === 'false' && !d.shown, kseq.join(' → '));
// The accessibility scan moves focus (which closes a dropdown opened with its button), so it runs
// with the dropdown held open by the pointer resting on it, and checks it was still open.
await p.mouse.move(...(await subCenter(p, `${PARTS} > .site-nav__parent > a`)));
await p.mouse.move(...(await subCenter(p, `${PARTS} .site-nav__sub li:last-child a`)), { steps: 8 }); await wait(300);
await axe(p, 'desktop, dropdown open');
check('dropdown: it was open for that scan', (await sub(p)).shown);
// (Taking a screenshot loses the hover, so for the picture it's opened with its button.)
await p.click(`${PARTS} .site-nav__sub-toggle`); await wait(300);
// captureBeyondViewport: false, or the capture resizes the page and Navigation's resize handler closes the dropdown.
await p.screenshot({ path: SHOTS + '/dropdown-open.png', clip: { x: 0, y: 0, width: 1280, height: 260 }, captureBeyondViewport: false });
await p.keyboard.press('Escape');
await p.mouse.move(400, 600); await wait(700);
await p.focus(`${PARTS} .site-nav__sub-toggle`); await p.keyboard.press('Enter'); await p.keyboard.press('Tab'); await wait(300);
await p.keyboard.press('Escape'); await wait(50);
d = await sub(p);
check('dropdown: Escape from a sub-link closes it, focus back on its button', d.expanded === 'false' && !d.shown && d.focus === 'Parts menu', `expanded ${d.expanded}, shown ${d.shown}, focus "${d.focus}"`);
// Mouse: hovering opens it; a short grace after the pointer leaves; clicking elsewhere closes one opened by the button.
const parentAt = await subCenter(p, `${PARTS} > .site-nav__parent > a`);
await p.mouse.move(...parentAt); await wait(300);
d = await sub(p);
check('dropdown: hovering over the parent opens it (without changing aria-expanded)', d.shown && d.expanded === 'false');
await p.mouse.move(...(await subCenter(p, `${PARTS} .site-nav__sub li:last-child a`)), { steps: 8 }); await wait(100);
check('dropdown: stays open while the pointer moves down into it', (await sub(p)).shown);
await p.mouse.move(400, 600); await wait(100);
const during = (await sub(p)).shown;
await wait(700);
check('dropdown: after the pointer leaves it stays briefly, then closes', during && !(await sub(p)).shown);
await p.mouse.move(...parentAt); await wait(300);
await p.keyboard.press('Escape'); await wait(50);
const dismissed = !(await sub(p)).shown;
await p.mouse.move(400, 600); await wait(100); await p.mouse.move(...parentAt); await wait(300);
check('dropdown: Escape hides one shown by hovering; hovering again shows it', dismissed && (await sub(p)).shown);
await p.click(`${PARTS} .site-nav__sub-toggle`); await wait(300);
const pinned = await sub(p);
await p.mouse.move(400, 600); await wait(700);
const pinnedAway = await sub(p);
await p.click(`${PARTS} .site-nav__sub-toggle`); await wait(50);
d = await sub(p);
check('dropdown: clicking its button keeps it open after the pointer leaves; clicking again closes it at once', pinned.expanded === 'true' && pinnedAway.shown && d.expanded === 'false' && !d.shown);
await p.click(`${PARTS} .site-nav__sub-toggle`); await wait(100);
await p.mouse.click(400, 600); await wait(700);
d = await sub(p);
check('dropdown: clicking elsewhere closes it', d.expanded === 'false' && !d.shown);
await p.setViewport({ width: 800, height: 800 }); await wait(700);
await p.click(`${PARTS} .site-nav__sub-toggle`); await wait(300);
d = await sub(p);
check('dropdown: stays on screen on a narrow desktop (800px)', d.shown && d.right <= 800 && d.left >= 0, `${d.left}–${d.right}px`);
await p.close();

// Current page inside a dropdown: the page's own link is aria-current; its parent is marked too.
p = await browser.newPage();
await p.setViewport({ width: 1280, height: 800 });
// The Navigation page is a sub-link of Site.
await p.goto(PAGE, { waitUntil: 'networkidle0' });
const cur = await p.evaluate(() => ({
  current: [...document.querySelectorAll('.site-nav [aria-current="page"]')].map((a) => a.textContent.trim()),
  within: [...document.querySelectorAll('.site-nav [data-current-within] > .site-nav__parent > a')].map((a) => a.textContent.trim()),
  weight: getComputedStyle(document.querySelector('.site-nav [data-current-within] > .site-nav__parent > a')).fontWeight,
}));
check('dropdown: on a sub-link\'s page, that link is current and its parent looks current', cur.current.join() === 'Navigation' && cur.within.join() === 'Site' && cur.weight === '700', `current ${cur.current}, parent ${cur.within}`);
await p.close();

// Touch (a tablet: wide, no hover): the button opens and closes it; the parent link still goes to its page.
p = await browser.newPage();
await p.setViewport({ width: 1024, height: 768, isMobile: true, hasTouch: true });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.tap(`${PARTS} .site-nav__sub-toggle`); await wait(300);
const tapOpen = (await sub(p)).shown;
await p.tap(`${PARTS} .site-nav__sub-toggle`); await wait(700);
check('dropdown: on a touch screen, tapping the button opens and closes it', tapOpen && !(await sub(p)).shown);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }), p.tap(`${PARTS} > .site-nav__parent > a`)]);
check('dropdown: tapping the parent link goes to its page', new URL(p.url()).pathname === '/components/parts/', new URL(p.url()).pathname);
await p.close();

// No JavaScript, wide: no button; the dropdown opens on keyboard focus.
p = await browser.newPage();
await p.setJavaScriptEnabled(false);
await p.setViewport({ width: 1280, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
d = await sub(p);
await p.focus(`${PARTS} > .site-nav__parent > a`);
kseq = await tabs(p, 1);
const nojs = await sub(p);
check('dropdown, no JavaScript: no button; Tab from the parent opens it on its first link', !d.btnShown && !d.shown && nojs.shown && kseq[0] === 'header:Buttons', kseq.join(' → '));
await p.close();

// Phone: listed under the parent, indented, no button.
p = await browser.newPage();
await p.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.tap('.site-nav__toggle'); await wait(400);
d = await sub(p);
check('phone: sub-links listed under their parent, indented, no dropdown button', d.shown && !d.btnShown && d.subLinkLeft > d.parentLeft, `sub-links start ${d.subLinkLeft - d.parentLeft}px further in`);
await p.screenshot({ path: SHOTS + '/fs-open-sub.png' });
await p.close();

await finish();
