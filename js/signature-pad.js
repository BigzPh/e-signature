/**
 * Signature Pad & Ink Engine
 * Handles smooth bezier drawing, typed cursive signature generation,
 * image upload background cleaning, and signature trimming/storage.
 */

class SignaturePadEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.options = {
      color: options.color || '#0f2b48',
      strokeWidth: options.strokeWidth || 2.5,
      smoothing: options.smoothing !== undefined ? options.smoothing : true,
      eraser: false,
      ...options
    };

    this.points = [];
    this.isDrawing = false;
    this.history = [];
    this.redoStack = [];
    this.dpr = window.devicePixelRatio || 1;

    this.initCanvasSize();
    this.bindEvents();
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 260;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.saveState();
  }

  resize() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.canvas, 0, 0);

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 260;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.drawImage(tempCanvas, 0, 0, width, height);
  }

  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        time: Date.now()
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.isDrawing = true;
      this.points = [getPos(e)];
      this.redoStack = [];
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pt = getPos(e);
      this.points.push(pt);

      if (this.points.length > 2) {
        this.drawCurve();
      }
    });

    const stopDrawing = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.points.length === 1) {
        // Draw single dot
        const pt = this.points[0];
        this.ctx.fillStyle = this.options.eraser ? 'rgba(0,0,0,1)' : this.options.color;
        this.ctx.globalCompositeOperation = this.options.eraser ? 'destination-out' : 'source-over';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, this.options.strokeWidth, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.points = [];
      this.saveState();
    };

    this.canvas.addEventListener('pointerup', stopDrawing);
    this.canvas.addEventListener('pointercancel', stopDrawing);
    this.canvas.addEventListener('pointerleave', stopDrawing);
  }

  drawCurve() {
    const pts = this.points;
    const len = pts.length;
    const p1 = pts[len - 2];
    const p2 = pts[len - 1];
    const p0 = pts[len - 3] || p1;

    // Calculate speed for variable stroke width simulation
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const time = Math.max(p2.time - p1.time, 1);
    const speed = dist / time;

    // Smooth stroke width: faster = slightly thinner, slower = richer ink
    const targetWidth = Math.max(
      this.options.strokeWidth * 0.65,
      Math.min(this.options.strokeWidth * 1.35, this.options.strokeWidth * (1.2 - speed * 0.2))
    );

    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    this.ctx.globalCompositeOperation = this.options.eraser ? 'destination-out' : 'source-over';
    this.ctx.strokeStyle = this.options.eraser ? 'rgba(0,0,0,1)' : this.options.color;
    this.ctx.lineWidth = targetWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(mid1.x, mid1.y);
    this.ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    this.ctx.stroke();
  }

  saveState() {
    // Maximum 25 undo steps
    if (this.history.length >= 25) {
      this.history.shift();
    }
    const state = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(state);
  }

  undo() {
    if (this.history.length > 1) {
      const current = this.history.pop();
      this.redoStack.push(current);
      const previous = this.history[this.history.length - 1];
      this.ctx.putImageData(previous, 0, 0);
      return true;
    }
    return false;
  }

  redo() {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop();
      this.history.push(next);
      this.ctx.putImageData(next, 0, 0);
      return true;
    }
    return false;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    this.history = [];
    this.redoStack = [];
    this.saveState();
  }

  isEmpty() {
    const pixelBuffer = new Uint32Array(
      this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  }

  setColor(color) {
    this.options.color = color;
    this.options.eraser = false;
  }

  setStrokeWidth(width) {
    this.options.strokeWidth = width;
  }

  setEraser(enabled = true) {
    this.options.eraser = enabled;
  }

  /**
   * Trims transparent pixels surrounding the signature
   * Returns a canvas cropped exactly to the inked signature area with padding
   */
  getTrimmedCanvas(padding = 10) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) {
      return null;
    }

    // Apply padding (scaled by dpr)
    const pad = padding * this.dpr;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width, maxX + pad);
    maxY = Math.min(height, maxY + pad);

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const trimmedCtx = trimmedCanvas.getContext('2d');

    trimmedCtx.drawImage(
      this.canvas,
      minX, minY, cropW, cropH,
      0, 0, cropW, cropH
    );

    return trimmedCanvas;
  }

  toDataURL(type = 'image/png') {
    const trimmed = this.getTrimmedCanvas();
    return trimmed ? trimmed.toDataURL(type) : null;
  }
}

/**
 * Cursive Text-to-Signature generator
 */
class TypeSignatureGenerator {
  static generate({
    text,
    fontFamily = 'Caveat',
    color = '#0f2b48',
    fontSize = 64,
    padding = 20
  }) {
    if (!text || text.trim() === '') return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Preliminary size
    canvas.width = 1200;
    canvas.height = 300;

    ctx.font = `${fontSize}px "${fontFamily}", cursive, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.5);

    // Resize properly
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.font = `${fontSize}px "${fontFamily}", cursive, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);

    return canvas.toDataURL('image/png');
  }
}

/**
 * Image Upload & Background Transparency Cleaner
 */
class UploadSignatureProcessor {
  /**
   * Removes white/light paper background and boosts signature ink contrast
   */
  static processImage(imageElement, options = {}) {
    const threshold = options.threshold !== undefined ? options.threshold : 215;
    const inkColor = options.inkColor || null; // Optional ink replacement
    const enhanceContrast = options.enhanceContrast !== undefined ? options.enhanceContrast : true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    ctx.drawImage(imageElement, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      // Determine transparency based on brightness threshold
      if (brightness > threshold) {
        data[i + 3] = 0; // Make background transparent
      } else {
        // Pixel is ink
        hasInk = true;
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Smooth alpha edge falloff
        const alphaFactor = Math.max(0, Math.min(1, (threshold - brightness) / 35));
        data[i + 3] = Math.round(alphaFactor * 255);

        if (inkColor) {
          data[i] = inkColor.r;
          data[i + 1] = inkColor.g;
          data[i + 2] = inkColor.b;
        } else if (enhanceContrast) {
          // Darken ink for crispness
          data[i] = Math.max(0, r - 30);
          data[i + 1] = Math.max(0, g - 30);
          data[i + 2] = Math.max(0, b - 30);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Auto-crop to ink boundaries
    if (hasInk && maxX > minX && maxY > minY) {
      const pad = 12;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(canvas.width, maxX + pad);
      maxY = Math.min(canvas.height, maxY + pad);

      const cropW = maxX - minX;
      const cropH = maxY - minY;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      return croppedCanvas.toDataURL('image/png');
    }

    return canvas.toDataURL('image/png');
  }
}

/**
 * Saved Signatures LocalStorage Manager
 */
class SavedSignaturesManager {
  static STORAGE_KEY = 'e_signature_saved_items_v1';

  static getSignatures() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Could not read saved signatures:', e);
      return [];
    }
  }

  static saveSignature(dataUrl, type = 'signature', title = 'My Signature') {
    try {
      const list = this.getSignatures();
      const newItem = {
        id: 'sig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        dataUrl,
        type,
        title,
        createdAt: new Date().toISOString()
      };
      // Keep up to 10 signatures
      list.unshift(newItem);
      if (list.length > 10) list.pop();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      return newItem;
    } catch (e) {
      console.warn('Could not save signature:', e);
      return null;
    }
  }

  static deleteSignature(id) {
    try {
      const list = this.getSignatures().filter(item => item.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Global exports
window.SignaturePadEngine = SignaturePadEngine;
window.TypeSignatureGenerator = TypeSignatureGenerator;
window.UploadSignatureProcessor = UploadSignatureProcessor;
window.SavedSignaturesManager = SavedSignaturesManager;
