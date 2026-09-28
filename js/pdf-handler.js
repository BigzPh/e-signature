/**
 * PDF Processing & Export Engine
 * Handles rendering PDF pages via PDF.js, embedding signatures & stamps
 * directly into PDF pages using PDF-Lib.
 */

class PDFHandler {
  constructor() {
    this.pdfDoc = null;
    this.pdfBytes = null;
    this.numPages = 0;
  }

  /**
   * Load PDF from ArrayBuffer
   */
  async loadFromBuffer(arrayBuffer) {
    // PDF.js transfers its buffer to a worker. Keep an independent export copy.
    this.pdfBytes = arrayBuffer.slice(0);
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const loadingTask = window.pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
      });
      this.pdfDoc = await loadingTask.promise;
      this.numPages = this.pdfDoc.numPages;
      return { numPages: this.numPages };
    } else {
      throw new Error("PDF.js library is not loaded");
    }
  }

  /**
   * Render a specific page to a canvas
   */
  async renderPageToCanvas(pageNumber, canvas, scale = 1.5) {
    if (!this.pdfDoc) throw new Error("No PDF document loaded");

    const page = await this.pdfDoc.getPage(pageNumber);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const ctx = canvas.getContext("2d");
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    return {
      width: viewport.width / dpr,
      height: viewport.height / dpr,
      scale: scale,
      viewport,
    };
  }

  /**
   * Bake placed elements into a PDF using PDF-Lib
   */
  async exportSignedPDF(placedElements, options = {}) {
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib || {};
    if (!PDFDocument) {
      throw new Error(
        "PDF-Lib is not available. Falling back to image export.",
      );
    }

    let pdfDoc;
    if (this.pdfBytes) {
      pdfDoc = await PDFDocument.load(this.pdfBytes);
    } else if (options.pagesImages && options.pagesImages.length > 0) {
      // Create PDF from images (templates or uploaded images)
      pdfDoc = await PDFDocument.create();
      for (const imgUrl of options.pagesImages) {
        const imgBytes = await fetch(imgUrl).then((res) => res.arrayBuffer());
        let pngImage;
        if (imgUrl.startsWith("data:image/jpeg")) {
          pngImage = await pdfDoc.embedJpg(imgBytes);
        } else if (imgUrl.startsWith("data:image/png")) {
          pngImage = await pdfDoc.embedPng(imgBytes);
        } else {
          const image = new Image();
          image.src = imgUrl;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext("2d").drawImage(image, 0, 0);
          pngImage = await pdfDoc.embedPng(canvas.toDataURL("image/png"));
        }
        const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pngImage.width,
          height: pngImage.height,
        });
      }
    } else {
      throw new Error("No document data available to export");
    }

    const pages = pdfDoc.getPages();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Group elements by page (1-indexed)
    const elementsByPage = {};
    placedElements.forEach((el) => {
      const p = el.page || 1;
      if (!elementsByPage[p]) elementsByPage[p] = [];
      elementsByPage[p].push(el);
    });

    for (let pageNum = 1; pageNum <= pages.length; pageNum++) {
      const page = pages[pageNum - 1];
      const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
      const pageElements = elementsByPage[pageNum] || [];

      // Render items on this page
      for (const el of pageElements) {
        // el coordinates are normalized (0 to 1) relative to container width and height
        const normX = el.x;
        const normY = el.y;
        const normW = el.width;
        const normH = el.height;

        const x = normX * pdfPageWidth;
        const w = normW * pdfPageWidth;
        const h = normH * pdfPageHeight;
        // In PDF coordinates, y=0 is at the bottom of the page
        const y = pdfPageHeight - (normY * pdfPageHeight + h);

        if (
          el.type === "signature" ||
          el.type === "initials" ||
          el.type === "image" ||
          el.type === "seal"
        ) {
          if (el.content && el.content.startsWith("data:image")) {
            const imgData = await fetch(el.content).then((r) =>
              r.arrayBuffer(),
            );
            const embeddedImg = await pdfDoc.embedPng(imgData);
            const scale = Math.min(
              w / embeddedImg.width,
              h / embeddedImg.height,
            );
            const imageWidth = embeddedImg.width * scale;
            const imageHeight = embeddedImg.height * scale;
            page.drawImage(embeddedImg, {
              x: x + (w - imageWidth) / 2,
              y: y + (h - imageHeight) / 2,
              width: imageWidth,
              height: imageHeight,
            });
          }
        } else if (
          el.type === "text" ||
          el.type === "name" ||
          el.type === "date"
        ) {
          const fontSize = Math.max(10, Math.min(32, Math.round(h * 0.7)));
          const font = el.isBold ? helveticaBold : helvetica;
          const text = el.content || "";

          // Text color
          let textColor = rgb(0.1, 0.1, 0.1);
          if (el.color === "#1e3a8a") textColor = rgb(0.12, 0.23, 0.54);
          else if (el.color === "#991b1b") textColor = rgb(0.6, 0.1, 0.1);
          else if (el.color === "#166534") textColor = rgb(0.08, 0.4, 0.2);

          page.drawText(text, {
            x: x + 4,
            y: y + (h - fontSize) / 2,
            size: fontSize,
            font: font,
            color: textColor,
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
}

window.PDFHandler = PDFHandler;
