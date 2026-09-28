const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:4173");
    await p.locator("#nav-mode-doc").click();
    await p.locator("#file-upload-input").setInputFiles({
      name: "invalid.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a PNG"),
    });
    await p.waitForSelector("#doc-workspace:not(.hidden)");
    await p.waitForTimeout(200);
    p.once("dialog", (dialog) => dialog.accept());
    await p.locator("#clear-all-doc-btn").click();
    await p.locator(".template-card-btn").click();
    await p.waitForFunction(() => {
      const canvas = document.querySelector("#doc-canvas");
      if (canvas.width <= 300 || canvas.height <= 150) return false;
      const pixels = canvas.getContext("2d").getImageData(
        0, 0, canvas.width, canvas.height,
      ).data;
      return pixels.some((value, i) => i % 4 === 0 && value < 240 && pixels[i + 3] > 0);
    }, null, { timeout: 5000 });
    console.log("PASS: invalid PNG then sample PDF renders actual canvas content");

    await p.goto("http://127.0.0.1:4173");
    await p.locator("#nav-mode-doc").click();
    await p
      .locator("#file-upload-input")
      .setInputFiles("/tmp/e-signature-qa/artifacts/source.pdf");
    await p.waitForSelector("#doc-workspace:not(.hidden)");
    await p.waitForFunction(() => document.querySelector("#doc-canvas").width > 300);
    const initialWidth = await p.locator("#doc-canvas").evaluate((canvas) => canvas.width);
    await p.evaluate(() => {
      window.renderFailures = [];
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node.nodeType === 1 && node.matches(".toast.error"))
              window.renderFailures.push(node.textContent);
      }).observe(document.querySelector("#toast-container"), { childList: true });
      for (let i = 0; i < 5; i++)
        document.querySelector("#zoom-in-btn").click();
    });
    await p.waitForFunction((width) => {
      const canvas = document.querySelector("#doc-canvas");
      if (canvas.width <= width) return false;
      const pixels = canvas.getContext("2d").getImageData(
        0, 0, canvas.width, canvas.height,
      ).data;
      // The source PDF fixture has blank pages: rendered pixels are opaque white.
      return pixels.some((value, i) => i % 4 === 3 && value === 255);
    }, initialWidth);
    await p.waitForTimeout(1200);
    assert.deepEqual(await p.evaluate(() => window.renderFailures), [],
      "rapid zoom must not show failure toasts");
    assert.deepEqual(
      errors,
      [],
      "rapid zoom must not concurrently render the same canvas",
    );
    console.log("PASS: rapid zoom rendering");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
