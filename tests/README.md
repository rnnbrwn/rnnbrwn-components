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
| `hero.mjs` | Hero: layout unchanged on every background and theme, photos fill and stay on screen, worst-case text contrast over photos, axe, alt text, buttons, lazy loading |
| `card-grid.mjs` | Card Grid: columns at each screen size (one on phones, the editor's choice when there's room), cards keep their size and position on every background and theme, Panel and Plain line up exactly, Last card (Fill the row stretches only when the row has space; Column width never does; images stay one height), panels stay on screen and never touch, 3:2 images, card text contrast (every background × theme, against the card fill), one link per card named by its heading, the whole card clickable, hover, keyboard focus round the card, heading levels, reduced motion, no JavaScript, axe |
| `buttons.mjs` | Buttons: layout unchanged on every background and theme, 44px targets, wrapping, text and border contrast at rest and on hover (every background × theme), automatic arrows, new tabs, keyboard order and focus, reduced motion, no JavaScript, axe |
| `footer.mjs` | Footer: stacked on phones (two columns side by side), brand area beside all columns on wide screens, size and position unchanged on every background and theme, 44px links, text/link contrast (4.5:1) and icon contrast (3:1) on every background × theme, the dark-background logo, landmarks and names, `#` headings as text, current page, new tabs, site links, the © line, keyboard focus, no JavaScript, axe on white and black. When the built footer is the **Single line** layout it checks that instead (lines up with the navigation, only the line, contrast, axe): seed with `-e FOOTER_LAYOUT=line` after `run --rm -T`, rebuild, run `npm run footer`, then re-seed without it |
| `theme-contrast.mjs` | Every theme × background × colour role (text, muted, link and link hover, button at rest and on hover, brand text, card, photo) is at least 4.5:1 |
| `rhythm.mjs` | Vertical rhythm: every line of text (headings, paragraphs, list items, quotes) is a whole number of quarter lines of `--line` on phone and desktop, heading line-heights stay between 1 and 1.35, editor text is 1 line apart (1.5 above a subheading, 0.5 below it), the page height is unchanged across page backgrounds |

Each prints `PASS`/`FAIL` lines; screenshots go to `tests/shots/` (not committed). Add a script for
each new component (see the `/add-component` skill), reusing these as templates. The shared set-up
is in `lib.mjs`: the browser, `check()`/`info()`, `newPage()` (records page errors and gives the page
`contrastRatio(a, b)`), `pick()` for the preview switches, `axeCheck()`, `BACKGROUNDS`/`THEMES`, and
`finish()` to print the results. Add a script to `package.json`'s `all` too.
