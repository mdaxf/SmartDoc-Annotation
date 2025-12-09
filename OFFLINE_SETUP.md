
# Offline / Air-Gapped Environment Setup

To use SmartDoc in an environment without internet access (e.g., secure internal networks), you cannot rely on CDNs. You must download specific dependencies and host them alongside your application.

## 1. The Main Application Bundle

Run the build command on a machine with internet access:
```bash
npm install
npm run build
```
This generates `distribute/smart-doc.bundle.js` and `distribute/style.css`. Copy these to your offline server.

## 2. MANDATORY: The PDF Worker

**You must download the PDF Worker file manually.**
The PDF parser runs in a separate thread and cannot be bundled into the main JavaScript file.

1.  **Download this exact version:**
    [pdf.worker.min.js (v3.11.174)](https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js)
    *(Right-click -> Save Link As...)*

2.  **Place it in your project:**
    Put this file in your `public` folder, `assets` folder, or wherever you host static files.
    Example path: `/assets/js/pdf.worker.min.js`

3.  **Configure SmartDoc:**
    You must tell SmartDoc where to find this file using `pdfWorkerSrc`.

## 3. Optional: 3D Model Viewer

If you need to view 3D files (`.glb`, `.gltf`) offline:
1.  **Download:** [model-viewer.min.js](https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js)
2.  **Place it:** `/assets/js/model-viewer.min.js`

## 4. Initialization Code

Here is how you initialize the library in your offline `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
    <script src="smart-doc.bundle.js"></script>
</head>
<body>
    <div id="app-root" style="height: 100vh;"></div>

    <script>
        window.SmartDoc.create('app-root', {
            // ... regular config ...
            
            // CRITICAL FOR OFFLINE PDF SUPPORT:
            // Point this to the file you downloaded in Step 2.
            pdfWorkerSrc: '/assets/js/pdf.worker.min.js',

            // Optional: For 3D support
            modelViewerSrc: '/assets/js/model-viewer.min.js'
        });
    </script>
</body>
</html>
```

## 5. Troubleshooting

**"Setting up fake worker failed" or "PDF.js worker not found"**
*   This means the path provided to `pdfWorkerSrc` is incorrect, or the file is missing.
*   Check your browser's Network tab. Look for a failed request (404) for `pdf.worker.min.js`.
*   Ensure you downloaded the **.js** version (v3.11.174), not a newer `.mjs` version, as older servers often mishandle `.mjs` MIME types.
