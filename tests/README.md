# Browser checks

The app remains a static site; there is no build step. Tests use Playwright and pdf-lib as external QA dependencies.

```sh
# From the project root, in a separate terminal:
python3 -m http.server 4173 --bind 127.0.0.1

# Install QA tools outside the project:
npm install --prefix /tmp/e-signature-qa playwright pdf-lib
/tmp/e-signature-qa/node_modules/.bin/playwright install chromium

# Run in this order (workflows creates fixtures used by later tests):
export NODE_PATH=/tmp/e-signature-qa/node_modules
node tests/redesign.cjs
node tests/workflows.cjs
node tests/regressions.cjs
node tests/interaction.cjs
node tests/export-fidelity.cjs
node tests/rendering.cjs
```

Artifacts are written to `/tmp/e-signature-qa/artifacts`: desktop/mobile screenshots, actual signature PNG downloads, source and exported PDFs, and an image-document export. Tests run in isolated browser contexts and do not use your saved signatures.

Covered: responsive layout; accessible tabs; draw/undo; type; transparent image upload; save/select; blank-signature validation; native download dialog/Escape; real PNG downloads; two-page PDF import, placement and drag, pagination, date, actual PDF export; sample creation; keyboard move/resize; duplicate/delete; PDF-to-JPEG replacement; image aspect ratio in the exported PDF; rapid zoom rendering.

Limits: verified in desktop Chromium and a 390px responsive viewport, not physical touch/stylus hardware or Safari/Firefox. Clipboard image permissions are browser-dependent. Password-protected PDFs, rotated/cropped PDF pages, and non-Latin custom PDF text are not covered. Google Fonts and PDF libraries still need network access. Exports add visible signatures; they do not cryptographically sign, certify identity, or prevent later document modification.
