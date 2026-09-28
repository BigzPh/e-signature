const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page.waitForFunction(() => window.SignaturePadEngine);
  assert.equal(await page.title(), "Kakaw — Signature");
  assert.equal(
    await page.getByRole("tab", { name: "Draw", exact: true }).count(),
    1,
  );
  assert.equal(
    await page
      .locator("body")
      .innerText()
      .then((t) => /Signiture|Tamper-Evident|AI algorithm|Highlight/.test(t)),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await browser.close();
  console.log("PASS: restrained accessible responsive workspace");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
