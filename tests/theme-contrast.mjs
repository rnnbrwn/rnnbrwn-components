import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
// Run against a BUILT rnnbrwn.xyz served locally; see README.md.
const BASE = process.env.BASE_URL || 'http://localhost:4500';
const SHOTS = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage();
await p.goto(BASE + '/components/hero/', { waitUntil: 'networkidle0' });
const themes = ['', 'forest', 'terracotta', 'harbour', 'plum', 'monochrome'];
let failures = 0;
for (const theme of themes) {
  const rows = await p.evaluate((theme) => {
    if (theme) document.documentElement.dataset.brand = theme; else delete document.documentElement.dataset.brand;
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('span'); document.body.append(probe);
    const rgb = (css) => { probe.style.color = css; const c = getComputedStyle(probe).color; cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const over = (top, bottom) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = bottom; cv.fillRect(0, 0, 1, 1); probe.style.color = top; cv.fillStyle = getComputedStyle(probe).color; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const out = {};
    for (const s of ['light', 'subtle', 'accent', 'dark']) {
      const el = document.createElement('div'); el.className = `surface-${s}`; document.body.append(el);
      const cs = getComputedStyle(el), v = (n) => cs.getPropertyValue(n).trim();
      const bg = rgb(v('--color-bg')), text = rgb(v('--color-text')), muted = rgb(v('--color-muted')), accent = rgb(v('--color-accent')), onAccent = rgb(v('--color-on-accent')), card = rgb(v('--color-card'));
      const tint = `color-mix(in srgb, ${v('--color-bg')} ${v('--tint-strength')}, transparent)`;
      const photoWorst = Math.min(...['#ffffff', '#000000'].map((P) => ratio(text, over(tint, P))));
      out[s] = { text: ratio(text, bg), muted: ratio(muted, bg), link: ratio(accent, bg), button: ratio(onAccent, accent), card: ratio(text, card), photo: photoWorst };
      el.remove();
    }
    probe.remove();
    return out;
  }, theme);
  console.log(`\n${(theme || 'library default').toUpperCase()}`);
  console.log('           text  muted  link  button  card  photo');
  for (const [s, r] of Object.entries(rows)) {
    const cells = ['text', 'muted', 'link', 'button', 'card', 'photo'].map((k) => { const x = r[k]; if (x < 4.5) failures++; return (x < 4.5 ? '!' : ' ') + x.toFixed(1).padStart(4); });
    console.log(`  ${s.padEnd(7)} ${cells.join('  ')}`);
  }
}
console.log(`\n${failures} pairings below 4.5:1 (marked !)`);
await b.close();
