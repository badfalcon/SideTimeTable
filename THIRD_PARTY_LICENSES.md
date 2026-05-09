# Third-Party Licenses

SideTimeTable is distributed under the Apache License 2.0 (see `LICENSE`).
It bundles or references the following third-party software. Each library is the property of its respective copyright holders and is used under the terms of its own license, summarized below.

---

## Bootstrap 5.3.0

- Source: https://github.com/twbs/bootstrap
- Copyright (c) 2011-2023 The Bootstrap Authors
- License: MIT
- Distribution: vendored at `src/vendor/bootstrap.min.css` and `src/vendor/bootstrap.min.js`

```
The MIT License (MIT)

Copyright (c) 2011-2023 The Bootstrap Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

Full text: https://github.com/twbs/bootstrap/blob/main/LICENSE

---

## Popper.js (@popperjs/core 2.11.8)

- Source: https://github.com/popperjs/popper-core
- Copyright (c) 2019 Federico Zivolo and contributors
- License: MIT
- Distribution: vendored at `src/vendor/popper.min.js`

Full text: https://github.com/popperjs/popper-core/blob/master/LICENSE.md

---

## Font Awesome Free 6.7.1

- Source: https://fontawesome.com
- Copyright (c) Fonticons, Inc.
- Licenses:
  - Icons: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
  - Fonts: SIL OFL 1.1 (https://scripts.sil.org/OFL)
  - Code: MIT
- Distribution: loaded via CDN (`https://use.fontawesome.com/releases/v6.7.1/css/all.css`)

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
