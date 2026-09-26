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
| `test-pages.mjs` | The Navigation menu (with its Parts dropdown) reaches the overview and every component page (desktop and phone); each page shows only its component; the overview and Parts page list sections and parts separately |
| `navigation.mjs` | Navigation: dropdown sub-links (keyboard, hover and its grace delay, Escape, click outside, touch, no JavaScript, on screen, current page), full-screen menu on phones, page behind inert and scroll-locked, keyboard (Tab, Escape), closing, reduced motion, no JavaScript, axe scans |
| `hero.mjs` | Hero: layout unchanged on every surface and theme, photos fill and stay on screen, worst-case text contrast over photos, axe, alt text, buttons, lazy loading |
| `card-grid.mjs` | Card Grid: columns at each screen size (one on phones, the editor's choice when there's room), cards keep their size and position on every surface and theme, Panel and Plain line up exactly, Last card (Fill the row stretches only when the row has space; Column width never does; images stay one height), panels stay on screen and never touch, 3:2 images, card text contrast (every surface × theme, against the card fill), one link per card named by its heading, the whole card clickable, hover, keyboard focus round the card, heading levels, reduced motion, no JavaScript, axe |
| `buttons.mjs` | Buttons: layout unchanged on every surface and theme, 44px targets, wrapping, text and border contrast at rest and on hover (every surface × theme), automatic arrows, new tabs, keyboard order and focus, reduced motion, no JavaScript, axe |
| `theme-contrast.mjs` | Every theme × surface × colour role (text, muted, link, button, card, photo) is at least 4.5:1 |

Each prints `PASS`/`FAIL` lines; screenshots go to `tests/shots/` (not committed). Add a script for
each new component (see the `/add-component` skill), reusing these as templates.
