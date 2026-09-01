# Blue Night Toolkit

Optional companion userscript for the Blue Night theme. The stylesheet works on its own —
this only adds the things CSS cannot do by itself.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or Greasemonkey.
2. Open [`ggn-blue-night.user.js`](https://raw.githubusercontent.com/nowtl/ggn-blue-night/main/toolkit/ggn-blue-night.user.js)
   and confirm the install prompt.
3. Reload GazelleGames. A small button appears in the bottom-right corner.

The script updates itself through Tampermonkey. The stylesheet is installed separately, as before.

## How it works

The script never contains visual rules. It writes one attribute per setting onto `<html>`:

```
<html data-ggn-toolkit="1" data-ggn-mode="light" data-ggn-theme="nocturne">
```

`blue-night_regular.css` §10 carries the matching rules. Without the script no attribute is
written, nothing matches, and the theme renders exactly as it does today.

Settings live in `localStorage` under `ggn-blue-night` and are applied at `document-start`,
before the first paint.

## The two axes

**Mode** — `data-ggn-mode` is `light`, or absent for dark. `system` is stored as the user's
preference but never written as-is: the script resolves it against `prefers-color-scheme` and
writes the concrete value, then re-resolves when the OS flips. That keeps the CSS free of media
queries and, more importantly, keeps dark the default for anyone without the script.

**Theme** — `data-ggn-theme` picks the character: surfaces, accent and control colour. Blue Night
is the default and writes no attribute. Every theme defines both a dark and a light set.

## Adding a theme

1. Add two blocks to §10. The dark one doubles as the panel's colour preview:

   ```css
   :root[data-ggn-theme="moss"],
   [data-ggn-swatch="moss"] {
     --surface-2: #121a14;
     --fg-accent: #5c9e63;
     --control: #46614a;
     --blur-bg: var(--surface-3);
     --blur-bg-strong: var(--surface-3);
   }

   :root[data-ggn-mode="light"][data-ggn-theme="moss"],
   :root[data-ggn-mode="light"] [data-ggn-swatch="moss"] {
     --surface-2: #eaf0ea;
   }
   ```

2. Add the name to the discovery token so the panel finds it:

   ```css
   :root {
     --ggn-themes: "abyss, oled, graphite, ember, nocturne, moss";
   }
   ```

3. Add the label to `features.json`:

   ```json
   { "value": "moss", "label": "Moss", "help": "Muted greens." }
   ```

`features.json` is fetched from GitHub Pages and cached in `localStorage`, so the panel picks up
new options without anyone reinstalling the script.

### Feature schema

| field          | applies to | meaning                                                       |
| -------------- | ---------- | ------------------------------------------------------------- |
| `id`           | all        | Becomes `data-ggn-<id>`                                        |
| `type`         | all        | `select` or `toggle`                                           |
| `group`        | all        | Section heading in the panel                                   |
| `label`        | all        | Row label                                                      |
| `from`         | select     | Custom property listing the available values                   |
| `defaultLabel` | select     | Label for the untouched theme default                          |
| `preview`      | select     | `"ramp"` reads the swatch probe and shows five colour chips    |
| `options`      | select     | `value`, `label`, optional `swatch` and `help`                  |

A `select` whose `from` token is empty is hidden, so a feature can ship in the manifest before
the CSS side exists.

## Adding a logo

Drop the file in the repo root, then three small edits:

```css
:root {
  --ggn-logos: "retro, minimal";
}

:root[data-ggn-logo="retro"] #logo {
  background-image: url("logo-retro.png");
}
```

The base `#logo` rule lives inside `@layer ggn`, so an unlayered rule like the one above wins
without needing `!important`. Then add the label to `features.json`:

```json
{ "value": "retro", "label": "Retro" }
```

### The built-in wordmark

`Header logo -> Wordmark` swaps the image for CSS text. The gradient is derived from
`--fg-accent` by rotating its hue with `oklch(from ...)`, so each theme gets its own sweep
without a per-theme rule. The face is Bebas Neue, subset to the seven glyphs the name needs
and embedded as a data URI, so nothing is fetched at runtime and CSS-only users pay nothing.

Game themes still have to win. The script reads the computed `background-image` of `#logo`:
anything other than `gazellegames-logo.png` means `gamethemes.css` has taken over, and it sets
`data-ggn-gamelogo="1"` on `<html>`. Every wordmark rule is gated on `:not([data-ggn-gamelogo])`,
so the game logo renders through the normal `background-image: inherit` chain. The check re-runs
on `load` and whenever the 1150px breakpoint that gates `gamethemes.css` flips.

## Tokens worth knowing

| token                             | role                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `--surface-0` … `--surface-9`     | Backgrounds, deepest to most raised. `--surface-9` is used mostly as a border. |
| `--line-1` … `--line-4`           | Borders. `--line-4` is used as a fill, not a border.      |
| `--ink-0` … `--ink-8`             | Text, brightest to faintest.                              |
| `--on-fill`                       | Text sitting on a coloured or solid fill. Stays white in every theme. |
| `--control`                       | Button surface.                                           |
| `--fg-accent`, `--fg-accent-soft` | Links, focus, selection.                                  |
| `--fg-good` `--fg-bad` `--fg-warn` `--fg-orange` `--fg-bad-soft` | Semantic text and icon colours. |
| `--blur-bg`, `--blur-bg-strong`   | Backdrop-filtered surfaces (`#menu`, `#userinfo`, popups). Translucent on Blue Night, solid `--surface-3` elsewhere. |

## Known trade-off

`blue-night_oled.css` still carries its own copy of the OLED values so that people using that
file without the script keep working. Once the toolkit is in use, that file can be retired and
the duplication goes away.

## Local testing

`harness.html` is a standalone component gallery that loads the stylesheet and the script without
the live site, so themes can be judged while iterating. Serve the repo root over HTTP and open
`/toolkit/harness.html` — `file://` will not work, the script needs a real origin for
`localStorage`. It stubs `fetch` so the manifest comes from the local copy rather than Pages.
