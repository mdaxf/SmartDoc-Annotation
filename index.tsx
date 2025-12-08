
import { createSmartDoc } from './smartDoc';
import './index.css'; // Import local styles

// Example Usage of the Library
const init = () => {
    // You can also pass initial annotations here
    // const existingAnnotations = [...];

    createSmartDoc('root', {
        // Configuration Options
        
        // Auto-load Array of URLs (Images)
     /*   documentSrc: [
            'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80', // Car 1
            'https://images.unsplash.com/photo-1580273916550-e323be2ebdd9?auto=format&fit=crop&w=800&q=80', // Car 2
            'https://images.unsplash.com/photo-1494905998402-395d579af97d?auto=format&fit=crop&w=800&q=80'  // Car 3
        ],  */

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
        onPhotoAdd: (data) => console.log('SmartDoc: Photo Taken', data),
        onUpload: (data) => console.log('SmartDoc: File Uploaded', data),
        onSave: (data) => {
            console.log('SmartDoc: Save Triggered via Callback', data);
            alert(`Saved ${data.annotations.length} annotations for file: ${data.file}. Check console for full data object.`);
        }
    });
};

init();
