# Third-Party Licenses

SideTimeTable is distributed under the Apache License 2.0 (see `LICENSE`).
It bundles the following third-party software. Each library is the property of its respective copyright holders and is used under the terms of its own license, summarized below.

---

## Font Awesome Free 6.7.1

- Source: https://fontawesome.com
- Copyright (c) Fonticons, Inc.
- Licenses:
  - Icons: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
  - Fonts: SIL OFL 1.1 (https://scripts.sil.org/OFL)
  - Code: MIT
- Distribution: vendored at `src/vendor/fontawesome/` from the `@fortawesome/fontawesome-free` package by `scripts/build-icons.js`: `fontawesome.css` (trimmed to the icons the extension uses) and the unmodified `webfonts/*.woff2`, with the package's `LICENSE.txt` alongside

Attribution: Icons by Font Awesome — https://fontawesome.com

Full text: https://fontawesome.com/license/free

---

## marked

- Source: https://github.com/markedjs/marked
- Copyright (c) 2018+, MarkedJS (https://github.com/markedjs/)
- Copyright (c) 2011-2018, Christopher Jeffrey (https://github.com/chjj/)
- License: MIT
- Distribution: bundled by webpack (used in `src/side_panel/components/memo/memo-editor.js`)

Full text: https://github.com/markedjs/marked/blob/master/LICENSE.md

---

## DOMPurify

- Source: https://github.com/cure53/DOMPurify
- Copyright (c) Mario Heiderich and DOMPurify contributors
- License: Apache License 2.0 OR Mozilla Public License 2.0 (dual-licensed; this project uses it under Apache-2.0)
- Distribution: bundled by webpack (used in `src/side_panel/components/memo/memo-editor.js`)

Full text: https://github.com/cure53/DOMPurify/blob/main/LICENSE
