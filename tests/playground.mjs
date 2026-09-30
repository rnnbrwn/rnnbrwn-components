import { BASE, SHOTS, check, wait, newPage, axeCheck, finish } from './lib.mjs';
// The Settings controls on each component's page (rnnbrwn.xyz's ComponentControls.astro and
// Playground.astro): the page holds one copy per combination of the component's own settings and
// shows exactly one; every choice of every setting shows the matching copy, and each looks
// different; Keep in view and the shared Settings tab change the shown copy; a setting that
// depends on another shows only with it; the View switch; axe.
const PAGES = ['hero', 'rich-text', 'card-grid', 'media-text', 'accordion', 'stats', 'testimonials', 'contact-bar', 'cta-banner', 'buttons', 'placeholder'];
const p = await newPage();
await p.setViewport({ width: 1440, height: 900 });

// The shown copy: its index, how many show, and what it looks like (classes, open items, grouped items, focus points).
const shown = () => p.evaluate(() => {
  const copies = [...document.querySelector('[data-playground]').children];
  const visible = copies.filter((c) => c.checkVisibility());
  const s = visible[0];
  return {
    count: visible.length,
    index: copies.indexOf(s),
    keys: JSON.parse(document.querySelector('[data-playground]').dataset.playground),
    // Classes, and data- attributes (e.g. Media Text's data-shape), but not Astro's style scoping or the focus point.
    looks: s ? [s, ...s.querySelectorAll('*')].map((e) => [e.getAttribute('class') ?? '', ...[...e.attributes].filter((a) => a.name.startsWith('data-') && !a.name.startsWith('data-astro') && a.name !== 'data-focus' && a.name !== 'data-shown').map((a) => `${a.name}=${a.value}`)].join(' '))
      .concat([...s.querySelectorAll('details')].map((d) => `${d.open}/${!!d.name}`)).join('|') : '',
    classes: s?.className ?? '', width: s?.dataset.width, inner: s?.dataset.inner ?? '', space: s?.dataset.space,
    focus: [...(s?.querySelectorAll('[data-focus]') ?? [])].map((e) => e.dataset.focus).join(','),
  };
});
const controls = () => p.evaluate(() => [...document.querySelectorAll('.docs-control')].map((f) => ({
  field: f.dataset.field, kind: f.dataset.kind, when: f.dataset.when ? JSON.parse(f.dataset.when) : null,
  values: [...f.querySelectorAll('input')].map((i) => i.value), checked: f.querySelector('input:checked').value, hidden: f.hidden,
})));
const pickControl = (field, value) => p.click(`input[name="control-${field}"][value="${value}"] + span`).then(() => wait(120));

for (const slug of PAGES) {
  await p.goto(`${BASE}/components/${slug}/`, { waitUntil: 'networkidle0' });
  const list = await controls();
  const defaults = Object.fromEntries(list.map((c) => [c.field, c.checked]));
  const copyControls = list.filter((c) => c.kind === 'copy');
  let s = await shown();
  const expected = copyControls.reduce((n, c) => n * c.values.length, 1);
  check(`${slug}: one copy per combination of its settings (${expected}), exactly one showing, the defaults first`, s.keys.length === expected && s.count === 1 && s.index === 0, `${s.keys.length} copies, ${s.count} showing`);

  const problems = [];
  for (const c of list) {
    // A setting that depends on another: hidden until that one allows it, then shown.
    if (c.when) {
      if (!c.when[1].includes(defaults[c.when[0]]) && !c.hidden) problems.push(`${c.field} shows without ${c.when[0]}`);
      await pickControl(c.when[0], c.when[1][0]);
      if (await p.evaluate((f) => document.querySelector(`.docs-control[data-field="${f}"]`).hidden, c.field)) problems.push(`${c.field} hidden with ${c.when[0]}=${c.when[1][0]}`);
    }
    const looks = new Set();
    for (const value of c.values) {
      await pickControl(c.field, value);
      s = await shown();
      if (s.count !== 1) problems.push(`${c.field}=${value}: ${s.count} showing`);
      if (c.kind === 'copy') {
        const want = (await controls()).filter((x) => x.kind === 'copy').map((x) => `${x.field}=${x.checked}`).join('&');
        if (s.keys[s.index] !== want) problems.push(`${c.field}=${value}: showed ${s.keys[s.index]}`);
        looks.add(s.looks);
      } else if (c.kind === 'focus') {
        if (!s.focus.split(',').every((f) => f === value)) problems.push(`${c.field}=${value}: focus ${s.focus}`);
      } else if (c.field === 'background') {
        const bg = s.classes.split(' ').filter((x) => x.startsWith('bg-'));
        if (value === 'page' ? bg.length : bg.join() !== `bg-${value}`) problems.push(`background=${value}: ${bg.join() || 'none'}`);
      } else if (c.field === 'width') {
        if (s.width !== value || (value === 'full') !== !!s.inner) problems.push(`width=${value}: ${s.width}, inner "${s.inner}"`);
      } else if (c.field === 'contentWidth') {
        if (s.inner !== value) problems.push(`contentWidth=${value}: inner "${s.inner}"`);
      } else if (c.field === 'spacing') {
        if (s.space !== value) problems.push(`spacing=${value}: ${s.space}`);
      }
    }
    if (c.kind === 'copy' && looks.size !== c.values.length) problems.push(`${c.field}: ${looks.size} different looks for ${c.values.length} choices`);
    await pickControl(c.field, defaults[c.field]);
    if (c.when) await pickControl(c.when[0], defaults[c.when[0]]);
  }
  check(`${slug}: every choice of every setting shows the matching copy, each looking different`, problems.length === 0, problems.join('; ') || `${list.length} settings: ${list.map((c) => c.field).join(', ')}`);
}

// Wide screens: Settings in a column on the right, clear of the component and staying in view as
// the page scrolls; narrower, above the component.
const layout = () => p.evaluate(() => {
  const c = document.querySelector('.docs-controls').getBoundingClientRect(), f = document.querySelector('[data-preview]').getBoundingClientRect();
  return { right: c.left >= f.right, above: c.bottom <= f.top, top: Math.round(c.top), bottom: Math.round(c.bottom), height: innerHeight };
});
await p.setViewport({ width: 1440, height: 900 });
await p.goto(`${BASE}/components/card-grid/`, { waitUntil: 'networkidle0' });
let l = await layout();
check('1440px: Settings on the right of the component, not over it', l.right, `Settings ${l.top}–${l.bottom}px`);
await p.evaluate(() => scrollTo(0, 600)); await wait(150);
l = await layout();
check('1440px: Settings stay in view as the page scrolls', l.top >= 64 && l.bottom <= l.height, `Settings ${l.top}–${l.bottom}px of ${l.height}px`);
await p.setViewport({ width: 1024, height: 900 });
await p.goto(`${BASE}/components/card-grid/`, { waitUntil: 'networkidle0' });
l = await layout();
check('1024px: Settings above the component', l.above && !l.right);
await p.setViewport({ width: 1440, height: 900 });

// The View switch: all the test versions instead, without the Settings controls, and back.
await p.goto(`${BASE}/components/card-grid/`, { waitUntil: 'networkidle0' });
await p.screenshot({ path: SHOTS + '/playground-card-grid-1440.png', fullPage: true });
await p.click('[data-view="all"]');
const all = await p.evaluate(() => [document.querySelector('.docs-controls').hidden, [...document.querySelectorAll('[data-view-only="all"] .l-page > section')].filter((s) => s.checkVisibility()).length]);
check('View "All test versions": every test version, no Settings controls', all[0] === true && all[1] > 1, `${all[1]} sections`);
await p.click('[data-view="one"]');
await wait(100);
const back = await p.evaluate(() => !document.querySelector('.docs-controls').hidden);
check('…and back to one copy with its Settings', back && (await shown()).count === 1);

await axeCheck(p, 'axe: a component page with its Settings controls');
await p.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
await p.goto(`${BASE}/components/media-text/`, { waitUntil: 'networkidle0' });
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check('phone: the Settings controls fit (no sideways scrolling)', overflow <= 0, `${overflow}px`);
await axeCheck(p, 'axe: phone, Settings controls');
await finish();
