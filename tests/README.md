# Browser checks

Real-browser checks for the shared components, run against the **built** rnnbrwn.xyz component pages
(`/components/…`), using your installed Google Chrome (no browser download). A component's page shows
ONE copy of it with live Settings controls (`playground.mjs` checks those), or all its test versions.
The component checks load `/components/<name>/preview/` instead: the same test versions on a page
of their own, built as a real site builds one.

```bash
# 1. build and serve rnnbrwn.xyz (local WordPress must be running: /local-site rnnbrwn.xyz)
cd sites/rnnbrwn.xyz && npm run build && (cd dist && python3 -m http.server 4500 &)
# 2. run the checks
cd platform/rnnbrwn-components/tests && npm install && npm run all
```

| Script | Checks |
|---|---|
| `test-pages.mjs` | The component pages: the sidebar reaches every page (desktop, and on phones from the Menu button), each marked current with one `<h1>`; each component's page shows only its component (the Example Site, Navigation and Footer with the site's Navigation and Footer); the overview, Parts and Site pages list their pages; the toolbar switches change the component (background on it and `<body>`, so a White section on a black page becomes a panel; theme; 375px at Phone) and not the top bar, sidebar or page, theme and width carrying over to the next page; a token in "Built from" opens the Tokens page at its section, below the top bar; axe; Escape closes the phone menu; the test Navigation menu lists every page (Parts and Site with sub-links); full-width sections' lanes |
| `navigation.mjs` | Navigation, on its preview page: dropdown sub-links (keyboard, hover and its grace delay, Escape, click outside, touch, no JavaScript, on screen, current page), full-screen menu on phones, page behind inert and scroll-locked, keyboard (Tab, Escape), closing, reduced motion, no JavaScript, axe scans |
| `hero.mjs` | Hero: layout unchanged on every background and theme, photos fill and stay on screen, worst-case text contrast over photos, axe, alt text, buttons, lazy loading |
| `card-grid.mjs` | Card Grid: columns at each screen size (one on phones, the editor's choice when there's room), cards keep their size and position on every background and theme, Panel and Plain line up exactly, Last card (Fill the row stretches only when the row has space; Column width never does; images stay one height), panels stay on screen and never touch, 3:2 images, card text contrast (every background × theme, against the card fill), one link per card named by its heading, the whole card clickable, hover, keyboard focus round the card, heading levels, reduced motion, no JavaScript, axe |
| `stats.mjs` | Stats: figures per row at each screen size (2, 3, 2×2 or 4, only when a whole row fits; stacked otherwise), rules only between rows and between figures in a row, header / figures / buttons order, long figures fit, alignment, size and position unchanged on every background and theme, figures in the chosen colour role, text and figure contrast (every background × theme), list structure read figure first, h2 headings, no JavaScript, axe on white and black |
| `buttons.mjs` | Buttons: layout unchanged on every background and theme, 44px targets, wrapping, text and border contrast at rest and on hover (every background × theme), automatic arrows, new tabs, keyboard order and focus, reduced motion, no JavaScript, axe |
| `footer.mjs` | Footer, on its preview page: stacked on phones (two columns side by side), brand area beside all columns on wide screens, size and position unchanged on every background and theme, 44px links, text/link contrast (4.5:1) and icon contrast (3:1) on every background × theme, the dark-background logo, landmarks and names, `#` headings as text, current page, new tabs, site links, the © line, keyboard focus, no JavaScript, axe on white and black. When the built footer is the **Single line** layout it checks that instead (lines up with the navigation, only the line, contrast, axe): seed with `-e FOOTER_LAYOUT=line` after `run --rm -T`, rebuild, run `npm run footer`, then re-seed without it |
| `theme-contrast.mjs` | Every theme × background × colour role (text, muted, link and link hover, button at rest and on hover, brand text, card, photo) is at least 4.5:1 |
| `playground.mjs` | The Settings controls on each component's page: one copy per combination of the component's own settings, exactly one showing; every choice of every setting shows the matching copy and each looks different; Keep in view and the shared Settings tab change the shown copy; a setting that depends on another shows only with it; Settings in a column on the right at 1440px (clear of the component, staying in view as the page scrolls), above it at 1024px; the View switch; no sideways scrolling on phones; axe |
| `rhythm.mjs` | Vertical rhythm: every line of text (headings, paragraphs, list items, quotes) is a whole number of quarter lines of `--line` on phone and desktop, heading line-heights stay between 1 and 1.35, editor text is 1 line apart (1.5 above a subheading, 0.5 below it), the page height is unchanged across page backgrounds |
| `tokens.mjs` | The Tokens page (`/components/tokens/`): every palette, spacing, type, width and radius token declared on `:root` is listed, every value (hex, contrast, px) is filled in and matches what's drawn, five backgrounds with ten roles each, every text colour passes its contrast minimum in every theme, values follow the theme switch, no sideways scrolling at 320px, axe on white and black, linked from the overview |

Each prints `PASS`/`FAIL` lines; screenshots go to `tests/shots/` (not committed). Add a script for
each new component (see the `/add-component` skill), reusing these as templates. The shared set-up
is in `lib.mjs`: the browser, `check()`/`info()`, `newPage()` (records page errors and gives the page
`contrastRatio(a, b)`), `pick()` to switch a preview page's background or theme (its `window.preview`), `axeCheck()`, `BACKGROUNDS`/`THEMES`, and
`finish()` to print the results. Add a script to `package.json`'s `all` too.
