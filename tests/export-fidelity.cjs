const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    await p.goto("http://127.0.0.1:4173");
    const dims = await p.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = 200;
      c.getContext("2d").fillRect(0, 0, 200, 200);
      const data = c.toDataURL();
      const h = new PDFHandler();
      const bytes = await h.exportSignedPDF(
        [
          {
            page: 1,
            type: "signature",
            content: data,
            x: 0.1,
            y: 0.2,
            width: 0.4,
            height: 0.2,
          },
        ],
        { pagesImages: [data] },
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await doc.getPage(1);
      const ops = await page.getOperatorList();
      return ops.fnArray
        .map((fn, i) =>
          fn === pdfjsLib.OPS.transform ? ops.argsArray[i] : null,
        )
        .filter((a) => a && a[0] > 1 && a[3] > 1)
        .at(-1);
    });
    assert.equal(
      dims[0],
      dims[3],
      "export must preserve square signature aspect like preview",
    );
    console.log("PASS: exported image aspect matches object-contain preview");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
