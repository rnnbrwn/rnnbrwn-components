// Vertical rhythm: text on a quarter-line grid of --line (scss/base/_base.scss, snap-leading()),
// and text spaced in lines (editor text in scss/base/_prose.scss; components in their own styles).
import { BASE, SHOTS, SURFACES, check, info, wait, newPage, finish } from './lib.mjs';
const PAGES = ['example-site', 'hero', 'rich-text', 'card-grid', 'media-text'];
const p = await newPage();

// One line of body text (--line) and a quarter of it, in px, measured with a probe element.
const lineSize = () => p.evaluate(() => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.blockSize = 'var(--line)';
  const line = probe.getBoundingClientRect().height;
  probe.remove();
  return line;
});
const onGrid = (n, step) => Math.abs(n / step - Math.round(n / step)) * step < 0.1;

for (const w of [375, 1280]) {
  await p.setViewport({ width: w, height: 900 });
  for (const slug of PAGES) {
    await p.goto(`${BASE}/components/${slug}/`, { waitUntil: 'networkidle0' });
    const line = await lineSize();
    const quarter = line / 4;
    const text = await p.evaluate(() => [...document.querySelectorAll('main :is(h1, h2, h3, h4, h5, h6, p, li, blockquote)')]
      .filter((e) => e.getClientRects().length && !e.closest('.button, .preview-switch'))
      .map((e) => {
        const cs = getComputedStyle(e);
        return { name: `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 30)}"`, heading: /^H\d/.test(e.tagName), lh: parseFloat(cs.lineHeight), size: parseFloat(cs.fontSize) };
      }));
    const off = text.filter((t) => !onGrid(t.lh, quarter)).map((t) => `${t.name}: ${t.lh.toFixed(2)}px`);
    check(`${w}px ${slug}: every line of text is a whole number of quarter lines (${quarter.toFixed(2)}px)`, off.length === 0, off.slice(0, 5).join('; '));
    const loose = text.filter((t) => t.heading && !(t.lh / t.size >= 1 && t.lh / t.size <= 1.35)).map((t) => `${t.name}: ${(t.lh / t.size).toFixed(2)}`);
    check(`${w}px ${slug}: heading line-heights stay between 1 and 1.35`, loose.length === 0, loose.slice(0, 5).join('; '));

    // Editor text: blocks one line apart, a subheading 1.5 lines below the text above it and
    // half a line above its own text.
    if (slug === 'rich-text') {
      const gaps = await p.evaluate(() => [...document.querySelectorAll('.prose > * + *')].map((e) => ({
        kind: /^H\d/.test(e.tagName) ? 'heading' : /^H\d/.test(e.previousElementSibling.tagName) ? 'after-heading' : 'block',
        gap: e.getBoundingClientRect().top - e.previousElementSibling.getBoundingClientRect().bottom,
      })));
      const want = { block: line, heading: line * 1.5, 'after-heading': line / 2 };
      const wrong = gaps.filter((g) => Math.abs(g.gap - want[g.kind]) > 0.5).map((g) => `${g.kind} ${g.gap.toFixed(1)}px`);
      check(`${w}px rich-text: editor text spacing is 1 line, 1.5 lines above a subheading, 0.5 below it (${gaps.length} gaps)`, wrong.length === 0, wrong.slice(0, 5).join('; '));
    }
    await p.screenshot({ path: `${SHOTS}/rhythm-${slug}-${w}.png`, fullPage: true });
  }
}

// Backgrounds never change the layout.
await p.setViewport({ width: 1280, height: 900 });
await p.goto(BASE + '/components/example-site/', { waitUntil: 'networkidle0' });
const heights = [];
for (const s of SURFACES) {
  await p.evaluate((s) => { document.body.className = document.body.className.replace(/\bsurface-\S+/g, '').trim() + ` surface-${s}`; }, s);
  await wait(100);
  heights.push(await p.evaluate(() => document.documentElement.scrollHeight));
}
check('the page is the same height on every page surface', new Set(heights).size === 1, heights.join(', '));

info(`screenshots: ${SHOTS}/rhythm-*.png`);
await finish();
