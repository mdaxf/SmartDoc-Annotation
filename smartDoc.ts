
import React from 'react';
import ReactDOM from 'react-dom/client';
import SmartDocApp from './App';
import { SmartDocConfig, SmartDocEvents } from './types';

// Export types for consumers
export * from './types';

/**
 * Initializes and renders the SmartDoc Annotator library.
 * 
 * @param containerId The ID of the DOM element to render the app into.
 * @param config Configuration options for the SmartDoc instance.
 * @param events Callback functions for SmartDoc events.
 */
export const createSmartDoc = (
  containerId: string, 
  config: SmartDocConfig = {}, 
  events: SmartDocEvents = {}
) => {
  const rootElement = document.getElementById(containerId);
  if (!rootElement) {
    console.error(`SmartDoc: Could not find element with id '${containerId}'`);
    return { unmount: () => {} };
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    React.createElement(SmartDocApp, {
      ...config,
      events
    })
  );

  return {
    unmount: () => root.unmount()
  };
};

// Global attachment for CDN/Script tag usage (Distributed Mode)
if (typeof window !== 'undefined') {
  (window as any).SmartDoc = {
    create: createSmartDoc
  };
}
