// Every theme × background × colour role that carries text is at least 4.5:1:
//   text, muted       the background's text, and muted text
//   link, link:hover  links (--color-primary) and hovered links (--color-hover)
//   button, btn:hover button text (--color-on-primary) on the primary and hover fills
//   brand             text in the brand colour (eyebrows)
//   card              text on a card fill
//   photo             text over the worst-case photo (pure white or black) under the background's tint
import { BASE, BACKGROUNDS, THEMES, browser, newPage } from './lib.mjs';
const p = await newPage({ errors: false });
await p.goto(BASE + '/components/hero/preview/', { waitUntil: 'networkidle0' });
const COLUMNS = ['text', 'muted', 'link', 'link:hover', 'button', 'btn:hover', 'brand', 'card', 'photo'];
let failures = 0;
for (const theme of THEMES) {
  const rows = await p.evaluate((theme, backgrounds) => {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('span'); document.body.append(probe);
    const rgb = (css) => { probe.style.color = css; const c = getComputedStyle(probe).color; cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const over = (top, bottom) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = bottom; cv.fillRect(0, 0, 1, 1); probe.style.color = top; cv.fillStyle = getComputedStyle(probe).color; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const out = {};
    for (const b of backgrounds) {
      const el = document.createElement('div'); el.className = `bg-${b}`; document.body.append(el);
      const cs = getComputedStyle(el), v = (n) => cs.getPropertyValue(n).trim(), c = (n) => rgb(v(n));
      const bg = c('--color-bg'), text = c('--color-text'), primary = c('--color-primary'), hover = c('--color-hover'), onPrimary = c('--color-on-primary');
      const tint = `color-mix(in srgb, ${v('--color-bg')} ${v('--tint-strength')}, transparent)`;
      out[b] = {
        text: contrastRatio(text, bg),
        muted: contrastRatio(c('--color-muted'), bg),
        link: contrastRatio(primary, bg),
        'link:hover': contrastRatio(hover, bg),
        button: contrastRatio(onPrimary, primary),
        'btn:hover': contrastRatio(onPrimary, hover),
        brand: contrastRatio(c('--color-brand'), bg),
        card: contrastRatio(text, c('--color-card')),
        photo: Math.min(...['#ffffff', '#000000'].map((P) => contrastRatio(text, over(tint, P)))),
      };
      el.remove();
    }
    probe.remove();
    return out;
  }, theme, BACKGROUNDS);
  console.log(`\n${(theme || 'library default').toUpperCase()}`);
  console.log(`          ${COLUMNS.map((k) => k.padStart(9)).join(' ')}`);
  for (const [b, r] of Object.entries(rows)) {
    const cells = COLUMNS.map((k) => { const x = r[k]; if (x < 4.5) failures++; return ((x < 4.5 ? '!' : ' ') + x.toFixed(1)).padStart(9); });
    console.log(`  ${b.padEnd(7)} ${cells.join(' ')}`);
  }
}
console.log(`\n${failures} pairings below 4.5:1 (marked !)`);
await browser.close();
