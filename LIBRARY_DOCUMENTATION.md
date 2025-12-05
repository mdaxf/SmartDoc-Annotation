
# SmartDoc Annotator - Integration Documentation

SmartDoc is a framework-agnostic library for annotating images and PDF documents. It supports drawing tools (pen, shapes, arrows), text annotations, zooming, panning, and AI-powered auto-annotation via Google Gemini.

## 📦 Installation

### Option A: Script Tag (Legacy / Vanilla JS)

Include the stylesheet and the bundle file in your HTML.

```html
<link rel="stylesheet" href="path/to/distribute/style.css">
<script src="path/to/distribute/smart-doc.bundle.js"></script>
```

### Option B: NPM / ES Modules (React, Vue, etc.)

*Assuming the library is published or imported locally:*

```typescript
import SmartDocApp, { SmartDocHandle } from './SmartDoc'; // Adjust path
import './index.css'; // Import styles
```

---

## 🚀 Initialization

### 1. Vanilla JS
Use the global `window.SmartDoc` object.

```javascript
const instance = window.SmartDoc.create('container-id', config, events);
```

### 2. React
Use the React Component with a `ref`.

```tsx
<SmartDocApp 
    ref={docRef}
    {...config} 
    events={events} 
/>
```

---

## ⚙️ Configuration Object (`config`)

Passed as the second argument in Vanilla JS, or as props in React.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `documentSrc` | `string \| string[]` | `null` | URL or Array of URLs to load immediately (Image or PDF). |
| `initialAnnotations` | `Annotation[]` | `[]` | Array of existing annotation objects to render. |
| `severityOptions` | `Record<number, string>` | *(Default Set)* | Map of severity IDs (1-N) to Hex color codes. |
| `reasonCodeOptions` | `string[]` | *(Default Set)* | Array of strings for the "Reason Code" dropdown. |
| `statusOptions` | `string[]` | `['New', 'Closed', ...]` | Array of status workflow states. |
| `hideLoadFileBtn` | `boolean` | `false` | Hides the "Load File" button in the toolbar. |
| `hideSaveJsonBtn` | `boolean` | `false` | Hides the "Save JSON" button. |
| `defaultLayout` | `'sidebar' \| 'bottom'` | `'sidebar'` | Sets the initial toolbar position. |
| `styleConfig` | `Object` | `{}` | CSS style overrides. See below. |

### `styleConfig` Structure
```javascript
styleConfig: {
  container: { height: '800px' }, // The outer wrapper
  toolbar: { backgroundColor: '#111827' }, // Custom toolbar color
  workspace: { backgroundColor: '#f3f4f6' } // The canvas background
}
```

---

## 📡 Events (`events`)

Passed as the third argument in Vanilla JS, or `events` prop in React.

| Event Name | Signature | Description |
| :--- | :--- | :--- |
| `onDocumentReady` | `() => void` | Fired when the document/image is fully rendered. |
| `onAnnotationsReady` | `() => void` | Fired when initial annotations are painted. |
| `onAnnotationAdd` | `(ann: Annotation) => void` | Fired when a user creates a new annotation. |
| `onAnnotationUpdate` | `(ann: Annotation) => void` | Fired when an annotation is moved, resized, or text changed. |
| `onAnnotationDelete` | `(id: string) => void` | Fired when an annotation is removed. |
| `onSave` | `(data: SaveData) => void` | **Overrides** the default save behavior. Returns the full JSON object. |

---

## 🎮 Programmatic Control (`SmartDocHandle`)

The library returns an instance handle (Vanilla JS) or exposes it via `ref` (React) to allow external control.

```typescript
interface SmartDocHandle {
  /** Loads a document from URL, File, or Array of URLs/Files */
  loadDocument: (source: string | File | (string | File)[]) => Promise<void>;
  
  /** Returns array of current annotations */
  getAnnotations: () => Annotation[];
  
  /** Overwrites current annotations programmatically */
  setAnnotations: (annotations: Annotation[]) => void;
  
  /** Clears all annotations */
  clearAnnotations: () => void;
}
```

---

## 📚 Examples

### Loading Multiple Images (Vanilla JS)
You can load multiple images at once by passing an array of strings to `documentSrc`. They will be rendered as separate pages.

```javascript
window.SmartDoc.create('annotator', {
    documentSrc: [
        'https://example.com/car-front.jpg',
        'https://example.com/car-rear.jpg',
        'https://example.com/car-side.jpg'
    ],
    initialAnnotations: [
        // Page 1 is the first image
        { id: 'a1', type: 'rect', page: 1, x: 100, y: 100, width: 50, height: 50, ... },
        // Page 2 is the second image
        { id: 'a2', type: 'circle', page: 2, x: 200, y: 200, radius: 30, ... }
    ]
});
```
