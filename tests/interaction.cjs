const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { PDFDocument } = require("pdf-lib");
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:4173");
    await p.locator("#tab-type").click();
    await p.locator("#hero-use-on-doc-btn").click();
    assert.ok(
      await p.locator("#view-quick-signature").isVisible(),
      "blank signature must not hand off to document",
    );
    await p.locator("#hero-type-input").fill("Jordan Lee");
    await p.locator("#hero-use-on-doc-btn").click();
    await p.locator(".template-card-btn").click();
    await p.waitForSelector(".placed-element");
    const field = p.locator(".placed-element");
    await field.focus();
    const initial = await field.boundingBox();
    await field.press("ArrowRight");
    assert.ok((await field.boundingBox()).x > initial.x);
    await field.press("Shift+ArrowRight");
    assert.ok((await field.boundingBox()).width > initial.width);
    await field.locator(".duplicate-btn").click();
    assert.equal(await p.locator(".placed-element").count(), 2);
    await p.locator(".placed-element.selected .delete-btn").click();
    assert.equal(await p.locator(".placed-element").count(), 1);
    await p.locator("#export-modal-trigger").click();
    await p.keyboard.press("Escape");
    assert.equal(
      await p.locator("#export-modal").evaluate((e) => e.open),
      false,
    );
    await p.locator("#export-modal-trigger").click();
    const dl = p.waitForEvent("download");
    await p.locator("#download-signed-pdf-btn").click();
    await (await dl).saveAs("/tmp/e-signature-qa/artifacts/sample-signed.pdf");
    assert.equal(
      (
        await PDFDocument.load(
          await fs.readFile("/tmp/e-signature-qa/artifacts/sample-signed.pdf"),
        )
      ).getPageCount(),
      1,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: empty handoff guard, sample creation/export, keyboard move/resize, duplicate/delete, Escape dialog",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
