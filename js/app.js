/**
 * Main Application Logic for E-Signature Web App
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    currentDoc: null, // { type: 'pdf'|'image'|'template', name, numPages, pagesImages: [], rawBytes }
    currentPage: 1,
    zoom: 1.0,
    placedElements: [], // Array of { id, page, type, x, y, width, height, content, color, isBold }
    selectedElementId: null,
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    elementStart: { x: 0, y: 0, w: 0, h: 0 },
    userName: localStorage.getItem('e_sig_user_name') || 'John Doe',
    userInitials: localStorage.getItem('e_sig_user_initials') || 'JD',
    activeSignatureTab: 'draw',
    signatureColor: '#0f2b48',
    strokeWidth: 2.5
  };

  // Instances
  let pdfHandler = new PDFHandler();
  let sigPad = null;
  let quickPad = null;

  // DOM Elements
  const emptyState = document.getElementById('empty-state');
  const docWorkspace = document.getElementById('doc-workspace');
  const docPageContainer = document.getElementById('doc-page-container');
  const docCanvas = document.getElementById('doc-canvas');
  const overlayLayer = document.getElementById('overlay-layer');
  const docTitleInput = document.getElementById('doc-title');
  const fileInput = document.getElementById('file-upload-input');
  const dropZone = document.getElementById('drop-zone');

  // Navigation & Zoom
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomFitBtn = document.getElementById('zoom-fit-btn');
  const zoomLevelText = document.getElementById('zoom-level-text');
  const pageThumbnailsList = document.getElementById('page-thumbnails');

  // Modals
  const signatureModal = document.getElementById('signature-modal');
  const quickSignModal = document.getElementById('quick-sign-modal');
  const exportModal = document.getElementById('export-modal');
  const toastContainer = document.getElementById('toast-container');

  // Signature Pad Canvas
  const sigCanvas = document.getElementById('signature-canvas');
  if (sigCanvas) {
    sigPad = new SignaturePadEngine(sigCanvas, {
      color: state.signatureColor,
      strokeWidth: state.strokeWidth
    });
  }

  // Quick Sign Pad Canvas
  const quickCanvas = document.getElementById('quick-sign-canvas');
  if (quickCanvas) {
    quickPad = new SignaturePadEngine(quickCanvas, {
      color: '#0f2b48',
      strokeWidth: 2.5
    });
  }

  // Helper: Toast Notifications
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    } else {
      iconSvg = `<svg class="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Auto-init PDF worker if needed
  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /* ========================================================
     DOCUMENT LOADING & VIEWING
     ======================================================== */

  async function handleFileUpload(file) {
    if (!file) return;

    showToast(`Loading "${file.name}"...`, 'info');
    const fileName = file.name;
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    try {
      if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        pdfHandler = new PDFHandler();
        const { numPages } = await pdfHandler.loadFromBuffer(arrayBuffer);

        state.currentDoc = {
          type: 'pdf',
          name: fileName,
          numPages: numPages,
          rawBytes: arrayBuffer,
          pagesImages: []
        };
      } else if (file.type.startsWith('image/')) {
        // Image document (PNG/JPG)
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        state.currentDoc = {
          type: 'image',
          name: fileName,
          numPages: 1,
          pagesImages: [dataUrl]
        };
      } else {
        showToast('Unsupported file type. Please upload a PDF or image.', 'error');
        return;
      }

      state.currentPage = 1;
      state.placedElements = [];
      state.selectedElementId = null;
      docTitleInput.value = fileName.replace(/\.[^/.]+$/, "");

      activateDocumentView();
      await renderCurrentPage();
      renderThumbnails();
      showToast('Document loaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to load document: ' + err.message, 'error');
    }
  }

  // Sample template loader
  async function loadTemplate(templateId) {
    showToast('Loading sample agreement template...', 'info');
    try {
      const pages = await DocumentTemplates.generateTemplatePages(templateId);
      const templateInfo = DocumentTemplates.getTemplatesList().find(t => t.id === templateId) || { title: 'Sample Agreement' };

      state.currentDoc = {
        type: 'template',
        name: templateInfo.title + '.pdf',
        numPages: pages.length,
        pagesImages: pages,
        rawBytes: null
      };

      state.currentPage = 1;
      state.placedElements = [];
      state.selectedElementId = null;
      docTitleInput.value = templateInfo.title;

      activateDocumentView();
      await renderCurrentPage();
      renderThumbnails();
      showToast(`Loaded ${templateInfo.title}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to render template: ' + err.message, 'error');
    }
  }

  function activateDocumentView() {
    emptyState.classList.add('hidden');
    docWorkspace.classList.remove('hidden');
    document.getElementById('doc-header-actions').classList.remove('hidden');
    document.getElementById('tools-sidebar').classList.remove('opacity-50', 'pointer-events-none');
  }

  async function renderCurrentPage() {
    if (!state.currentDoc) return;

    pageIndicator.textContent = `Page ${state.currentPage} of ${state.currentDoc.numPages}`;
    prevPageBtn.disabled = state.currentPage <= 1;
    nextPageBtn.disabled = state.currentPage >= state.currentDoc.numPages;

    if (state.currentDoc.type === 'pdf') {
      const renderInfo = await pdfHandler.renderPageToCanvas(state.currentPage, docCanvas, 1.4 * state.zoom);
      updateOverlayDimensions(renderInfo.width, renderInfo.height);
    } else {
      // Image or template
      const imgUrl = state.currentDoc.pagesImages[state.currentPage - 1];
      const img = new Image();
      img.src = imgUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const dpr = window.devicePixelRatio || 1;
      const baseWidth = 800 * state.zoom;
      const aspect = img.height / img.width;
      const baseHeight = baseWidth * aspect;

      docCanvas.width = baseWidth * dpr;
      docCanvas.height = baseHeight * dpr;
      docCanvas.style.width = `${baseWidth}px`;
      docCanvas.style.height = `${baseHeight}px`;

      const ctx = docCanvas.getContext('2d');
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
    pageThumbnailsList.innerHTML = '';
    for (let p = 1; p <= state.currentDoc.numPages; p++) {
      const item = document.createElement('button');
      item.className = `w-full text-left p-2 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
        p === state.currentPage ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
      }`;
      item.innerHTML = `<span>Page ${p}</span> <span class="text-[10px] text-slate-400">${p === state.currentPage ? 'Active' : ''}</span>`;
      item.addEventListener('click', () => {
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
     ELEMENT PLACEMENT & INTERACTION ENGINE
     ======================================================== */

  function addElementToPage(type, content, options = {}) {
    if (!state.currentDoc) {
      showToast('Please open or select a document first', 'error');
      return;
    }

    const defaultWidth = options.width || (type === 'signature' ? 0.26 : type === 'initials' ? 0.14 : type === 'seal' ? 0.20 : 0.24);
    const defaultHeight = options.height || (type === 'signature' ? 0.08 : type === 'initials' ? 0.06 : type === 'seal' ? 0.08 : 0.04);

    const newElement = {
      id: 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      page: state.currentPage,
      type: type, // 'signature' | 'initials' | 'date' | 'name' | 'text' | 'seal'
      content: content,
      x: 0.38, // Center-ish normalized coordinate
      y: 0.45,
      width: defaultWidth,
      height: defaultHeight,
      color: options.color || '#0f2b48',
      isBold: options.isBold || false
    };

    state.placedElements.push(newElement);
    state.selectedElementId = newElement.id;
    renderPlacedElements();
    showToast(`${capitalize(type)} placed on page ${state.currentPage}`, 'success');
  }

  function renderPlacedElements() {
    overlayLayer.innerHTML = '';
    const currentElements = state.placedElements.filter(el => el.page === state.currentPage);
    const overlayRect = overlayLayer.getBoundingClientRect();
    const containerW = overlayRect.width || docCanvas.clientWidth || 800;
    const containerH = overlayRect.height || docCanvas.clientHeight || 1100;

    currentElements.forEach(el => {
      const elNode = document.createElement('div');
      elNode.className = `placed-element ${el.id === state.selectedElementId ? 'selected' : ''}`;
      elNode.id = el.id;

      const pxX = el.x * containerW;
      const pxY = el.y * containerH;
      const pxW = el.width * containerW;
      const pxH = el.height * containerH;

      elNode.style.left = `${pxX}px`;
      elNode.style.top = `${pxY}px`;
      elNode.style.width = `${pxW}px`;
      elNode.style.height = `${pxH}px`;

      // Inner Content
      let innerHTML = '';
      if (el.type === 'signature' || el.type === 'initials' || el.type === 'seal') {
        innerHTML = `<img src="${el.content}" class="w-full h-full object-contain pointer-events-none select-none" alt="${el.type}" />`;
      } else {
        innerHTML = `
          <div class="w-full h-full flex items-center px-1 font-medium select-none overflow-hidden" 
               style="color: ${el.color || '#1e293b'}; font-size: ${Math.max(12, pxH * 0.65)}px;">
            ${el.content}
          </div>
        `;
      }

      // Add Resize handle & Element Floating Toolbar
      const handlesHTML = `
        <div class="resize-handle"></div>
        <div class="element-toolbar">
          <button class="delete-btn hover:text-rose-400 p-1 text-xs" title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
          <button class="duplicate-btn hover:text-indigo-400 p-1 text-xs" title="Duplicate">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </button>
        </div>
      `;

      elNode.innerHTML = innerHTML + handlesHTML;

      // Event Listeners for dragging & resizing
      setupElementInteraction(elNode, el);

      overlayLayer.appendChild(elNode);
    });
  }

  function setupElementInteraction(elNode, el) {
    const resizeHandle = elNode.querySelector('.resize-handle');
    const deleteBtn = elNode.querySelector('.delete-btn');
    const duplicateBtn = elNode.querySelector('.duplicate-btn');

    // Delete
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.placedElements = state.placedElements.filter(item => item.id !== el.id);
      if (state.selectedElementId === el.id) state.selectedElementId = null;
      renderPlacedElements();
      showToast('Element removed', 'info');
    });

    // Duplicate
    duplicateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dup = {
        ...el,
        id: 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        x: Math.min(0.85, el.x + 0.04),
        y: Math.min(0.85, el.y + 0.04)
      };
      state.placedElements.push(dup);
      state.selectedElementId = dup.id;
      renderPlacedElements();
      showToast('Element duplicated', 'info');
    });

    // Drag start
    elNode.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.resize-handle') || e.target.closest('.element-toolbar')) return;
      e.preventDefault();
      e.stopPropagation();

      state.selectedElementId = el.id;
      renderPlacedElements();

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

        el.x = Math.max(0, Math.min(1 - el.width, state.elementStart.x + deltaX));
        el.y = Math.max(0, Math.min(1 - el.height, state.elementStart.y + deltaY));

        elNode.style.left = `${el.x * containerW}px`;
        elNode.style.top = `${el.y * containerH}px`;
      };

      const onPointerUp = (upEvent) => {
        state.isDragging = false;
        elNode.removeEventListener('pointermove', onPointerMove);
        elNode.removeEventListener('pointerup', onPointerUp);
        elNode.removeEventListener('pointercancel', onPointerUp);
      };

      elNode.addEventListener('pointermove', onPointerMove);
      elNode.addEventListener('pointerup', onPointerUp);
      elNode.addEventListener('pointercancel', onPointerUp);
    });

    // Resize start
    resizeHandle.addEventListener('pointerdown', (e) => {
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

        let newW = Math.max(0.04, Math.min(1 - el.x, state.elementStart.w + deltaX));
        let newH = Math.max(0.02, Math.min(1 - el.y, state.elementStart.h + deltaY));

        // Preserve aspect ratio for signatures
        if (el.type === 'signature' || el.type === 'initials') {
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
        resizeHandle.removeEventListener('pointermove', onResizeMove);
        resizeHandle.removeEventListener('pointerup', onResizeUp);
        resizeHandle.removeEventListener('pointercancel', onResizeUp);
      };

      resizeHandle.addEventListener('pointermove', onResizeMove);
      resizeHandle.addEventListener('pointerup', onResizeUp);
      resizeHandle.addEventListener('pointercancel', onResizeUp);
    });
  }

  // Click outside unselects
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.placed-element') && !e.target.closest('#tools-sidebar')) {
      if (state.selectedElementId) {
        state.selectedElementId = null;
        renderPlacedElements();
      }
    }
  });

  // Keyboard shortcut listener
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      state.placedElements = state.placedElements.filter(el => el.id !== state.selectedElementId);
      state.selectedElementId = null;
      renderPlacedElements();
      showToast('Element deleted', 'info');
    }
  });

  /* ========================================================
     SIGNATURE MODAL TABS & ACTIONS
     ======================================================== */

  function openSignatureModal(mode = 'signature') {
    signatureModal.dataset.mode = mode;
    document.getElementById('sig-modal-title').textContent = mode === 'initials' ? 'Create Initials' : 'Create Signature';
    signatureModal.classList.remove('hidden');
    signatureModal.classList.add('flex');

    if (sigPad) {
      setTimeout(() => {
        sigPad.resize();
        sigPad.clear();
      }, 50);
    }
    loadSavedSignaturesUI();
  }

  function closeSignatureModal() {
    signatureModal.classList.add('hidden');
    signatureModal.classList.remove('flex');
  }

  // Signature Tab Switcher
  const sigTabs = document.querySelectorAll('.sig-tab-btn');
  sigTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      sigTabs.forEach(b => {
        b.classList.remove('text-indigo-600', 'border-indigo-600', 'active');
        b.classList.add('text-slate-500', 'border-transparent');
      });
      btn.classList.add('text-indigo-600', 'border-indigo-600', 'active');
      btn.classList.remove('text-slate-500', 'border-transparent');

      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.sig-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
      state.activeSignatureTab = targetTab;

      if (targetTab === 'draw' && sigPad) {
        sigPad.resize();
      } else if (targetTab === 'type') {
        updateTypePreview();
      } else if (targetTab === 'saved') {
        loadSavedSignaturesUI();
      }
    });
  });

  // Color selection in signature pad
  document.querySelectorAll('.sig-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      state.signatureColor = color;
      if (sigPad) sigPad.setColor(color);
      document.querySelectorAll('.sig-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500'));
      btn.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500');
      updateTypePreview();
    });
  });

  // Pen width selector
  document.getElementById('pen-width-select')?.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    state.strokeWidth = val;
    if (sigPad) sigPad.setStrokeWidth(val);
  });

  // Eraser toggle
  let isEraserActive = false;
  const eraserBtn = document.getElementById('eraser-btn');
  eraserBtn?.addEventListener('click', () => {
    isEraserActive = !isEraserActive;
    if (sigPad) sigPad.setEraser(isEraserActive);
    eraserBtn.classList.toggle('bg-amber-100', isEraserActive);
    eraserBtn.classList.toggle('text-amber-800', isEraserActive);
  });

  // Undo / Redo / Clear
  document.getElementById('sig-undo-btn')?.addEventListener('click', () => sigPad?.undo());
  document.getElementById('sig-clear-btn')?.addEventListener('click', () => {
    sigPad?.clear();
    isEraserActive = false;
    sigPad?.setEraser(false);
    eraserBtn?.classList.remove('bg-amber-100', 'text-amber-800');
  });

  // Type signature live preview
  const typeInput = document.getElementById('type-sig-input');
  const typeFontSelect = document.getElementById('type-font-select');
  const typePreviewImg = document.getElementById('type-sig-preview');

  function updateTypePreview() {
    if (!typeInput || !typePreviewImg) return;
    const text = typeInput.value.trim() || 'Your Signature';
    const font = typeFontSelect.value || 'Caveat';
    const url = TypeSignatureGenerator.generate({
      text,
      fontFamily: font,
      color: state.signatureColor,
      fontSize: 58
    });
    if (url) {
      typePreviewImg.src = url;
    }
  }

  typeInput?.addEventListener('input', updateTypePreview);
  typeFontSelect?.addEventListener('change', updateTypePreview);

  // Upload signature & background cleaner
  const uploadInput = document.getElementById('upload-sig-input');
  const uploadPreviewImg = document.getElementById('upload-sig-preview');
  const uploadThresholdSlider = document.getElementById('upload-threshold-slider');
  let rawUploadedImage = null;

  uploadInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        rawUploadedImage = img;
        processUploadedSig();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  uploadThresholdSlider?.addEventListener('input', () => {
    if (rawUploadedImage) processUploadedSig();
  });

  function processUploadedSig() {
    if (!rawUploadedImage || !uploadPreviewImg) return;
    const threshold = parseInt(uploadThresholdSlider.value, 10);
    const cleanedUrl = UploadSignatureProcessor.processImage(rawUploadedImage, {
      threshold,
      enhanceContrast: true
    });
    uploadPreviewImg.src = cleanedUrl;
  }

  // Saved signatures list
  function loadSavedSignaturesUI() {
    const container = document.getElementById('saved-signatures-list');
    if (!container) return;
    const list = SavedSignaturesManager.getSignatures();
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-400 text-sm">
          No saved signatures yet. Sign once and check "Save for future use" to access them here!
        </div>
      `;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'group relative p-3 border border-slate-200 rounded-xl hover:border-indigo-400 bg-white hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center bg-checkered';
      card.innerHTML = `
        <img src="${item.dataUrl}" class="max-h-16 object-contain pointer-events-none" alt="Saved signature" />
        <span class="text-[11px] text-slate-400 mt-2">${new Date(item.createdAt).toLocaleDateString()}</span>
        <button class="delete-saved-btn absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition" title="Delete">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-saved-btn')) return;
        applySignatureDataUrl(item.dataUrl);
      });

      card.querySelector('.delete-saved-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        SavedSignaturesManager.deleteSignature(item.id);
        loadSavedSignaturesUI();
        showToast('Saved signature deleted', 'info');
      });

      container.appendChild(card);
    });
  }

  // Insert signature button handler
  document.getElementById('apply-signature-btn')?.addEventListener('click', () => {
    let finalDataUrl = null;
    const mode = signatureModal.dataset.mode || 'signature';

    if (state.activeSignatureTab === 'draw') {
      if (sigPad.isEmpty()) {
        showToast('Please draw your signature first', 'error');
        return;
      }
      finalDataUrl = sigPad.toDataURL('image/png');
    } else if (state.activeSignatureTab === 'type') {
      const text = typeInput.value.trim() || 'Signature';
      finalDataUrl = TypeSignatureGenerator.generate({
        text,
        fontFamily: typeFontSelect.value,
        color: state.signatureColor,
        fontSize: 64
      });
    } else if (state.activeSignatureTab === 'upload') {
      if (!uploadPreviewImg || !uploadPreviewImg.src) {
        showToast('Please choose an image file first', 'error');
        return;
      }
      finalDataUrl = uploadPreviewImg.src;
    }

    if (!finalDataUrl) {
      showToast('Could not generate signature', 'error');
      return;
    }

    // Save to local storage if checked
    if (document.getElementById('save-sig-checkbox')?.checked) {
      SavedSignaturesManager.saveSignature(finalDataUrl, mode, mode === 'initials' ? 'My Initials' : 'My Signature');
    }

    applySignatureDataUrl(finalDataUrl, mode);
  });

  function applySignatureDataUrl(dataUrl, mode = 'signature') {
    closeSignatureModal();
    if (state.currentDoc) {
      addElementToPage(mode, dataUrl);
    } else {
      // Document not loaded yet: download or copy
      copyOrDownloadSignature(dataUrl);
    }
  }

  function copyOrDownloadSignature(dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `signature-${Date.now()}.png`;
    a.click();
    showToast('Signature downloaded as transparent PNG!', 'success');
  }

  /* ========================================================
     QUICK SIGN PAD (STANDALONE SIGNATURE DOWNLOADER)
     ======================================================== */

  document.getElementById('quick-sign-btn')?.addEventListener('click', () => {
    quickSignModal.classList.remove('hidden');
    quickSignModal.classList.add('flex');
    if (quickPad) {
      setTimeout(() => {
        quickPad.resize();
        quickPad.clear();
      }, 50);
    }
  });

  document.getElementById('close-quick-sign-btn')?.addEventListener('click', () => {
    quickSignModal.classList.add('hidden');
    quickSignModal.classList.remove('flex');
  });

  document.getElementById('quick-clear-btn')?.addEventListener('click', () => quickPad?.clear());
  document.getElementById('quick-undo-btn')?.addEventListener('click', () => quickPad?.undo());

  document.getElementById('quick-download-png-btn')?.addEventListener('click', () => {
    if (quickPad.isEmpty()) {
      showToast('Please draw your signature first', 'error');
      return;
    }
    const dataUrl = quickPad.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `my-signature-${Date.now()}.png`;
    a.click();
    showToast('Downloaded transparent PNG!', 'success');
  });

  document.getElementById('quick-copy-clip-btn')?.addEventListener('click', async () => {
    if (quickPad.isEmpty()) {
      showToast('Please draw your signature first', 'error');
      return;
    }
    const trimmed = quickPad.getTrimmedCanvas();
    if (trimmed && navigator.clipboard && window.ClipboardItem) {
      try {
        trimmed.toBlob(async (blob) => {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('Copied signature to clipboard!', 'success');
        });
      } catch (err) {
        showToast('Clipboard copy failed. Use Download PNG instead.', 'error');
      }
    } else {
      showToast('Clipboard image copy not supported in this browser', 'error');
    }
  });

  /* ========================================================
     TOOLBAR TOOLS (Date, Name, Stamp, Text)
     ======================================================== */

  // Signature placement button
  document.getElementById('tool-signature-btn')?.addEventListener('click', () => {
    openSignatureModal('signature');
  });

  // Initials button
  document.getElementById('tool-initials-btn')?.addEventListener('click', () => {
    openSignatureModal('initials');
  });

  // Date tool
  document.getElementById('tool-date-btn')?.addEventListener('click', () => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    addElementToPage('date', today, { width: 0.22, height: 0.035 });
  });

  // Full Name tool
  document.getElementById('tool-name-btn')?.addEventListener('click', () => {
    const name = prompt('Enter signer full name:', state.userName) || state.userName;
    if (name) {
      state.userName = name;
      localStorage.setItem('e_sig_user_name', name);
      addElementToPage('name', name, { width: 0.26, height: 0.038, isBold: true });
    }
  });

  // Custom Text tool
  document.getElementById('tool-text-btn')?.addEventListener('click', () => {
    const text = prompt('Enter custom text or title:', 'Approved & Agreed');
    if (text) {
      addElementToPage('text', text, { width: 0.28, height: 0.038 });
    }
  });

  // Approved Seal Badge tool
  document.getElementById('tool-seal-btn')?.addEventListener('click', () => {
    const sealCanvas = document.createElement('canvas');
    sealCanvas.width = 300;
    sealCanvas.height = 100;
    const ctx = sealCanvas.getContext('2d');

    // Draw seal
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 288, 88);

    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, 276, 76);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIGITALLY APPROVED', 150, 45);

    ctx.font = '600 12px Inter, sans-serif';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillText(`VERIFIED • ${dateStr}`, 150, 68);

    const sealUrl = sealCanvas.toDataURL('image/png');
    addElementToPage('seal', sealUrl, { width: 0.22, height: 0.075 });
  });

  /* ========================================================
     NAVIGATION & ZOOM HANDLERS
     ======================================================== */

  prevPageBtn?.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderCurrentPage();
      renderThumbnails();
    }
  });

  nextPageBtn?.addEventListener('click', () => {
    if (state.currentPage < state.currentDoc.numPages) {
      state.currentPage++;
      renderCurrentPage();
      renderThumbnails();
    }
  });

  zoomInBtn?.addEventListener('click', () => {
    if (state.zoom < 2.0) {
      state.zoom = +(state.zoom + 0.15).toFixed(2);
      zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
      renderCurrentPage();
    }
  });

  zoomOutBtn?.addEventListener('click', () => {
    if (state.zoom > 0.6) {
      state.zoom = +(state.zoom - 0.15).toFixed(2);
      zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
      renderCurrentPage();
    }
  });

  zoomFitBtn?.addEventListener('click', () => {
    state.zoom = 1.0;
    zoomLevelText.textContent = '100%';
    renderCurrentPage();
  });

  /* ========================================================
     FILE DROPZONE & SAMPLE TEMPLATES
     ======================================================== */

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  // Drag and drop to dropzone
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file) handleFileUpload(file);
    });
  }

  // Template cards
  document.querySelectorAll('.template-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateId = btn.dataset.template;
      loadTemplate(templateId);
    });
  });

  /* ========================================================
     DOCUMENT EXPORT WORKFLOW
     ======================================================== */

  document.getElementById('export-modal-trigger')?.addEventListener('click', () => {
    if (!state.currentDoc) {
      showToast('Please open a document first', 'error');
      return;
    }
    document.getElementById('export-doc-name').textContent = state.currentDoc.name;
    document.getElementById('export-elements-count').textContent = `${state.placedElements.length} signature(s) & field(s) placed`;
    exportModal.classList.remove('hidden');
    exportModal.classList.add('flex');
  });

  document.getElementById('close-export-modal-btn')?.addEventListener('click', () => {
    exportModal.classList.add('hidden');
    exportModal.classList.remove('flex');
  });

  // Download PDF
  document.getElementById('download-signed-pdf-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('download-signed-pdf-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating PDF...`;

    try {
      const includeAudit = document.getElementById('export-audit-trail-chk')?.checked || false;
      let sha256 = '';
      if (state.currentDoc.rawBytes) {
        sha256 = await PDFHandler.computeSHA256(state.currentDoc.rawBytes);
      }

      const pdfBytes = await pdfHandler.exportSignedPDF(state.placedElements, {
        documentName: state.currentDoc.name,
        signerName: state.userName,
        pagesImages: state.currentDoc.pagesImages,
        includeAuditTrail: includeAudit,
        sha256Hash: sha256
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Signed_${docTitleInput.value || 'document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');
      showToast('Signed PDF exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // Download Current Page as High-Res Image
  document.getElementById('download-page-img-btn')?.addEventListener('click', () => {
    // Bake placed elements onto canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = docCanvas.width;
    tempCanvas.height = docCanvas.height;
    const ctx = tempCanvas.getContext('2d');

    // Draw document canvas first
    ctx.drawImage(docCanvas, 0, 0);

    // Draw placed elements for this page
    const currentElements = state.placedElements.filter(el => el.page === state.currentPage);
    const promises = currentElements.map(el => {
      return new Promise((resolve) => {
        const x = el.x * tempCanvas.width;
        const y = el.y * tempCanvas.height;
        const w = el.width * tempCanvas.width;
        const h = el.height * tempCanvas.height;

        if (el.content && el.content.startsWith('data:image')) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, x, y, w, h);
            resolve();
          };
          img.src = el.content;
        } else {
          ctx.fillStyle = el.color || '#1e293b';
          const fontSize = Math.max(14, Math.round(h * 0.7));
          ctx.font = `${el.isBold ? 'bold' : '500'} ${fontSize}px Inter, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(el.content || '', x + 6, y + h / 2);
          resolve();
        }
      });
    });

    Promise.all(promises).then(() => {
      const imgUrl = tempCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `${docTitleInput.value || 'page'}-page-${state.currentPage}.png`;
      a.click();
      showToast('Page downloaded as image!', 'success');
    });
  });

  // Clear all button
  document.getElementById('clear-all-doc-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear this document and start over?')) {
      state.currentDoc = null;
      state.placedElements = [];
      state.selectedElementId = null;
      state.currentPage = 1;
      emptyState.classList.remove('hidden');
      docWorkspace.classList.add('hidden');
      document.getElementById('doc-header-actions').classList.add('hidden');
      document.getElementById('tools-sidebar').classList.add('opacity-50', 'pointer-events-none');
      showToast('Workspace reset', 'info');
    }
  });

  // Modal close buttons
  document.getElementById('close-sig-modal-btn')?.addEventListener('click', closeSignatureModal);

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
});
