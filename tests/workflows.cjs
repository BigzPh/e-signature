const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const fs = require("node:fs/promises");
const assert = require("node:assert/strict");
const output = process.env.QA_OUTPUT || "/tmp/e-signature-qa/artifacts";
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") console.error("Browser:", m.text());
    });
    await page.goto("http://127.0.0.1:4173");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: output + "/desktop.png", fullPage: true });
    await page.locator("#tab-type").click();
    await page.locator("#hero-type-input").fill("Jamie Rivera");
    await page.locator("#hero-save-btn").click();
    await page.locator("#tab-saved").click();
    assert.equal(
      await page.locator(".saved-select").count(),
      1,
      "saved signatures must be keyboard-accessible buttons",
    );
    await page.locator(".saved-select").click();
    const pngDownload = page.waitForEvent("download");
    await page.locator("#hero-download-png-btn").click();
    const png = await pngDownload;
    await png.saveAs(output + "/signature.png");
    assert.equal(
      (await fs.readFile(output + "/signature.png")).subarray(1, 4).toString(),
      "PNG",
    );
    await page.locator("#hero-use-on-doc-btn").click();
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    source.addPage([612, 792]);
    await fs.writeFile(output + "/source.pdf", await source.save());
    await page
      .locator("#file-upload-input")
      .setInputFiles(output + "/source.pdf");
    await page.waitForSelector(".placed-element");
    const element = page.locator(".placed-element").first();
    const before = await element.boundingBox();
    await page.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      before.x + before.width / 2 + 65,
      before.y + before.height / 2 + 40,
      { steps: 8 },
    );
    await page.mouse.up();
    const after = await element.boundingBox();
    assert.ok(after.x > before.x + 40, "drag must move attached element");
    await page.locator("#export-modal-trigger").click();
    assert.ok(await page.locator("#export-modal").evaluate((e) => e.open));
    const pdfDownload = page.waitForEvent("download");
    await page.locator("#download-signed-pdf-btn").click();
    const signed = await pdfDownload;
    await signed.saveAs(output + "/signed.pdf");
    const result = await PDFDocument.load(
      await fs.readFile(output + "/signed.pdf"),
    );
    assert.equal(result.getPageCount(), 2);
    assert.ok(
      result.getPages()[0].node.Resources().toString().includes("/XObject"),
      "signature image embedded",
    );
    await page.waitForTimeout(3600);
    await page.screenshot({ path: output + "/document.png", fullPage: true });
    await page.locator("#next-page-btn").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#page-indicator").textContent === "Page 2 of 2",
    );
    await page.locator("#tool-date-btn").click();
    assert.equal(await page.locator(".placed-element").count(), 1);
    await page.locator("#nav-mode-quick").click();
    await page.locator("#tab-upload").click();
    await page
      .locator("#hero-upload-input")
      .setInputFiles(output + "/signature.png");
    await page.waitForFunction(
      () => !document.querySelector("#hero-upload-preview-img").hidden,
    );
    await page.locator("#tab-draw").click();
    await page.waitForTimeout(100);
    const c = await page.locator("#hero-signature-canvas").boundingBox();
    await page.mouse.move(c.x + 50, c.y + 80);
    await page.mouse.down();
    await page.mouse.move(c.x + 200, c.y + 130, { steps: 15 });
    await page.mouse.up();
    const draw = page.waitForEvent("download");
    await page.locator("#hero-download-png-btn").click();
    await (await draw).saveAs(output + "/drawn.png");
    await page.locator("#hero-undo-btn").click();
    await page.locator("#hero-download-png-btn").click();
    assert.ok(
      (await page.locator("#toast-container").innerText()).includes(
        "draw your signature first",
      ),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.waitForTimeout(3600);
    await page.screenshot({ path: output + "/mobile.png", fullPage: true });
    await page.locator("#nav-mode-doc").click();
    await page.locator("#zoom-fit-btn").click();
    await page.waitForTimeout(400);
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector("#doc-page-container").clientWidth <=
          document.querySelector("#doc-scroll-viewport").clientWidth,
      ),
    );
    await page.screenshot({
      path: output + "/mobile-document.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: type/save/select, actual PNG download, two-page PDF import/drag/export, pagination/date, upload, draw/undo, mobile fit, no page errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
