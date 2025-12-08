
import React, { useRef, useState } from 'react';
import SmartDocApp from '../App'; 
import { SmartDocHandle, Annotation } from '../types';

const ReactIntegrationExample: React.FC = () => {
  const docRef = useRef<SmartDocHandle>(null);
  const [lastEvent, setLastEvent] = useState<string>('Ready');

  // Example: Loading multiple files via config prop
  const documents = [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', // Dealership
      'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800&q=80'  // Interior
  ];

  const handleLoadMultipleImperative = () => {
    if (docRef.current) {
        setLastEvent('Loading 3 new images...');
        // Pass array of strings to imperative handle
        docRef.current.loadDocument([
            'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&w=800&q=80'
        ]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">React Multi-Doc Demo</h1>
          <p className="text-sm text-gray-500">Event: <span className="text-blue-600 font-mono">{lastEvent}</span></p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleLoadMultipleImperative}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            >
                Load 3 Car Images (Imperative)
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative border-t border-gray-300">
        
        <SmartDocApp
            ref={docRef}
            // Passing array of URLs on init
            documentSrc={documents}
            
            // Pre-fill
            initialAnnotations={[
                {
                    id: 'init-1', documentId: '0', type: 'text', page: 1, 
                    x: 50, y: 50, text: 'Dealership Entrance', 
                    fontSize: 30, color: '#ffffff', strokeWidth: 1
                }
            ]}

            events={{
                onDocumentReady: () => setLastEvent('Multi-doc loaded'),
                onAnnotationAdd: (ann) => setLastEvent(`Added on Page ${ann.page}`),
            }}
        />

      </div>
    </div>
  );
};

export default ReactIntegrationExample;
