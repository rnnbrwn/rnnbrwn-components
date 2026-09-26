import { BASE, SURFACES, BRANDS, browser, newPage } from './lib.mjs';
const p = await newPage({ errors: false });
await p.goto(BASE + '/components/hero/', { waitUntil: 'networkidle0' });
let failures = 0;
for (const theme of BRANDS) {
  const rows = await p.evaluate((theme, surfaces) => {
    if (theme) document.documentElement.dataset.brand = theme; else delete document.documentElement.dataset.brand;
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('span'); document.body.append(probe);
    const rgb = (css) => { probe.style.color = css; const c = getComputedStyle(probe).color; cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const over = (top, bottom) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = bottom; cv.fillRect(0, 0, 1, 1); probe.style.color = top; cv.fillStyle = getComputedStyle(probe).color; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const out = {};
    for (const s of surfaces) {
      const el = document.createElement('div'); el.className = `surface-${s}`; document.body.append(el);
      const cs = getComputedStyle(el), v = (n) => cs.getPropertyValue(n).trim();
      const bg = rgb(v('--color-bg')), text = rgb(v('--color-text')), muted = rgb(v('--color-muted')), accent = rgb(v('--color-accent')), onAccent = rgb(v('--color-on-accent')), card = rgb(v('--color-card'));
      const tint = `color-mix(in srgb, ${v('--color-bg')} ${v('--tint-strength')}, transparent)`;
      const photoWorst = Math.min(...['#ffffff', '#000000'].map((P) => contrastRatio(text, over(tint, P))));
      out[s] = { text: contrastRatio(text, bg), muted: contrastRatio(muted, bg), link: contrastRatio(accent, bg), button: contrastRatio(onAccent, accent), card: contrastRatio(text, card), photo: photoWorst };
      el.remove();
    }
    probe.remove();
    return out;
  }, theme, SURFACES);
  console.log(`\n${(theme || 'library default').toUpperCase()}`);
  console.log('           text  muted  link  button  card  photo');
  for (const [s, r] of Object.entries(rows)) {
    const cells = ['text', 'muted', 'link', 'button', 'card', 'photo'].map((k) => { const x = r[k]; if (x < 4.5) failures++; return (x < 4.5 ? '!' : ' ') + x.toFixed(1).padStart(4); });
    console.log(`  ${s.padEnd(7)} ${cells.join('  ')}`);
  }
}
console.log(`\n${failures} pairings below 4.5:1 (marked !)`);
await browser.close();
