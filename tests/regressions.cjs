const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    await p.goto("http://127.0.0.1:4173");
    await p.locator("#hero-download-png-btn").click();
    await p.locator("#hero-download-png-btn").click();
    assert.equal(
      await p.locator(".toast").count(),
      1,
      "notifications must not stack across workspace",
    );
    const transparent = await p.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 100;
      c.height = 60;
      const ctx = c.getContext("2d");
      ctx.fillRect(35, 20, 30, 20);
      const img = new Image();
      img.src = c.toDataURL();
      await img.decode();
      const clean = new Image();
      clean.src = UploadSignatureProcessor.processImage(img);
      await clean.decode();
      c.width = clean.width;
      c.height = clean.height;
      ctx.drawImage(clean, 0, 0);
      return ctx.getImageData(0, 0, 1, 1).data[3];
    });
    assert.equal(
      transparent,
      0,
      "uploaded transparent pixels stay transparent",
    );
    await p.locator("#nav-mode-doc").click();
    await p
      .locator("#file-upload-input")
      .setInputFiles("/tmp/e-signature-qa/artifacts/source.pdf");
    await p.waitForSelector("#doc-workspace:not(.hidden)");
    await p.waitForTimeout(200);
    const jpeg = await p.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 160;
      const x = c.getContext("2d");
      x.fillStyle = "white";
      x.fillRect(0, 0, 320, 160);
      x.fillStyle = "black";
      x.fillText("IMAGE DOCUMENT", 20, 30);
      return c.toDataURL("image/jpeg").split(",")[1];
    });
    await fs.writeFile(
      "/tmp/e-signature-qa/artifacts/photo.jpg",
      Buffer.from(jpeg, "base64"),
    );
    await p
      .locator("#file-upload-input")
      .setInputFiles("/tmp/e-signature-qa/artifacts/photo.jpg");
    await p.waitForFunction(
      () =>
        document.querySelector("#page-indicator").textContent === "Page 1 of 1",
    );
    await p.waitForTimeout(200);
    await p.locator("#export-modal-trigger").click();
    const dl = p.waitForEvent("download");
    await p.locator("#download-signed-pdf-btn").click();
    await (await dl).saveAs("/tmp/e-signature-qa/artifacts/image.pdf");
    const imagePDF = await PDFDocument.load(
      await fs.readFile("/tmp/e-signature-qa/artifacts/image.pdf"),
    );
    assert.equal(
      imagePDF.getPageCount(),
      1,
      "replacing PDF with image must not export previous PDF",
    );
    assert.equal(imagePDF.getPages()[0].getWidth(), 320);
    console.log(
      "PASS: notification limit, transparent upload, PDF-to-JPEG replacement/export",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
