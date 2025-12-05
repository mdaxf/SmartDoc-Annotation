
import React from 'react';
import ReactDOM from 'react-dom/client';
import SmartDocApp from './App';
import { SmartDocConfig, SmartDocEvents, SmartDocHandle, SmartDocInstance } from './types';
import './index.css'; // Ensure CSS is bundled with the library

// Export types for consumers
export * from './types';

/**
 * Initializes and renders the SmartDoc Annotator library.
 * 
 * @param containerId The ID of the DOM element to render the app into.
 * @param config Configuration options for the SmartDoc instance.
 * @param events Callback functions for SmartDoc events.
 * @returns An instance control object to manage the app programmatically.
 */
export const createSmartDoc = (
  containerId: string, 
  config: SmartDocConfig = {}, 
  events: SmartDocEvents = {}
): SmartDocInstance => {
  const rootElement = document.getElementById(containerId);
  if (!rootElement) {
    console.error(`SmartDoc: Could not find element with id '${containerId}'`);
    // Return a dummy implementation to avoid crashes
    return { 
        unmount: () => {},
        loadDocument: async () => {},
        getAnnotations: () => [],
        setAnnotations: () => {},
        clearAnnotations: () => {}
    };
  }

  const root = ReactDOM.createRoot(rootElement);
  const ref = React.createRef<SmartDocHandle>();
  
  root.render(
    React.createElement(SmartDocApp, {
      ...config,
      events,
      ref
    })
  );

  return {
    unmount: () => root.unmount(),
    loadDocument: async (source) => {
        if (ref.current) {
            await ref.current.loadDocument(source);
        } else {
            console.warn("SmartDoc: App not yet ready.");
        }
    },
    getAnnotations: () => ref.current ? ref.current.getAnnotations() : [],
    setAnnotations: (anns) => ref.current?.setAnnotations(anns),
    clearAnnotations: () => ref.current?.clearAnnotations()
  };
};

// Global attachment for CDN/Script tag usage (Distributed Mode)
if (typeof window !== 'undefined') {
  (window as any).SmartDoc = {
    create: createSmartDoc
  };
}
