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
const state = (p) => p.evaluate(() => {
  const btn = document.querySelector('.site-nav__toggle'), menu = document.querySelector('.site-nav__menu');
  const ms = getComputedStyle(menu), r = menu.getBoundingClientRect();
  return { expanded: btn.getAttribute('aria-expanded'), btnShown: getComputedStyle(btn).display !== 'none', visibility: ms.visibility, opacity: ms.opacity,
    rect: [r.left, r.top, r.width, r.height].map(Math.round), inertMain: document.querySelector('main').inert,
    overflow: getComputedStyle(document.documentElement).overflow, focus: document.activeElement?.className || '', focusText: document.activeElement?.textContent.trim() || '' };
});
const tabs = async (p, n) => { const seq = []; for (let i = 0; i < n; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; return (a.closest('header') ? 'header:' : 'PAGE:') + (a.textContent.trim().replace(/\s+/g, ' ') || a.className || a.tagName); })); } return seq; };
const axe = async (p, label) => {
  await p.evaluate(axeSource);
  const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((v) => `${v.id}: ${v.nodes.length}`));
  check(`axe scan (whole page): ${label}`, r.length === 0, r.join(', ') || 'no violations');
};

// ---- Phone ----
let p = await b.newPage();
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
// A section in the middle of the page (the last one can't scroll to the top of the screen).
await p.evaluate(() => { const a = document.querySelector('.site-nav__links a'); a.href = '/components/hero/#hero'; a.click(); }); await wait(600);
s = await state(p);
const anchorTop = await p.evaluate(() => Math.round(document.getElementById('hero').getBoundingClientRect().top));
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
p = await b.newPage();
await p.setViewport({ width: 375, height: 260 }); // short enough that four links don't fit
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.click('.site-nav__toggle'); await wait(400);
const scrolls = await p.evaluate(() => { const m = document.querySelector('.site-nav__menu'); m.scrollTop = 1000; return { can: m.scrollHeight > m.clientHeight, moved: m.scrollTop > 0, lastVisible: document.querySelector('.site-nav__links li:last-child a').getBoundingClientRect().bottom <= innerHeight }; });
check('short screen: the menu scrolls so every link can be reached', scrolls.can && scrolls.moved && scrolls.lastVisible);
await p.close();

// ---- Desktop unchanged ----
p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
s = await state(p);
const barH = await p.evaluate(() => Math.round(document.querySelector('.site-nav').getBoundingClientRect().height));
check('desktop: links in the bar, no button, page untouched', !s.btnShown && s.visibility === 'visible' && !s.inertMain && barH < 100, `header ${barH}px tall`);
await axe(p, 'desktop');
await p.close();

// ---- Reduced motion, no JS, dark ----
p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.click('.site-nav__toggle'); await wait(20);
const rm = await p.evaluate(() => ({ o: getComputedStyle(document.querySelector('.site-nav__menu')).opacity, t: getComputedStyle(document.querySelector('.site-nav__links')).translate }));
check('reduced motion: appears instantly, links don\'t move', rm.o === '1' && (rm.t === 'none' || rm.t === '0px'), `opacity ${rm.o}, translate ${rm.t}`);
await p.close();
p = await b.newPage();
await p.setJavaScriptEnabled(false);
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
s = await state(p);
check('no JavaScript: links shown under the bar, no button, page usable', !s.btnShown && s.visibility === 'visible' && s.rect[3] < 400);
await p.close();
p = await b.newPage();
await p.setViewport({ width: 375, height: 800 });
await p.goto(PAGE, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.querySelector('[data-preview="surface"][data-value="dark"]').click());
await p.click('.site-nav__toggle'); await wait(400);
await axe(p, 'phone, menu open, dark page');
await p.screenshot({ path: SHOTS + '/fs-open-dark.png' });
await p.close();

console.log(results.join('\n'));
await b.close();
