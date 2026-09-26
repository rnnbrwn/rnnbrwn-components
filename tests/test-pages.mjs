import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
// Run against a BUILT rnnbrwn.xyz served locally; see README.md.
const BASE = process.env.BASE_URL || 'http://localhost:4500';
const SHOTS = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results = [];
const check = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
// The Example Site is a real-looking page (its first Hero is the <h1>), not one component's test versions.
const EXAMPLE = 'Example Site';
// Menu order; Buttons and Placeholder are parts, so they're sub-links of Parts (a dropdown on desktop).
const expected = { Components: null, [EXAMPLE]: 'example-site', Hero: 'hero', 'Rich Text': 'rich-text', 'Card Grid': 'card-grid', Parts: 'parts', Buttons: 'buttons', Placeholder: 'placeholder' };
const PARTS = 'Parts';
const SUB_LINKS = ['Buttons', 'Placeholder'];
for (const [label, viewport] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 375, height: 800, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage();
  await p.setViewport(viewport);
  await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
  const menu = await p.evaluate(() => [...document.querySelectorAll('.site-nav__links a')].map((a) => a.textContent.trim()));
  check(`${label}: menu lists the overview and every component page`, JSON.stringify(menu) === JSON.stringify(Object.keys(expected)), menu.join(' · '));
  for (const name of Object.keys(expected)) {
    if (label === 'phone') { await p.tap('.site-nav__toggle'); await new Promise((r) => setTimeout(r, 350)); }
    // On desktop a sub-link is in the dropdown: open it with its button first.
    if (label === 'desktop' && SUB_LINKS.includes(name)) { await p.click('.site-nav__sub-toggle'); await new Promise((r) => setTimeout(r, 300)); }
    const link = await p.evaluateHandle((n) => [...document.querySelectorAll('.site-nav__links a')].find((a) => a.textContent.trim() === n), name);
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }), label === 'phone' ? link.tap() : link.click()]);
    const r = await p.evaluate(() => ({
      path: location.pathname,
      h1: document.querySelector('h1')?.textContent.trim(),
      current: document.querySelector('.site-nav [aria-current="page"]')?.textContent.trim(),
      types: [...new Set([...document.querySelectorAll('.l-page > section[class]')].map((s) => s.classList[0]))],
      menuOpen: document.querySelector('.site-nav')?.hasAttribute('data-open'),
      count: document.querySelectorAll('.l-page > section[data-width]').length,
      h1Count: document.querySelectorAll('h1').length,
      firstIsMainHero: !!document.querySelector('.l-page > section.hero h1.hero__heading'),
    }));
    const slug = expected[name];
    const want = slug === null ? '/components/' : `/components/${slug}/`;
    if (name === EXAMPLE) {
      check(`${label}: "${name}" goes to ${want}, marked current, its first Hero is the only <h1>`, r.path === want && r.current === name && r.h1Count === 1 && r.firstIsMainHero && r.count > 0 && !r.menuOpen, `${r.path}, h1 "${r.h1}", ${r.count} sections: ${r.types.join(', ')}`);
      continue;
    }
    // The overview and Parts list pages instead of showing sections.
    const onlyThis = slug === null || name === PARTS ? r.count === 0 : r.types.length === 1;
    check(`${label}: "${name}" goes to ${want}, marked current, showing only its component`, r.path === want && r.h1 === name && r.current === name && onlyThis && !r.menuOpen, `${r.path}, h1 "${r.h1}", ${r.count} sections: ${r.types.join(', ') || 'overview list'}`);
  }
  if (label === 'desktop') {
    await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
    const lists = await p.evaluate(() => [...document.querySelectorAll('.component-list')].map((ul) => [...ul.querySelectorAll('a')].map((a) => a.textContent.trim()).join(', ')));
    check('overview lists sections and parts separately, with their numbers of test versions', lists[0] === 'Hero, Rich Text, Card Grid' && lists[1] === SUB_LINKS.join(', '), lists.join(' | '));
    await p.goto(BASE + '/components/parts/', { waitUntil: 'networkidle0' });
    const parts = await p.evaluate(() => [...document.querySelectorAll('.component-list a')].map((a) => a.textContent.trim()).join(', '));
    check('the Parts page lists the parts', parts === SUB_LINKS.join(', '), parts);
    await p.goto(BASE + '/components/', { waitUntil: 'networkidle0' });
    const exampleLink = await p.evaluate(() => document.querySelector('.component-index__example a')?.getAttribute('href'));
    check('overview links to the Example Site separately', exampleLink === '/components/example-site/', exampleLink);
    await p.screenshot({ path: SHOTS + '/overview-1280.png' });
  }
  await p.close();
}
console.log(results.join('\n'));
await b.close();
