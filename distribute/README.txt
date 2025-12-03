
How to generate the SmartDoc Bundle
===================================

To use SmartDoc in a legacy application or Vanilla JS environment, you need to build the single-file bundle.

1. Install Dependencies
   --------------------
   Ensure you have Node.js installed, then run:
   
   npm install

2. Build the Library
   -----------------
   Run the build script configured in vite.config.ts:
   
   npm run build

3. Output
   ------
   The build process will generate:
   - distribute/smart-doc.bundle.js (The UMD bundle for <script> tags)
   - distribute/style.css (If any CSS extraction occurs)

4. Usage
   -----
   Copy `distribute/smart-doc.bundle.js` to your project and include it:
   
   <script src="smart-doc.bundle.js"></script>
   <script>
       window.SmartDoc.create('root', { ... });
   </script>
