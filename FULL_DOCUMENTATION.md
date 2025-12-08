
# SmartDoc Annotator - Complete Documentation

**SmartDoc** is a robust, framework-agnostic JavaScript library designed for embedding rich document annotation capabilities into web applications. It supports Images and PDFs, offering tools for drawing, shape manipulation, text, and AI-powered auto-annotation.

---

## 🌟 Key Features

*   **Multi-Format Support**: Native handling of Images (`JPEG`, `PNG`, `WEBP`) and **PDFs** (Multi-page support via PDF.js).
*   **Operating Modes**:
    *   `full`: Complete access to all tools and features.
    *   `edit`: Modify attributes (Status, Comments, Severity) of existing annotations, but cannot draw new ones.
    *   `viewonly`: Read-only mode. No interaction with annotations other than viewing.
*   **Rich Annotation Tools**:
    *   Arrow, Pen (Freehand), Rectangle, Circle, Text.
    *   Hand Tool (Pan/Drag) and Zoom (0.1x - 5.0x).
*   **Integrated Camera**: Built-in camera capture with digital pan/zoom controls.
*   **Metadata & Workflow**:
    *   Customizable **Severity** levels with color coding.
    *   Configurable **Reason Codes** and **Status** workflow.
    *   Rich commenting system.
*   **AI Integration**: Auto-detect defects or objects using Google Gemini Vision (requires API Key).
*   **Responsive UI**:
    *   Collapsible **Thumbnails** panel.
    *   **Bottom** or **Sidebar** toolbar layouts.
    *   Mobile-optimized drawer navigation.

---

## 📦 Installation & Setup

### 1. For Legacy / Vanilla JS Apps

To use SmartDoc in a non-module environment (like a standard HTML page or legacy CMS), you must build the bundle first.

1.  **Build the Library**:
    ```bash
    npm install
    npm run build
    ```
2.  **Include Files**:
    Copy the files from the `distribute/` folder to your project.
    ```html
    <!-- 1. Styles -->
    <link rel="stylesheet" href="distribute/style.css">
    
    <!-- 2. Logic -->
    <script src="distribute/smart-doc.bundle.js"></script>
    ```

### 2. For Modern Frameworks (React, Vue, etc.)

If you are working within this source repository, you can import the components directly.

```typescript
import { createSmartDoc } from './smartDoc';
// OR for React specific usage
import SmartDocApp from './App';
```

---

## 🚀 Quick Start

### Vanilla JS Implementation

```html
<div id="my-annotator" style="height: 800px; width: 100%;"></div>

<script>
  window.onload = function() {
    const instance = window.SmartDoc.create('my-annotator', {
      documentSrc: 'https://example.com/document.pdf',
      mode: 'full',
      defaultLayout: 'bottom',
      showThumbnails: true
    }, {
      onSave: (data) => console.log('Saved:', data)
    });
  };
</script>
```

### React Implementation

```tsx
import React, { useRef } from 'react';
import SmartDocApp from './App';
import { SmartDocHandle } from './types';

const MyEditor = () => {
  const docRef = useRef<SmartDocHandle>(null);

  return (
    <div style={{ height: '100vh' }}>
      <SmartDocApp 
        ref={docRef}
        documentSrc={['image1.jpg', 'image2.jpg']}
        mode="full"
        events={{
            onPhotoAdd: (base64) => console.log('Photo captured!')
        }}
      />
    </div>
  );
};
```

---

## ⚙️ Configuration Options

Passed as the second argument to `create` (Vanilla) or as props (React).

### General Settings

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `documentSrc` | `string` \| `string[]` | `null` | URL(s) to load immediately. Can be an image, PDF, or array of strings. |
| `mode` | `'full'` \| `'edit'` \| `'viewonly'` | `'full'` | Controls user permissions (see "Modes" section). |
| `initialAnnotations` | `Annotation[]` | `[]` | Array of existing annotations to render. |

### UI & Layout

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `defaultLayout` | `'sidebar'` \| `'bottom'` | `'bottom'` | Initial position of the toolbar. |
| `defaultTool` | `ToolType` | `'arrow'` | Tool selected on load (`select`, `hand`, `pen`, etc). |
| `showThumbnails` | `boolean` | `true` | Whether the thumbnail sidebar is open by default. |
| `hideCameraBtn` | `boolean` | `false` | Hides the camera/webcam button in the header. |
| `hideLoadFileBtn` | `boolean` | `false` | Hides the "Upload" button in the toolbar. |
| `hideSaveJsonBtn` | `boolean` | `false` | Hides the "Download JSON" button. |

### Workflow Customization

| Option | Type | Description |
| :--- | :--- | :--- |
| `severityOptions` | `Record<number, string>` | Map severity IDs (1-4) to hex colors. <br>Ex: `{ 1: '#00ff00', 4: '#ff0000' }` |
| `reasonCodeOptions` | `string[]` | List of options for the "Reason Code" dropdown. |
| `statusOptions` | `string[]` | List of options for the Status dropdown (e.g., "Open", "Fixed"). |

### Styling (`styleConfig`)

Pass a `styleConfig` object to override CSS styles for specific containers.

```javascript
styleConfig: {
  container: { border: '1px solid red' },
  toolbar: { backgroundColor: '#000' },
  workspace: { backgroundColor: '#f3f4f6' }
}
```

---

## 📡 Event Callbacks

Passed as the third argument to `create` (Vanilla) or `events` prop (React).

| Event | Arguments | Description |
| :--- | :--- | :--- |
| `onDocumentReady` | `()` | Fired when the document (PDF/Image) is fully rendered. |
| `onAnnotationsReady` | `()` | Fired when initial annotations are painted. |
| `onAnnotationAdd` | `(ann: Annotation)` | Fired when a user creates a new annotation. |
| `onAnnotationUpdate` | `(ann: Annotation)` | Fired when an annotation is modified (moved, text change, status change). |
| `onAnnotationDelete` | `(id: string)` | Fired when an annotation is deleted. |
| `onPhotoAdd` | `(base64: string)` | **New:** Fired when a photo is taken via the internal camera. Returns Data URL. |
| `onSave` | `(data: SaveObject)` | Overrides the default "Download JSON" behavior. Returns full state. |

---

## 🎮 Imperative API (Control Methods)

You can control the library programmatically using the returned instance (Vanilla) or `ref` (React).

### `loadDocument(source)`
Loads a new file or set of files.
*   **source**: Can be a URL string, a File object, or an array of mixed URLs/Files.
```javascript
instance.loadDocument(['page1.jpg', 'page2.jpg']);
```

### `getAnnotations()`
Returns the current array of all annotations.
```javascript
const anns = instance.getAnnotations();
console.log(anns);
```

### `setAnnotations(annotations)`
Replaces the current annotation state. Useful for restoring state from a database.
```javascript
instance.setAnnotations([{ id: '1', type: 'rect', ... }]);
```

### `clearAnnotations()`
Removes all annotations from the canvas.

---

## 🔍 Understanding Modes

1.  **Full Mode (`mode: 'full'`)**
    *   **Toolbar:** Shows all tools (Pen, Shapes, Text).
    *   **Interaction:** Can draw, move, resize, edit properties, delete.
    *   **Camera:** Enabled (unless hidden via config).

2.  **Edit Mode (`mode: 'edit'`)**
    *   **Toolbar:** Hides drawing tools. Only shows Select and Hand.
    *   **Interaction:** Cannot draw new shapes. Can click existing shapes to change Severity, Status, Comments, or Delete.
    *   **Use Case:** A manager reviewing defects found by an inspector.

3.  **View Only (`mode: 'viewonly'`)**
    *   **Toolbar:** Minimal (Zoom, Fullscreen only).
    *   **Interaction:** Read-only. No selection editing, no dragging.
    *   **Use Case:** Generating a read-only report for a customer.

---

## 🤖 AI Integration (Gemini)

The "Auto-Annotate" button uses Google Gemini Vision.
*   **Requirement:** You must set `process.env.API_KEY` in your build environment to a valid Google GenAI API Key.
*   **Behavior:** It sends the current page image to Gemini, asking it to detect objects/defects, and returns bounding boxes which are automatically added to the canvas.

---

## ⌨️ Keyboard Shortcuts

*   **Delete / Backspace**: Delete selected annotation.
*   **Ctrl + Scroll**: Zoom In / Zoom Out.
*   **Drag (Hand Tool)**: Pan around the document.
