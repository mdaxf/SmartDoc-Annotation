
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { 
    // Mocks process.env to avoid ReferenceError in browser environments
    // Specific keys like process.env.API_KEY are replaced by Vite during build if defined in .env
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
      // Ensure external dependencies are bundled OR externalized depending on need.
      // For a "batteries-included" bundle for legacy apps, we usually bundle everything 
      // EXCEPT maybe React itself if the host app provides it.
      // However, for a truly standalone drop-in, we bundle React too.
      external: [], 
      output: {
        globals: {
          // If we were externalizing react, we'd define global mapping here
          // react: 'React',
          // 'react-dom': 'ReactDOM'
        }
      }
    },
    // Minify output
    minify: 'esbuild',
  }
});
