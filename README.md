# ✍️ SignFlow — Modern Client-Side E-Signature Suite

> A fast, elegant, and 100% private e-signature web application. Sign PDFs and images, create smooth digital signatures, or generate audit-certified agreements directly in your browser. No server uploads, no logins, no fees.

---

## ✨ Features

- **🔒 100% Client-Side & Private**: Your documents and signatures never leave your device. All rendering, vector stamping, and cryptographic hashing take place securely in the browser.
- **✍️ Advanced Drawing Engine**:
  - Velocity-adaptive stroke smoothing (fountain pen ink dynamics).
  - High-DPI Retina canvas rendering.
  - Ink color swatches: Dark Navy, Deep Charcoal, Royal Blue, Crimson Red, Forest Green.
  - Multi-level Undo/Redo, eraser tool, and stroke width toggles.
  - Auto-trimming transparent margins for clean placements.
- **🖋️ Cursive Type-to-Signature**:
  - Type your name or initials and preview live in 6 curated handwriting styles (*Caveat, Dancing Script, Great Vibes, Sacramento, Alex Brush, Pacifico*).
- **📷 Photo/Scan Signature Cleaner**:
  - Upload a snapshot of your physical signature on paper.
  - Real-time transparency filter removes paper background while preserving rich ink strokes.
- **📄 Full PDF & Image Document Support**:
  - Drag & drop PDF documents or images (PNG, JPG, WEBP).
  - Crisp multi-page PDF rendering powered by Mozilla PDF.js.
  - Multi-page thumbnail navigation & smooth zoom controls (50% to 200%, Fit-to-screen).
- **🎯 Drag & Drop Stamping Canvas**:
  - Free positioning and corner resizing for all placed elements.
  - Place: **Signatures**, **Initials**, **Today's Date**, **Signer Name**, **Custom Notes/Titles**, and **Approved Seal Badges**.
  - Duplicate, delete, and adjust elements per page.
- **📜 Tamper-Evident Audit Trail & Certificate**:
  - Generates a formal completion certificate page (DocuSign/PandaDoc style).
  - Includes SHA-256 cryptographic document hash, UTC timestamps, and verified digital seals.
- **⚡ Instant Sample Agreements**:
  - One-click testing with built-in templates:
    1. *Mutual Non-Disclosure Agreement (NDA)*
    2. *Freelance Services Contract (2 Pages)*
    3. *Milestone Acceptance & Handover Certificate*
- **📱 Touch & Stylus Friendly**:
  - Full support for iPad, iPhone, Android, touchscreens, and Apple Pencil via PointerEvents API.

---

## 🚀 Quick Start / Local Setup

No build steps or complex toolchains required! Simply run with any static server or open `index.html` directly in your browser.

### Option 1: Direct File
Double-click `index.html` in your file explorer to open it in your browser.

### Option 2: Python Local Server
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

### Option 3: Node / NPX
```bash
npx serve .
```

---

## 🌐 Deploy to GitHub Pages (1-Click)

1. Push this repository to GitHub:
   ```bash
   git push -u origin master
   ```
2. In your repository on GitHub, navigate to:
   **Settings** > **Pages**
3. Under **Branch**, select `master` (or `main`) and root `/` folder, then click **Save**.
4. Your e-signature website will be live in seconds at:
   `https://<your-username>.github.io/e-signature/`

---

## 🛠️ Architecture & Tech Stack

```text
e-signature/
├── index.html            # Main single-page interface & accessible modals
├── css/
│   └── style.css         # Custom animations, checkerboard patterns & handles
├── js/
│   ├── signature-pad.js  # Ink drawing engine, bezier interpolation & cleaner
│   ├── templates.js      # Built-in contract templates generator (NDA, ICA, Cert)
│   ├── pdf-handler.js    # PDF.js page renderer & PDF-Lib element embedding
│   └── app.js            # Workspace coordinator & state management
├── README.md             # Documentation
└── .gitignore            # Git ignore rules
```

- **Styling**: Tailwind CSS (via CDN) + Modern UI Design System
- **PDF Engine**: Mozilla [PDF.js](https://mozilla.github.io/pdf.js/)
- **PDF Stamping & Export**: [PDF-Lib](https://pdf-lib.js.org/)
- **Typography**: Google Fonts (*Inter*, *Caveat*, *Dancing Script*, *Great Vibes*, *Sacramento*, *Alex Brush*, *Pacifico*)

---

## 📄 License

MIT License — Feel free to use, modify, and distribute for personal or commercial projects.
