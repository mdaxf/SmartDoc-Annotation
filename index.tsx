
import { createSmartDoc } from './smartDoc';
import './index.css'; // Import local styles

// Example Usage of the Library
const init = () => {
    // You can also pass initial annotations here
    // const existingAnnotations = [...];

    createSmartDoc('root', {
        // Configuration Options
        // documentSrc: 'https://example.com/sample.pdf', // Auto-load URL
        // hideLoadFileBtn: true,
        // hideSaveJsonBtn: false,
        
        // Custom Severity Colors (Optional)
        /*
        severityOptions: {
            1: '#34d399', // Custom Green
            2: '#facc15', // Custom Yellow
            3: '#fb923c', // Custom Orange
            4: '#f87171'  // Custom Red
        },
        */

        // Custom Reason Codes (Optional)
        /*
        reasonCodeOptions: ['Crack', 'Dent', 'Scratch', 'Missing Part'],
        */

        // Style Overrides (Optional)
        styleConfig: {
            toolbar: { backgroundColor: '#1f2937' } // Example dark gray
        }
    }, {
        // Event Callbacks
        onDocumentReady: () => console.log('SmartDoc: Document Loaded'),
        onAnnotationsReady: () => console.log('SmartDoc: Annotations Loaded'),
        onAnnotationAdd: (ann) => console.log('SmartDoc: Added', ann),
        onAnnotationUpdate: (ann) => console.log('SmartDoc: Updated', ann),
        onAnnotationDelete: (id) => console.log('SmartDoc: Deleted', id),
        onClearAnnotations: () => console.log('SmartDoc: Cleared'),
        onSave: (data) => {
            console.log('SmartDoc: Save Triggered via Callback', data);
            alert(`Saved ${data.annotations.length} annotations for file: ${data.file}. Check console for full data object.`);
        }
    });
};

init();
