
# Using SmartDoc in Legacy / Vanilla JS Applications

This guide describes how to integrate the **SmartDoc Annotator** into non-React applications (e.g., jQuery, plain HTML/JS, ASP.NET MVC, PHP, etc.).

## 1. Prerequisites & Installation

Since legacy apps typically don't use modern bundlers, you must use the pre-built bundle file.

1.  **Build the Library** (Requires Node.js installed locally):
    ```bash
    npm install
    npm run build
    ```
    This creates `distribute/smart-doc.bundle.js`.

2.  **Copy Files**:
    Copy `distribute/smart-doc.bundle.js` into your project's static assets folder (e.g., `/js/`, `/assets/`, or `/public/`).

3.  **Include in HTML**:
    ```html
    <!-- Main Library -->
    <script src="/path/to/smart-doc.bundle.js"></script>
    
    <!-- Optional: Helper libraries for parsing DOCX files if needed -->
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.1.15/dist/docx-preview.min.js"></script>
    ```

## 2. Initialization

The library exposes a global object `window.SmartDoc`.

**Syntax:**
```javascript
const instance = window.SmartDoc.create(containerId, configuration, events);
```

**Example:**
```html
<div id="annotator-div" style="height: 600px; width: 100%;"></div>

<script>
    const config = {
        documentSrc: 'https://example.com/file.pdf',
        mode: 'full'
    };
    
    const events = {
        onSave: (data) => console.log('Saved:', data)
    };

    // Initialize
    const app = window.SmartDoc.create('annotator-div', config, events);
</script>
```

---

## 3. Configuration Object

Pass this object as the **2nd argument** to `create`.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `documentSrc` | `string` or `string[]` | `null` | URL(s) of Images or PDF to load on startup. |
| `mode` | `'full'`, `'edit'`, `'viewonly'` | `'full'` | **Full**: Draw/Edit. **Edit**: Modify attributes only. **View**: Read-only. |
| `initialAnnotations` | `Array` | `[]` | JSON array of saved annotations to render. |
| `severityOptions` | `Object` | `{1..4}` | Map IDs (1-4) to hex colors. e.g. `{1: '#0f0', 2: '#f00'}`. |
| `reasonCodeOptions` | `string[]` | `[...]` | List of options for the "Reason" dropdown. |
| `statusOptions` | `string[]` | `[...]` | List of options for the "Status" dropdown. |
| `defaultLayout` | `'sidebar'`, `'bottom'` | `'bottom'` | Position of the main toolbar. |
| `hideLoadFileBtn` | `boolean` | `false` | Hide the upload button. |
| `hideSaveJsonBtn` | `boolean` | `false` | Hide the save/download button. |
| `hideCameraBtn` | `boolean` | `false` | Hide the webcam capture button. |
| `showThumbnails` | `boolean` | `true` | Show the page thumbnail sidebar on load. |
| `styleConfig` | `Object` | `{}` | CSS overrides. See Style Config below. |

### Style Config Example
```javascript
styleConfig: {
    container: { border: '2px solid red' },
    workspace: { backgroundColor: '#1e293b' },
    toolbar: { backgroundColor: '#0f172a' }
}
```

---

## 4. Event Callbacks

Pass this object as the **3rd argument** to `create`.

| Event | Arguments | Description |
| :--- | :--- | :--- |
| `onSmartDocReady` | `()` | Fired when the React app mounts successfully. |
| `onDocumentReady` | `()` | Fired when images/PDFs are downloaded and rendered. |
| `onAnnotationAdd` | `(ann)` | Fired when a new shape is drawn. |
| `onAnnotationUpdate` | `(ann)` | Fired when a shape is moved, resized, or attributes changed. |
| `onAnnotationDelete` | `(id)` | Fired when a shape is deleted. |
| `onSave` | `(data)` | Intercepts the "Save" button. `data` contains `{ file: string, annotations: [] }`. |
| `onPhotoAdd` | `({id, dataUrl})` | Fired when a photo is taken via the camera tool. |

---

## 5. API Methods (Instance Control)

The `create` function returns an instance object that allows you to control the app from outside.

### `loadDocument(source)`
Loads new content without reloading the page.
```javascript
// Load single
app.loadDocument('image.jpg');

// Load multiple (creates pages)
app.loadDocument(['page1.jpg', 'page2.jpg']);
```

### `getAnnotations()`
Returns the current state of annotations as an array.
```javascript
const currentData = app.getAnnotations();
// JSON.stringify(currentData) to save to DB
```

### `setAnnotations(data)`
Wipes current annotations and loads new ones.
```javascript
app.setAnnotations(savedJsonData);
```

### `clearAnnotations()`
Removes all annotations from the canvas.

### `unmount()`
Destroys the React application and cleans up the DOM.

---

## 6. Troubleshooting

### "JSZip is not defined"
If loading DOCX files fails, ensure you added the `jszip` and `docx-preview` script tags in your HTML head (see Section 1).

### "Worker invalid" (PDF.js)
The library is configured to load the PDF worker from a CDN (`https://aistudiocdn.com/...`) to ensure it works without complex build steps. Ensure your CSP (Content Security Policy) allows scripts from `aistudiocdn.com` or `jsdelivr.net`.

### CORS Issues
If loading images from another domain, ensure the server sends `Access-Control-Allow-Origin: *` headers. The canvas cannot export data (save images) if "tainted" by non-CORS images.
