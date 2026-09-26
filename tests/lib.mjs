// Shared set-up for the browser checks: every script starts with
//   import { browser, check, finish, ... } from './lib.mjs';
// and ends with `await finish();`. Run against a BUILT rnnbrwn.xyz served locally; see README.md.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

export const BASE = process.env.BASE_URL || 'http://localhost:4500';
export const SHOTS = new URL('./shots', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

// The test pages' preview switches (rnnbrwn.xyz's ComponentsLayout.astro): page surfaces, and
// brand themes ('' is the library default).
export const SURFACES = ['light', 'subtle', 'accent', 'dark'];
export const BRANDS = ['', 'forest', 'terracotta', 'harbour', 'plum', 'monochrome'];

export const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });

const results = [];
/** Record a check: prints as PASS or FAIL, with an optional detail. */
export const check = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
/** Record a line that's neither a pass nor a fail. */
export const info = (line) => results.push(`INFO  ${line}`);

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click a preview switch on a test page: pick(p, 'surface', 'dark') or pick(p, 'brand', 'forest'). */
export const pick = (p, kind, v) => p.evaluate((k, v) => document.querySelector(`[data-preview="${k}"][data-value="${v}"]`).click(), kind, v);

// JavaScript errors and failed requests on pages made with newPage(), printed by finish().
const errors = [];
let watching = false;

// WCAG contrast ratio of two [r, g, b] colours, available in the page as contrastRatio(a, b).
const contrastSource = `window.contrastRatio = (a, b) => {
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};`;

/**
 * A new browser tab that records page errors and failed requests (listed by finish()) and has
 * contrastRatio() on every page it loads. `errors: false` for tabs meant to fail (e.g. no JavaScript).
 */
export async function newPage({ errors: watch = true } = {}) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(contrastSource);
  if (watch) {
    watching = true;
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && errors.push(`${r.status()} ${r.url()}`));
  }
  return p;
}

const axeSource = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

/**
 * An axe accessibility scan (WCAG 2.2 AA) of the elements matching `selector` (the whole page by
 * default), recorded as a check that passes with no violations. Also lists what axe couldn't
 * decide ("needs a human").
 */
export async function axeCheck(p, name, selector = null) {
  await p.evaluate(axeSource);
  const r = await p.evaluate(async (selector) => {
    const found = await axe.run(selector ? document.querySelectorAll(selector) : document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] });
    const list = (items) => items.map((v) => `${v.id}: ${v.nodes.length}`);
    return { v: list(found.violations), inc: list(found.incomplete) };
  }, selector);
  check(name, r.v.length === 0, r.v.join(', ') || `no violations; needs a human: ${r.inc.join(', ') || 'nothing'}`);
}

/** Print the results (and any page errors) and close the browser. */
export async function finish() {
  console.log(results.join('\n'));
  if (watching) console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
}
