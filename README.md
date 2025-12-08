
# SmartDoc Annotator Library

A powerful, customizable JavaScript library for document annotation (Images & PDF). It supports rich drawing tools, shape manipulation, deep zoom, and AI-powered auto-annotation using Google Gemini Vision.

Designed for integration into existing web applications (React, Angular, Vue, or Vanilla JS).

---

## 📚 Documentation

*   **[React / Modern Usage](./FULL_DOCUMENTATION.md)**: For using the library as an NPM module.
*   **[Legacy / Vanilla JS Usage](./LEGACY_USAGE.md)**: For using the library via `<script>` tag in HTML/jQuery apps.

---

## 🚀 Quick Start (Running Examples)

**Note:** This library uses ES Modules and TypeScript, which cannot be run directly from the file system (`file://`). You must use a local development server.

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start Development Server**
    ```bash
    npm run dev
    ```

3.  **View Examples**
    Open your browser to the URL provided (usually `http://localhost:5173`) and navigate to:
    *   `/example.html` (The "Kitchen Sink" Legacy Demo)
    *   `/examples/vanilla-pdf-multipage.html`

---

## 🏗️ Building for Production (Legacy JS)

To use this library in a standard or legacy JavaScript application:

1.  **Run the Build Command**:
    ```bash
    npm run build
    ```
2.  **Locate the Output**:
    The build will generate a file at `distribute/smart-doc.bundle.js`.
3.  **Include in your HTML**:
    ```html
    <script src="distribute/smart-doc.bundle.js"></script>
    <script>
       // window.SmartDoc is now available globally
       window.SmartDoc.create('container-id', { ... });
    </script>
    ```

---

## 🚀 Features

*   **Multi-Format Support**: Load Images (`.jpg`, `.png`, `.webp`) and Documents (`.pdf`) natively.
*   **Rich Annotation Tools**: Pen, Rectangle, Circle, Text, Arrow, and Hand (Pan) tools.
*   **Context Actions**: Click any annotation to reveal quick **Edit** and **Delete** buttons directly on the canvas.
*   **PDF Pagination**: Full support for multi-page PDF navigation and annotation.
*   **Zoom & View**: 
    *   `Ctrl + Scroll` to zoom (0.1x to 5.0x).
    *   **Fullscreen Mode** for immersive editing.
    *   **Fit to Screen** and Hand tool for easy navigation.
*   **Rich Metadata**: 
    *   **Severity**: Visual color coding (1-4) with customizable colors.
    *   **Reason Codes**: Configurable dropdown lists for defect categorization.
    *   **Status Workflow**: Track lifecycle (New, Closed, Hold, etc.).
    *   **Comments**: Add detailed text comments to any markup.
*   **Smart AI Analysis**: Built-in integration with **Google Gemini API** to auto-detect objects and suggest annotations.
*   **Customizable UI**: Hide buttons, override colors, and style the container to match your brand.
*   **Event Driven**: Full lifecycle hooks (`onAnnotationAdd`, `onUpdate`, `onDelete`) for syncing with your backend.

---

## 📦 Installation & Usage

### 1. Distributed Mode (Vanilla JS / Legacy Apps)

Include the library script (and dependencies if not bundled) in your HTML.

```html
<!-- Load the library -->
<script src="path/to/smart-doc.bundle.js"></script>

<!-- Container -->
<div id="annotator-container" style="height: 600px;"></div>

<script>
  window.SmartDoc.create('annotator-container', {
      // Config
      severityOptions: { 1: 'green', 4: 'red' },
      hideSaveJsonBtn: true
  }, {
      // Events
      onAnnotationAdd: (ann) => console.log('New Annotation:', ann)
  });
</script>
```

### 2. Module Mode (React/ESM)

```javascript
import { createSmartDoc } from 'smart-doc-lib';

useEffect(() => {
    const app = createSmartDoc('root', {
        documentSrc: 'https://example.com/doc.pdf'
    });

    return () => app.unmount();
}, []);
```

---

## ⚡ Events API

Pass an `events` object as the third argument to listen for user actions.

| Event | Callback Signature | Description |
| :--- | :--- | :--- |
| `onDocumentReady` | `() => void` | Fired when an image or PDF page finishes rendering. |
| `onAnnotationAdd` | `(ann) => void` | Fired when a new annotation is created and confirmed. |
| `onAnnotationUpdate` | `(ann) => void` | Fired when an annotation is moved, resized, or edited. |
| `onAnnotationDelete` | `(id) => void` | Fired when an annotation is deleted. |
| `onClearAnnotations` | `() => void` | Fired when the "Clear" button is pressed. |
