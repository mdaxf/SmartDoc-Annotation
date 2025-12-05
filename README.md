
# SmartDoc Annotator Library

A powerful, customizable JavaScript library for document annotation (Images & PDF). It supports rich drawing tools, shape manipulation, deep zoom, and AI-powered auto-annotation using Google Gemini Vision.

Designed for integration into existing web applications (React, Angular, Vue, or Vanilla JS).

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

## ⚙️ Configuration API

The `createSmartDoc(containerId, config, events)` function accepts a configuration object:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `documentSrc` | `string` | `null` | Auto-load a URL (Image or PDF) on init. |
| `initialAnnotations` | `Annotation[]` | `[]` | Array of existing annotations to render. |
| `severityOptions` | `Object` | `{1..4}` | Map of Severity Level (Int) to Hex Color Code. |
| `reasonCodeOptions` | `string[]` | `['Defect 1'...]` | List of options for the "Reason Code" dropdown. |
| `statusOptions` | `string[]` | `['New', ...]` | List of options for the "Status" dropdown. |
| `hideLoadFileBtn` | `boolean` | `false` | Hide the built-in file upload button. |
| `hideSaveJsonBtn` | `boolean` | `false` | Hide the built-in "Save JSON" button. |
| `styleConfig` | `Object` | `{}` | CSS overrides for `container`, `toolbar`, `workspace`. |

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

---

## 🤖 AI Configuration

To enable the "Auto-Annotate" feature:
1. Ensure `process.env.API_KEY` is set in the build environment (pointing to a Google Gemini API Key).
2. The `analyzeImageForAnnotations` service handles the API communication.

---

## ⌨️ Shortcuts

*   **Scroll**: Pan vertically (if zoomed out) or natural scroll.
*   **Ctrl + Scroll**: Zoom In / Zoom Out.
*   **Drag (Hand Tool)**: Pan the document canvas.
*   **Delete / Backspace**: Delete selected annotation.
*   **Click Annotation**: Reveal context menu (Edit/Delete).
