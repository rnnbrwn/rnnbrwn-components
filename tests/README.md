# Browser checks

Real-browser checks for the shared components, run against the **built** rnnbrwn.xyz test pages
(`/components/…`), using your installed Google Chrome (no browser download).

```bash
# 1. build and serve rnnbrwn.xyz (local WordPress must be running: /local-site rnnbrwn.xyz)
cd sites/rnnbrwn.xyz && npm run build && (cd dist && python3 -m http.server 4500 &)
# 2. run the checks
cd platform/rnnbrwn-components/tests && npm install && npm run all
```

| Script | Checks |
|---|---|
| `test-pages.mjs` | The Navigation menu reaches the overview and every component page (desktop and phone); each page shows only its component |
| `navigation.mjs` | Navigation: full-screen menu on phones, page behind inert and scroll-locked, keyboard (Tab, Escape), closing, reduced motion, no JavaScript, axe scans |
| `hero.mjs` | Hero: layout unchanged on every surface and theme, photos fill and stay on screen, worst-case text contrast over photos, axe, alt text, buttons, lazy loading |
| `theme-contrast.mjs` | Every theme × surface × colour role (text, muted, link, button, card, photo) is at least 4.5:1 |

Each prints `PASS`/`FAIL` lines; screenshots go to `tests/shots/` (not committed). Add a script for
each new component (see the `/add-component` skill), reusing these as templates.
