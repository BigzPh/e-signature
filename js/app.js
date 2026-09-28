/**
 * Main application logic for Kakaw Signature
 * Spotlights the Quick Signature Studio as the primary centerpiece,
 * with full seamless transition into the Document Signer.
 */

document.addEventListener("DOMContentLoaded", () => {
  // App State
  const state = {
    activeAppMode: "quick", // 'quick' | 'doc'
    activeQuickTab: "draw", // 'draw' | 'type' | 'upload' | 'saved'
    currentDoc: null, // { type: 'pdf'|'image'|'template', name, numPages, pagesImages: [], rawBytes }
    currentPage: 1,
    zoom: 1.0,
    placedElements: [], // Array of { id, page, type, x, y, width, height, content, color, isBold }
    selectedElementId: null,
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    elementStart: { x: 0, y: 0, w: 0, h: 0 },
    userName: localStorage.getItem("e_sig_user_name") || "",
    userInitials: localStorage.getItem("e_sig_user_initials") || "",
    signatureColor: "#0f2b48",
    strokeWidth: 2.6,
    activeFont: "Caveat",
    activeSignatureDataUrl: null,
  };

  // Instances
  let pdfHandler = new PDFHandler();
  let heroSigPad = null;

  // DOM Elements - Views & Navigation
  const viewQuickSig = document.getElementById("view-quick-signature");
  const viewDocSigner = document.getElementById("view-doc-signer");
  const navModeQuick = document.getElementById("nav-mode-quick");
  const navModeDoc = document.getElementById("nav-mode-doc");
  const docHeaderActions = document.getElementById("doc-header-actions");
  const brandLogoBtn = document.getElementById("brand-logo-btn");
  const backToQuickSigBtn = document.getElementById("back-to-quick-sig-btn");
  const heroOpenDocBtn = document.getElementById("hero-open-doc-btn");
  const toastContainer = document.getElementById("toast-container");

  // DOM Elements - Quick Signature Studio
  const heroCanvas = document.getElementById("hero-signature-canvas");
  const quickTabs = document.querySelectorAll(".quick-tab-btn");
  const quickColorBtns = document.querySelectorAll(".quick-color-btn");
  const heroPenWidthSelect = document.getElementById("hero-pen-width-select");
  const heroEraserBtn = document.getElementById("hero-eraser-btn");
  const heroUndoBtn = document.getElementById("hero-undo-btn");
  const heroClearBtn = document.getElementById("hero-clear-btn");

  const heroTypeInput = document.getElementById("hero-type-input");
  const fontCardBtns = document.querySelectorAll(".font-card-btn");
  const heroTypePreviewImg = document.getElementById("hero-type-preview-img");

  const heroUploadInput = document.getElementById("hero-upload-input");
  const heroUploadSlider = document.getElementById("hero-upload-slider");
  const thresholdValText = document.getElementById("threshold-val-text");
  const heroUploadPreviewImg = document.getElementById(
    "hero-upload-preview-img",
  );
  let rawUploadedImage = null;

  const heroDownloadPngBtn = document.getElementById("hero-download-png-btn");
  const heroCopyBtn = document.getElementById("hero-copy-btn");
  const heroSaveBtn = document.getElementById("hero-save-btn");
  const heroUseOnDocBtn = document.getElementById("hero-use-on-doc-btn");
  const heroSavedList = document.getElementById("hero-saved-list");

  // DOM Elements - Document Stage
  const emptyState = document.getElementById("empty-state");
  const docWorkspace = document.getElementById("doc-workspace");
  const docPageContainer = document.getElementById("doc-page-container");
  const docCanvas = document.getElementById("doc-canvas");
  const overlayLayer = document.getElementById("overlay-layer");
  const fileInput = document.getElementById("file-upload-input");
  const dropZone = document.getElementById("drop-zone");

  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageIndicator = document.getElementById("page-indicator");
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomFitBtn = document.getElementById("zoom-fit-btn");
  const zoomLevelText = document.getElementById("zoom-level-text");
  const pageThumbnailsList = document.getElementById("page-thumbnails");

  const exportModal = document.getElementById("export-modal");

  // Initialize Canvas
  if (heroCanvas) {
    heroSigPad = new SignaturePadEngine(heroCanvas, {
      color: state.signatureColor,
      strokeWidth: state.strokeWidth,
    });

    // Make canvas responsive on window resize
    window.addEventListener("resize", () => {
      if (state.activeAppMode === "quick" && state.activeQuickTab === "draw") {
        heroSigPad.resize();
      }
    });
  }

  // Helper: Toast Notifications
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast";

    toast.classList.toggle("error", type === "error");
    toast.textContent = message;
    toastContainer.replaceChildren(toast);

    setTimeout(() => {
      toast.style.animation = "slideOutDown 0.3s ease-in forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Mode Switcher: Quick Signature Studio vs Document Signer
  function switchAppMode(mode) {
    state.activeAppMode = mode;
    navModeQuick.setAttribute("aria-pressed", String(mode === "quick"));
    navModeDoc.setAttribute("aria-pressed", String(mode === "doc"));
    const viewQuick = document.getElementById("view-quick-signature");
    const viewDoc = document.getElementById("view-doc-signer");

    if (mode === "quick") {
      if (viewQuick) {
        viewQuick.classList.remove("hidden");
        viewQuick.style.setProperty("display", "flex", "important");
      }
      if (viewDoc) {
        viewDoc.classList.add("hidden");
        viewDoc.style.setProperty("display", "none", "important");
      }

      if (docHeaderActions) docHeaderActions.classList.add("hidden");
      if (heroSigPad && state.activeQuickTab === "draw") {
        setTimeout(() => heroSigPad.resize(), 50);
      }
    } else {
      if (viewQuick) {
        viewQuick.classList.add("hidden");
        viewQuick.style.setProperty("display", "none", "important");
      }
      if (viewDoc) {
        viewDoc.classList.remove("hidden");
        viewDoc.style.setProperty("display", "flex", "important");
      }

      if (state.currentDoc) {
        if (docHeaderActions) docHeaderActions.classList.remove("hidden");
      } else {
        if (emptyState) emptyState.classList.remove("hidden");
        if (docWorkspace) docWorkspace.classList.add("hidden");
      }
    }
  }

  navModeQuick?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAppMode("quick");
  });

  navModeDoc?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAppMode("doc");
  });

  brandLogoBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAppMode("quick");
  });

  backToQuickSigBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAppMode("quick");
  });

  /* ========================================================
     QUICK SIGNATURE STUDIO (HIGHLIGHT) ENGINE
     ======================================================== */

  // Switch Quick Studio Tabs (Draw / Type / Upload / Saved)
  quickTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      quickTabs.forEach((b) => {
        b.classList.remove(
          "border-indigo-600",
          "text-indigo-600",
          "font-bold",
          "active",
        );
        b.classList.add("border-transparent", "text-slate-500");
      });
      btn.classList.add(
        "border-indigo-600",
        "text-indigo-600",
        "font-bold",
        "active",
      );
      btn.classList.remove("border-transparent", "text-slate-500");

      quickTabs.forEach((b) => {
        b.setAttribute("aria-selected", String(b === btn));
        b.tabIndex = b === btn ? 0 : -1;
      });
      const targetTab = btn.dataset.quickTab;
      state.activeQuickTab = targetTab;

      document
        .querySelectorAll(".quick-tab-panel")
        .forEach((panel) => panel.classList.add("hidden"));
      document
        .getElementById(`quick-tab-${targetTab}`)
        .classList.remove("hidden");

      if (targetTab === "draw" && heroSigPad) {
        setTimeout(() => heroSigPad.resize(), 30);
      } else if (targetTab === "type") {
        updateHeroTypeSignatures();
      } else if (targetTab === "saved") {
        renderHeroSavedSignatures();
      }
    });
  });

  quickTabs.forEach((btn, index) =>
    btn.addEventListener("keydown", (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? quickTabs.length - 1
            : (index + (e.key === "ArrowRight" ? 1 : -1) + quickTabs.length) %
              quickTabs.length;
      quickTabs[next].click();
      quickTabs[next].focus();
    }),
  );

  // Ink Color Picker
  quickColorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      state.signatureColor = color;
      quickColorBtns.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn)),
      );
      isEraserActive = false;
      heroEraserBtn.setAttribute("aria-pressed", "false");
      if (heroSigPad) heroSigPad.setColor(color);
      quickColorBtns.forEach((b) =>
        b.classList.remove("ring-2", "ring-offset-2", "ring-indigo-500"),
      );
      btn.classList.add("ring-2", "ring-offset-2", "ring-indigo-500");
      updateHeroTypeSignatures();
    });
  });

  // Pen Width Selector
  heroPenWidthSelect?.addEventListener("change", (e) => {
    const val = parseFloat(e.target.value);
    state.strokeWidth = val;
    if (heroSigPad) heroSigPad.setStrokeWidth(val);
  });

  // Eraser Toggle
  let isEraserActive = false;
  heroEraserBtn?.addEventListener("click", () => {
    isEraserActive = !isEraserActive;
    heroEraserBtn.setAttribute("aria-pressed", String(isEraserActive));
    if (heroSigPad) heroSigPad.setEraser(isEraserActive);
    heroEraserBtn.classList.toggle("bg-amber-100", isEraserActive);
    heroEraserBtn.classList.toggle("text-amber-800", isEraserActive);
  });

  // Undo & Clear
  heroUndoBtn?.addEventListener("click", () => heroSigPad?.undo());
  heroClearBtn?.addEventListener("click", () => {
    heroSigPad?.clear();
    isEraserActive = false;
    heroSigPad?.setEraser(false);
    heroEraserBtn?.classList.remove("bg-amber-100", "text-amber-800");
  });

  // Type Cursive Font Selection & Generation
  function updateHeroTypeSignatures() {
    const text = heroTypeInput?.value.trim() || "";

    // Update live previews on all 6 font cards
    document.querySelectorAll(".preview-name").forEach((el) => {
      el.textContent = text;
      el.style.color = state.signatureColor;
    });

    const activeFont = state.activeFont || "Caveat";
    const dataUrl = TypeSignatureGenerator.generate({
      text,
      fontFamily: activeFont,
      color: state.signatureColor,
      fontSize: 60,
    });

    heroTypePreviewImg.hidden = !dataUrl;
    document.getElementById("type-placeholder").hidden = !!dataUrl;
    if (dataUrl) heroTypePreviewImg.src = dataUrl;
  }

  heroTypeInput?.addEventListener("input", updateHeroTypeSignatures);

  fontCardBtns.forEach((card) => {
    card.addEventListener("click", () => {
      fontCardBtns.forEach((c) => {
        c.classList.remove("border-indigo-600", "active");
        c.classList.add("border-slate-200");
        c.querySelector("span").className =
          "text-[10px] font-bold text-slate-400 uppercase";
      });
      card.classList.add("border-indigo-600", "active");
      card.classList.remove("border-slate-200");
      card.querySelector("span").className =
        "text-[10px] font-bold text-indigo-600 uppercase";

      fontCardBtns.forEach((c) =>
        c.setAttribute("aria-pressed", String(c === card)),
      );
      state.activeFont = card.dataset.font;
      updateHeroTypeSignatures();
    });
  });

  // Upload Paper Photo & Transparency Cleaner
  heroUploadInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        rawUploadedImage = img;
        processHeroUploadedImage();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  heroUploadSlider?.addEventListener("input", () => {
    thresholdValText.textContent = `Level ${heroUploadSlider.value}`;
    if (rawUploadedImage) processHeroUploadedImage();
  });

  function processHeroUploadedImage() {
    if (!rawUploadedImage || !heroUploadPreviewImg) return;
    const threshold = parseInt(heroUploadSlider.value, 10);
    const cleanedUrl = UploadSignatureProcessor.processImage(rawUploadedImage, {
      threshold,
      enhanceContrast: true,
    });
    heroUploadPreviewImg.src = cleanedUrl;
    heroUploadPreviewImg.hidden = false;
    document.getElementById("upload-placeholder").hidden = true;
  }

  // Get current active signature as transparent PNG
  function getActiveSignatureDataUrl() {
    if (state.activeQuickTab === "draw") {
      if (heroSigPad.isEmpty()) {
        showToast("Please draw your signature first", "error");
        return null;
      }
      return heroSigPad.toDataURL("image/png");
    } else if (state.activeQuickTab === "type") {
      const text = heroTypeInput?.value.trim();
      if (!text) {
        showToast("Enter your name first.", "error");
        return null;
      }
      return TypeSignatureGenerator.generate({
        text,
        fontFamily: state.activeFont || "Caveat",
        color: state.signatureColor,
        fontSize: 64,
      });
    } else if (state.activeQuickTab === "upload") {
      if (!heroUploadPreviewImg || !heroUploadPreviewImg.src) {
        showToast("Please upload a signature photo first", "error");
        return null;
      }
      return heroUploadPreviewImg.src;
    } else if (state.activeQuickTab === "saved") {
      if (!state.activeSignatureDataUrl)
        showToast("Select a saved signature first.", "error");
      return state.activeSignatureDataUrl;
    }
    return null;
  }

  // Hero Action: Download Transparent PNG
  heroDownloadPngBtn?.addEventListener("click", () => {
    const dataUrl = getActiveSignatureDataUrl();
    if (!dataUrl) return;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `signature-${Date.now()}.png`;
    a.click();
    showToast("Signature downloaded as transparent PNG!", "success");
  });

  // Hero Action: Copy to Clipboard
  heroCopyBtn?.addEventListener("click", async () => {
    const dataUrl = getActiveSignatureDataUrl();
    if (!dataUrl) return;

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast(
          "Copied transparent signature to clipboard! Ready to paste.",
          "success",
        );
      } else {
        showToast(
          "Clipboard image write not supported in this browser.",
          "error",
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Could not copy to clipboard: " + err.message, "error");
    }
  });

  // Hero Action: Save to Library
  heroSaveBtn?.addEventListener("click", () => {
    const dataUrl = getActiveSignatureDataUrl();
    if (!dataUrl) return;

    if (
      !SavedSignaturesManager.saveSignature(
        dataUrl,
        "signature",
        "My Signature",
      )
    ) {
      showToast(
        "Could not save. Browser storage may be full or unavailable.",
        "error",
      );
      return;
    }
    showToast("Signature saved to your browser library!", "success");
    renderHeroSavedSignatures();
  });

  // Hero Action: Sign a Document with This (Seamless Transition)
  heroUseOnDocBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const dataUrl = getActiveSignatureDataUrl();
    if (!dataUrl) return;
    state.activeSignatureDataUrl = dataUrl;

    switchAppMode("doc");

    if (dataUrl && state.currentDoc) {
      addElementToPage("signature", dataUrl);
      showToast("Placed signature onto document!", "success");
    } else if (dataUrl) {
      showToast(
        "Signature ready! Select or upload a document to stamp it.",
        "info",
      );
    } else {
      showToast("Document module opened. Choose or upload a document.", "info");
    }
  });

  // Render Saved Signatures Grid
  function renderHeroSavedSignatures() {
    if (!heroSavedList) return;
    const list = SavedSignaturesManager.getSignatures();
    heroSavedList.innerHTML = "";

    if (list.length === 0) {
      heroSavedList.innerHTML =
        '<p class="empty-library">No saved signatures yet.<br>Create one, then choose Save signature.</p>';
      return;
    }
    list.forEach((item) => {
      const card = document.createElement("div");
      card.className = "saved-card";
      card.classList.toggle(
        "selected",
        state.activeSignatureDataUrl === item.dataUrl,
      );
      const select = document.createElement("button");
      select.className = "saved-select";
      select.setAttribute(
        "aria-pressed",
        String(state.activeSignatureDataUrl === item.dataUrl),
      );
      const img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = "Saved signature";
      const label = document.createElement("span");
      label.textContent =
        "Use signature · " + new Date(item.createdAt).toLocaleDateString();
      select.append(img, label);
      select.addEventListener("click", () => {
        state.activeSignatureDataUrl = item.dataUrl;
        renderHeroSavedSignatures();
        showToast("Signature selected.", "success");
      });
      const remove = document.createElement("button");
      remove.className = "delete-saved-btn";
      remove.textContent = "Delete signature";
      remove.addEventListener("click", () => {
        if (!SavedSignaturesManager.deleteSignature(item.id)) {
          showToast("Could not delete this signature.", "error");
          return;
        }
        if (state.activeSignatureDataUrl === item.dataUrl)
          state.activeSignatureDataUrl = null;
        renderHeroSavedSignatures();
      });
      card.append(select, remove);
      heroSavedList.appendChild(card);
    });
  }

  /* ========================================================
     DOCUMENT SIGNER WORKSPACE & PDF ENGINE
     ======================================================== */

  async function handleFileUpload(file) {
    if (!file) return;

    showToast(`Loading "${file.name}"...`, "info");
    const fileName = file.name;
    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    try {
      if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        pdfHandler = new PDFHandler();
        const { numPages } = await pdfHandler.loadFromBuffer(arrayBuffer);

        state.currentDoc = {
          type: "pdf",
          name: fileName,
          numPages: numPages,
          rawBytes: arrayBuffer,
          pagesImages: [],
        };
      } else if (file.type.startsWith("image/")) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        pdfHandler = new PDFHandler();
        state.currentDoc = {
          type: "image",
          name: fileName,
          numPages: 1,
          pagesImages: [dataUrl],
        };
      } else {
        showToast("Please upload a PDF or image file.", "error");
        return;
      }

      state.currentPage = 1;
      state.placedElements = [];
      state.selectedElementId = null;

      activateDocumentView();
      await fitDocument();
      renderThumbnails();

      // If user had an active signature created in Quick Studio, automatically stamp it
      if (state.activeSignatureDataUrl) {
        addElementToPage("signature", state.activeSignatureDataUrl);
      }

      showToast("Document loaded and ready to sign!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to load document: " + err.message, "error");
    }
  }

  // Load sample agreement templates
  async function loadTemplate(templateId) {
    showToast("Loading sample agreement...", "info");
    try {
      const pages = await DocumentTemplates.generateTemplatePages(templateId);
      const templateInfo = DocumentTemplates.getTemplatesList().find(
        (t) => t.id === templateId,
      ) || { title: "Sample Agreement" };

      pdfHandler = new PDFHandler();
      state.currentDoc = {
        type: "template",
        name: templateInfo.title + ".pdf",
        numPages: pages.length,
        pagesImages: pages,
        rawBytes: null,
      };

      state.currentPage = 1;
      state.placedElements = [];
      state.selectedElementId = null;

      activateDocumentView();
      await fitDocument();
      renderThumbnails();

      if (state.activeSignatureDataUrl) {
        addElementToPage("signature", state.activeSignatureDataUrl);
      }

      showToast(`Loaded ${templateInfo.title}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to render template: " + err.message, "error");
    }
  }

  function activateDocumentView() {
    emptyState.classList.add("hidden");
    docWorkspace.classList.remove("hidden");
    docHeaderActions.classList.remove("hidden");
    document.getElementById("document-filename").textContent =
      state.currentDoc.name;
  }

  // Serialize canvas renders: PDF.js cannot render concurrently to one canvas.
  let renderQueue = Promise.resolve();
  function renderCurrentPage() {
    renderQueue = renderQueue.then(renderPage).catch((error) => {
      showToast("Could not display this page: " + error.message, "error");
    });
    return renderQueue;
  }

  async function renderPage() {
    if (!state.currentDoc) return;

    pageIndicator.textContent = `Page ${state.currentPage} of ${state.currentDoc.numPages}`;
    prevPageBtn.disabled = state.currentPage <= 1;
    nextPageBtn.disabled = state.currentPage >= state.currentDoc.numPages;

    if (state.currentDoc.type === "pdf") {
      const renderInfo = await pdfHandler.renderPageToCanvas(
        state.currentPage,
        docCanvas,
        1.4 * state.zoom,
      );
      updateOverlayDimensions(renderInfo.width, renderInfo.height);
    } else {
      const imgUrl = state.currentDoc.pagesImages[state.currentPage - 1];
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to decode document image."));
        img.src = imgUrl;
      });

      const dpr = window.devicePixelRatio || 1;
      const baseWidth = 800 * state.zoom;
      const aspect = img.height / img.width;
      const baseHeight = baseWidth * aspect;

      docCanvas.width = baseWidth * dpr;
      docCanvas.height = baseHeight * dpr;
      docCanvas.style.width = `${baseWidth}px`;
      docCanvas.style.height = `${baseHeight}px`;

      const ctx = docCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0, docCanvas.width, docCanvas.height);
      updateOverlayDimensions(baseWidth, baseHeight);
    }

    renderPlacedElements();
  }

  function updateOverlayDimensions(w, h) {
    overlayLayer.style.width = `${w}px`;
    overlayLayer.style.height = `${h}px`;
    docPageContainer.style.width = `${w}px`;
    docPageContainer.style.height = `${h}px`;
  }

  function renderThumbnails() {
    pageThumbnailsList.innerHTML = "";
    for (let p = 1; p <= state.currentDoc.numPages; p++) {
      const item = document.createElement("button");
      item.className = `w-full text-left p-2 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
        p === state.currentPage
          ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
          : "border-slate-200 hover:bg-slate-50 text-slate-600"
      }`;
      if (p === state.currentPage) item.setAttribute("aria-current", "page");
      item.innerHTML = `<span>Page ${p}</span> <span class="text-[10px] text-slate-400">${p === state.currentPage ? "Active" : ""}</span>`;
      item.addEventListener("click", () => {
        if (state.currentPage !== p) {
          state.currentPage = p;
          renderCurrentPage();
          renderThumbnails();
        }
      });
      pageThumbnailsList.appendChild(item);
    }
  }

  /* ========================================================
     ELEMENT INTERACTION ENGINE (DRAGGABLE & RESIZABLE)
     ======================================================== */

  function addElementToPage(type, content, options = {}) {
    if (!state.currentDoc) {
      showToast("Please open or upload a document first", "error");
      return;
    }

    const defaultWidth =
      options.width ||
      (type === "signature"
        ? 0.26
        : type === "initials"
          ? 0.14
          : type === "seal"
            ? 0.2
            : 0.24);
    const defaultHeight =
      options.height ||
      (type === "signature"
        ? 0.08
        : type === "initials"
          ? 0.06
          : type === "seal"
            ? 0.08
            : 0.04);

    const newElement = {
      id: "el_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      page: state.currentPage,
      type: type,
      content: content,
      x: 0.38,
      y: 0.45,
      width: defaultWidth,
      height: defaultHeight,
      color: options.color || "#0f2b48",
      isBold: options.isBold || false,
    };

    state.placedElements.push(newElement);
    state.selectedElementId = newElement.id;
    renderPlacedElements();
    showToast(
      `${capitalize(type)} placed on page ${state.currentPage}`,
      "success",
    );
  }

  function renderPlacedElements() {
    overlayLayer.innerHTML = "";
    const currentElements = state.placedElements.filter(
      (el) => el.page === state.currentPage,
    );
    const overlayRect = overlayLayer.getBoundingClientRect();
    const containerW = overlayRect.width || docCanvas.clientWidth || 800;
    const containerH = overlayRect.height || docCanvas.clientHeight || 1100;

    currentElements.forEach((el) => {
      const elNode = document.createElement("div");
      elNode.className = `placed-element ${el.id === state.selectedElementId ? "selected" : ""}`;
      elNode.id = el.id;
      elNode.tabIndex = 0;
      elNode.setAttribute(
        "aria-label",
        `${el.type} field. Arrow keys to move, Shift and arrows to resize.`,
      );
      elNode.addEventListener("focus", () => {
        state.selectedElementId = el.id;
        overlayLayer
          .querySelectorAll(".placed-element")
          .forEach((node) =>
            node.classList.toggle("selected", node === elNode),
          );
      });
      elNode.addEventListener("keydown", (event) => {
        const directions = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (!directions[event.key]) return;
        event.preventDefault();
        const [dx, dy] = directions[event.key];
        if (event.shiftKey) {
          el.width = Math.max(0.04, Math.min(1 - el.x, el.width + dx * 0.005));
          el.height = Math.max(
            0.02,
            Math.min(1 - el.y, el.height + dy * 0.005),
          );
        } else {
          el.x = Math.max(0, Math.min(1 - el.width, el.x + dx * 0.005));
          el.y = Math.max(0, Math.min(1 - el.height, el.y + dy * 0.005));
        }
        renderPlacedElements();
        document.getElementById(el.id)?.focus({ preventScroll: true });
      });

      const pxX = el.x * containerW;
      const pxY = el.y * containerH;
      const pxW = el.width * containerW;
      const pxH = el.height * containerH;

      elNode.style.left = `${pxX}px`;
      elNode.style.top = `${pxY}px`;
      elNode.style.width = `${pxW}px`;
      elNode.style.height = `${pxH}px`;

      let innerHTML = "";
      if (
        el.type === "signature" ||
        el.type === "initials" ||
        el.type === "seal"
      ) {
        innerHTML = `<img src="${el.content}" class="w-full h-full object-contain pointer-events-none select-none" alt="${el.type}" />`;
      } else {
        innerHTML = '<div class="placed-text"></div>';
      }

      const handlesHTML = `
        <div class="resize-handle" aria-hidden="true"></div>
        <div class="element-toolbar"><button class="delete-btn" aria-label="Delete field">Delete</button><button class="duplicate-btn" aria-label="Duplicate field">Duplicate</button></div>
      `;

      elNode.innerHTML = innerHTML + handlesHTML;
      const textNode = elNode.querySelector(".placed-text");
      if (textNode) {
        textNode.textContent = el.content;
        textNode.style.color = el.color;
        textNode.style.fontSize = `${pxH * 0.7}px`;
        textNode.style.fontWeight = el.isBold ? "bold" : "normal";
      }
      setupElementInteraction(elNode, el);
      overlayLayer.appendChild(elNode);
    });
  }

  function setupElementInteraction(elNode, el) {
    const resizeHandle = elNode.querySelector(".resize-handle");
    const deleteBtn = elNode.querySelector(".delete-btn");
    const duplicateBtn = elNode.querySelector(".duplicate-btn");

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.placedElements = state.placedElements.filter(
        (item) => item.id !== el.id,
      );
      if (state.selectedElementId === el.id) state.selectedElementId = null;
      renderPlacedElements();
      showToast("Element removed", "info");
    });

    duplicateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dup = {
        ...el,
        id: "el_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        x: Math.min(0.85, el.x + 0.04),
        y: Math.min(0.85, el.y + 0.04),
      };
      state.placedElements.push(dup);
      state.selectedElementId = dup.id;
      renderPlacedElements();
      showToast("Element duplicated", "info");
    });

    elNode.addEventListener("pointerdown", (e) => {
      if (
        e.target.closest(".resize-handle") ||
        e.target.closest(".element-toolbar")
      )
        return;
      e.preventDefault();
      e.stopPropagation();

      state.selectedElementId = el.id;
      overlayLayer
        .querySelectorAll(".placed-element")
        .forEach((node) => node.classList.toggle("selected", node === elNode));
      elNode.focus({ preventScroll: true });

      state.isDragging = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.elementStart = { x: el.x, y: el.y, w: el.width, h: el.height };

      elNode.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent) => {
        if (!state.isDragging) return;
        const containerW = overlayLayer.clientWidth;
        const containerH = overlayLayer.clientHeight;

        const deltaX = (moveEvent.clientX - state.dragStart.x) / containerW;
        const deltaY = (moveEvent.clientY - state.dragStart.y) / containerH;

        el.x = Math.max(
          0,
          Math.min(1 - el.width, state.elementStart.x + deltaX),
        );
        el.y = Math.max(
          0,
          Math.min(1 - el.height, state.elementStart.y + deltaY),
        );

        elNode.style.left = `${el.x * containerW}px`;
        elNode.style.top = `${el.y * containerH}px`;
      };

      const onPointerUp = () => {
        state.isDragging = false;
        elNode.removeEventListener("pointermove", onPointerMove);
        elNode.removeEventListener("pointerup", onPointerUp);
        elNode.removeEventListener("pointercancel", onPointerUp);
      };

      elNode.addEventListener("pointermove", onPointerMove);
      elNode.addEventListener("pointerup", onPointerUp);
      elNode.addEventListener("pointercancel", onPointerUp);
    });

    resizeHandle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      state.isResizing = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.elementStart = { x: el.x, y: el.y, w: el.width, h: el.height };

      resizeHandle.setPointerCapture(e.pointerId);

      const onResizeMove = (moveEvent) => {
        if (!state.isResizing) return;
        const containerW = overlayLayer.clientWidth;
        const containerH = overlayLayer.clientHeight;

        const deltaX = (moveEvent.clientX - state.dragStart.x) / containerW;
        const deltaY = (moveEvent.clientY - state.dragStart.y) / containerH;

        let newW = Math.max(
          0.04,
          Math.min(1 - el.x, state.elementStart.w + deltaX),
        );
        let newH = Math.max(
          0.02,
          Math.min(1 - el.y, state.elementStart.h + deltaY),
        );

        if (el.type === "signature" || el.type === "initials") {
          const originalAspect = state.elementStart.h / state.elementStart.w;
          newH = newW * originalAspect;
        }

        el.width = newW;
        el.height = newH;

        elNode.style.width = `${el.width * containerW}px`;
        elNode.style.height = `${el.height * containerH}px`;
      };

      const onResizeUp = () => {
        state.isResizing = false;
        renderPlacedElements();
        resizeHandle.removeEventListener("pointermove", onResizeMove);
        resizeHandle.removeEventListener("pointerup", onResizeUp);
        resizeHandle.removeEventListener("pointercancel", onResizeUp);
      };

      resizeHandle.addEventListener("pointermove", onResizeMove);
      resizeHandle.addEventListener("pointerup", onResizeUp);
      resizeHandle.addEventListener("pointercancel", onResizeUp);
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (
      !e.target.closest(".placed-element") &&
      !e.target.closest("#tools-sidebar")
    ) {
      if (state.selectedElementId) {
        state.selectedElementId = null;
        renderPlacedElements();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      state.selectedElementId
    ) {
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      )
        return;
      state.placedElements = state.placedElements.filter(
        (el) => el.id !== state.selectedElementId,
      );
      state.selectedElementId = null;
      renderPlacedElements();
      showToast("Element deleted", "info");
    }
  });

  /* ========================================================
     DOCUMENT SIDEBAR TOOLS
     ======================================================== */

  // Signature tool
  document
    .getElementById("tool-signature-btn")
    ?.addEventListener("click", () => {
      let sigUrl = state.activeSignatureDataUrl || getActiveSignatureDataUrl();
      if (!sigUrl) {
        switchAppMode("quick");
        showToast("Create your signature here first!", "info");
        return;
      }
      addElementToPage("signature", sigUrl);
    });

  // Initials tool
  document
    .getElementById("tool-initials-btn")
    ?.addEventListener("click", () => {
      const initials = prompt(
        "Enter your initials:",
        state.userInitials,
      )?.trim();
      if (initials) {
        state.userInitials = initials;
        localStorage.setItem("e_sig_user_initials", initials);

        const initialsUrl = TypeSignatureGenerator.generate({
          text: initials,
          fontFamily: "Caveat",
          color: state.signatureColor,
          fontSize: 54,
        });
        if (initialsUrl) {
          addElementToPage("initials", initialsUrl, {
            width: 0.14,
            height: 0.06,
          });
        }
      }
    });

  // Today's Date tool
  document.getElementById("tool-date-btn")?.addEventListener("click", () => {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    addElementToPage("date", today, { width: 0.22, height: 0.035 });
  });

  // Full Name tool
  document.getElementById("tool-name-btn")?.addEventListener("click", () => {
    const name = prompt("Enter signer full name:", state.userName)?.trim();
    if (name) {
      state.userName = name;
      localStorage.setItem("e_sig_user_name", name);
      addElementToPage("name", name, {
        width: 0.26,
        height: 0.038,
        isBold: true,
      });
    }
  });

  // Custom Text tool
  document.getElementById("tool-text-btn")?.addEventListener("click", () => {
    const text = prompt("Enter custom text or title:", "Approved & Agreed");
    if (text) {
      addElementToPage("text", text, { width: 0.28, height: 0.038 });
    }
  });

  /* ========================================================
     NAVIGATION & ZOOM HANDLERS
     ======================================================== */

  prevPageBtn?.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderCurrentPage();
      renderThumbnails();
    }
  });

  nextPageBtn?.addEventListener("click", () => {
    if (state.currentPage < state.currentDoc.numPages) {
      state.currentPage++;
      renderCurrentPage();
      renderThumbnails();
    }
  });

  zoomInBtn?.addEventListener("click", () => {
    if (state.zoom < 2.0) {
      state.zoom = +(state.zoom + 0.15).toFixed(2);
      zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
      renderCurrentPage();
    }
  });

  zoomOutBtn?.addEventListener("click", () => {
    if (state.zoom > 0.6) {
      state.zoom = +(state.zoom - 0.15).toFixed(2);
      zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
      renderCurrentPage();
    }
  });

  async function fitDocument() {
    if (!state.currentDoc) return;
    let baseWidth = 800;
    if (state.currentDoc.type === "pdf") {
      const page = await pdfHandler.pdfDoc.getPage(state.currentPage);
      baseWidth = page.getViewport({ scale: 1.4 }).width;
    }
    const viewport = document.getElementById("doc-scroll-viewport");
    const padding = parseFloat(getComputedStyle(viewport).paddingLeft) * 2;
    state.zoom = Math.min(
      1,
      Math.max(0.15, (viewport.clientWidth - padding) / baseWidth),
    );
    zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
    await renderCurrentPage();
  }
  zoomFitBtn?.addEventListener("click", fitDocument);

  /* ========================================================
     FILE UPLOAD DROPZONE & TEMPLATES
     ======================================================== */

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  if (dropZone) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("border-indigo-500", "bg-indigo-50/50");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-indigo-500", "bg-indigo-50/50");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file) handleFileUpload(file);
    });
  }

  document.querySelectorAll(".template-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const templateId = btn.dataset.template;
      loadTemplate(templateId);
    });
  });

  /* ========================================================
     DOCUMENT EXPORT WORKFLOW
     ======================================================== */

  document
    .getElementById("export-modal-trigger")
    ?.addEventListener("click", () => {
      if (!state.currentDoc) {
        showToast("Please open a document first", "error");
        return;
      }
      document.getElementById("export-doc-name").textContent =
        state.currentDoc.name;
      document.getElementById("export-elements-count").textContent =
        `${state.placedElements.length} signature(s) & field(s) placed`;
      exportModal.showModal();
    });

  document
    .getElementById("close-export-modal-btn")
    ?.addEventListener("click", () => {
      exportModal.close();
    });

  // Download PDF
  document
    .getElementById("download-signed-pdf-btn")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("download-signed-pdf-btn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Preparing PDF…";

      try {
        const pdfBytes = await pdfHandler.exportSignedPDF(
          state.placedElements,
          {
            documentName: state.currentDoc.name,
            pagesImages: state.currentDoc.pagesImages,
          },
        );

        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Signed_${state.currentDoc.name.replace(/\.[^/.]+$/, "")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        exportModal.close();
        showToast("Signed PDF exported successfully!", "success");
      } catch (err) {
        console.error(err);
        showToast("Export failed: " + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

  // Download Current Page as High-Res Image
  document
    .getElementById("download-page-img-btn")
    ?.addEventListener("click", () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = docCanvas.width;
      tempCanvas.height = docCanvas.height;
      const ctx = tempCanvas.getContext("2d");

      ctx.drawImage(docCanvas, 0, 0);

      const currentElements = state.placedElements.filter(
        (el) => el.page === state.currentPage,
      );
      const promises = currentElements.map((el) => {
        return new Promise((resolve) => {
          const x = el.x * tempCanvas.width;
          const y = el.y * tempCanvas.height;
          const w = el.width * tempCanvas.width;
          const h = el.height * tempCanvas.height;

          if (el.content && el.content.startsWith("data:image")) {
            const img = new Image();
            img.onload = () => {
              const scale = Math.min(w / img.width, h / img.height);
              const iw = img.width * scale,
                ih = img.height * scale;
              ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
              resolve();
            };
            img.src = el.content;
          } else {
            ctx.fillStyle = el.color || "#1e293b";
            const fontSize = Math.max(14, Math.round(h * 0.7));
            ctx.font = `${el.isBold ? "bold" : "500"} ${fontSize}px Inter, sans-serif`;
            ctx.textBaseline = "middle";
            ctx.fillText(el.content || "", x + 6, y + h / 2);
            resolve();
          }
        });
      });

      Promise.all(promises).then(() => {
        const imgUrl = tempCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = `${state.currentDoc.name.replace(/\.[^/.]+$/, "")}-page-${state.currentPage}.png`;
        a.click();
        showToast("Page downloaded as image!", "success");
      });
    });

  // Clear document
  document
    .getElementById("clear-all-doc-btn")
    ?.addEventListener("click", () => {
      if (confirm("Clear this document and return to empty state?")) {
        state.currentDoc = null;
        state.placedElements = [];
        state.selectedElementId = null;
        state.currentPage = 1;
        emptyState.classList.remove("hidden");
        docWorkspace.classList.add("hidden");
        docHeaderActions.classList.add("hidden");
        showToast("Workspace reset", "info");
      }
    });

  // Initial load
  updateHeroTypeSignatures();
  document.fonts.ready.then(updateHeroTypeSignatures);
  renderHeroSavedSignatures();

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
});
