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
<html data-ggn-toolkit="1" data-ggn-palette="oled">
```

`blue-night_regular.css` §10 carries the matching rules. Without the script no attribute is
written, nothing matches, and the theme renders exactly as it does today.

Settings live in `localStorage` under `ggn-blue-night` and are applied at `document-start`,
before the first paint.

## Adding an option

No script changes needed.

1. Add the rules to `blue-night_regular.css` §10, keyed off `[data-ggn-<id>]`.
2. For a list-style option, add the value to the matching `--ggn-*` token so the panel can
   discover it:

   ```css
   :root {
     --ggn-palettes: "abyss, oled, graphite";
   }

   :root[data-ggn-palette="abyss"] {
     --surface-2: #0f1119;
   }
   ```

3. Describe it in `features.json`:

   ```json
   { "value": "abyss", "label": "Abyss", "swatch": "#0f1119", "help": "Same blue, sunk deeper." }
   ```

`features.json` is fetched from GitHub Pages and cached in `localStorage`, so the panel picks
up new options without anyone reinstalling the script.

### Feature schema

| field          | applies to | meaning                                                      |
| -------------- | ---------- | ------------------------------------------------------------ |
| `id`           | all        | Becomes `data-ggn-<id>`                                       |
| `type`         | all        | `select` or `toggle`                                          |
| `group`        | all        | Section heading in the panel                                  |
| `label`        | all        | Row label                                                     |
| `from`         | select     | Custom property listing the available values                  |
| `defaultLabel` | select     | Label for the untouched theme default                         |
| `options`      | select     | `value`, `label`, optional `swatch` and `help`                 |

A `select` whose `from` token is empty is hidden, so a feature can ship in the manifest before
the CSS side exists.

## Known trade-off

`blue-night_oled.css` still carries its own copy of the OLED values so that people using that
file without the script keep working. Once the toolkit is in use, that file can be retired and
the duplication goes away.

## Local testing

`harness.html` is a standalone page that loads the stylesheet and the script without the live
site, so the panel can be driven while iterating. Serve the repo root over HTTP and open
`/toolkit/harness.html` — `file://` will not work, the script needs a real origin for
`localStorage`.
