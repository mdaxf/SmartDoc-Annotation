
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { 
    'process.env': {} 
  },
  build: {
    // Output to 'distribute' folder as requested
    outDir: 'distribute',
    lib: {
      entry: path.resolve('smartDoc.ts'),
      name: 'SmartDoc', // The global variable name (window.SmartDoc)
      fileName: (format) => `smart-doc.bundle.${format === 'umd' ? 'js' : 'mjs'}`,
      formats: ['umd'] // UMD is best for legacy <script> tags
    },
    rollupOptions: {
      // Ensure EVERYTHING is bundled. Empty array means nothing is external.
      external: [], 
      output: {
        globals: {}
      }
    },
    // Minify output
    minify: 'esbuild',
  }
});
