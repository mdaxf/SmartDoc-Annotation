
import React, { useEffect, useRef, useState } from 'react';
import { PageData } from '../types';
import { Loader2, FileText, Image as ImageIcon } from 'lucide-react';

interface ThumbnailPanelProps {
  pages: PageData[];
  activePageIndex: number;
  onPageSelect: (index: number) => void;
}

const ThumbnailRenderer: React.FC<{ page: PageData; index: number }> = ({ page, index }) => {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const generateThumbnail = async () => {
      setLoading(true);
      try {
        if (page.imageSrc) {
          // Render a downscaled thumbnail for images to ensure consistent preview size
          const img = new Image();
          // Attempt to handle CORS if images are from external URLs
          img.crossOrigin = "Anonymous"; 
          img.src = page.imageSrc;
          
          await new Promise((resolve, reject) => {
             img.onload = resolve;
             img.onerror = () => {
                 // Fallback if CORS fails: use original src but do NOT draw to canvas (avoid tainted canvas error)
                 // Just display the image directly via src if possible, but we can't do that inside 
                 // the canvas generation logic below.
                 // So we set thumbSrc directly to the imageSrc and return.
                 if (active) setThumbSrc(page.imageSrc!);
                 resolve(null);
             };
          });

          // If we already set fallback in onerror or component unmounted, skip canvas gen
          if (!active) return;
          if (thumbSrc) { setLoading(false); return; } // Handled by onerror fallback
          if (img.width === 0) return; // Load failed

          try {
              // Create canvas for thumbnail
              const canvas = document.createElement('canvas');
              const targetWidth = 150; // Thumbnail resolution width
              const scale = targetWidth / img.naturalWidth;
              canvas.width = targetWidth;
              canvas.height = img.naturalHeight * scale;
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // This line will throw SecurityError if image loaded with crossOrigin="Anonymous" failed 
                // and we fell back to a tainted image, BUT here we are in the "success" path of the CORS load.
                // If CORS load failed, we hit onerror above.
                if (active) setThumbSrc(canvas.toDataURL());
              }
          } catch (securityErr) {
              // If canvas is tainted (shouldn't happen in this block if crossOrigin worked, but good for safety)
              console.warn("Thumbnail generation blocked by CORS", securityErr);
              if (active) setThumbSrc(page.imageSrc!);
          }

        } else if (page.pdfPage) {
          // Render a small thumbnail of the PDF page
          const viewport = page.pdfPage.getViewport({ scale: 0.3 }); 
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          
          if (context) {
            await page.pdfPage.render({ canvasContext: context, viewport }).promise;
            if (active) setThumbSrc(canvas.toDataURL());
          }
        }
      } catch (e) {
        console.error("Thumb error", e);
        // Fallback
        if (active && page.imageSrc) setThumbSrc(page.imageSrc);
      } finally {
        if(active) setLoading(false);
      }
    };
    
    generateThumbnail();
    return () => { active = false; };
  }, [page]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden relative">
      {loading ? (
        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-gray-500" />
      ) : thumbSrc ? (
        <img 
            src={thumbSrc} 
            alt={`Page ${index + 1}`} 
            className="object-contain" 
            style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div className="flex flex-col items-center text-gray-500">
           {page.pdfPage ? <FileText className="w-4 h-4 md:w-8 md:h-8" /> : <ImageIcon className="w-4 h-4 md:w-8 md:h-8" />}
        </div>
      )}
    </div>
  );
};

const ThumbnailPanel: React.FC<ThumbnailPanelProps> = ({ pages, activePageIndex, onPageSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the thumbnail list to keep active page in view
  useEffect(() => {
    if (containerRef.current) {
        const activeEl = containerRef.current.children[activePageIndex] as HTMLElement;
        if (activeEl) {
            const container = containerRef.current;
            const elTop = activeEl.offsetTop;
            const elBottom = elTop + activeEl.clientHeight;
            const cTop = container.scrollTop;
            const cBottom = cTop + container.clientHeight;

            if (elTop < cTop || elBottom > cBottom) {
                 activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
  }, [activePageIndex]);

  return (
    <div className="w-[10vw] md:w-32 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col shadow-inner z-10 overflow-hidden transition-all duration-300">
      <div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 text-center shrink-0 hidden md:block">
        Pages
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-1 md:p-2 space-y-2 md:space-y-3 scrollbar-thin">
        {pages.map((page, index) => (
          <div 
            key={page.id}
            onClick={() => onPageSelect(index)}
            className={`relative group cursor-pointer flex flex-col items-center gap-1 transition-all ${
                activePageIndex === index ? 'opacity-100' : 'opacity-60 hover:opacity-90'
            }`}
          >
             {/* Thumbnail Container: Use dynamic aspect ratio to frame the preview correctly */}
             <div 
                className={`w-full rounded-sm md:rounded-md border md:border-2 overflow-hidden bg-gray-800 flex items-center justify-center ${
                    activePageIndex === index ? 'border-blue-500 shadow-lg ring-1 md:ring-2 ring-blue-500/20' : 'border-gray-700'
                }`}
                style={{ 
                    // Fallback to standard 3:4 if dimensions missing, otherwise match page
                    aspectRatio: page.width && page.height ? `${page.width}/${page.height}` : '3/4' 
                }}
             >
                 <ThumbnailRenderer page={page} index={index} />
             </div>
             <span className={`text-[8px] md:text-[10px] font-mono leading-none ${activePageIndex === index ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                 {index + 1}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThumbnailPanel;
