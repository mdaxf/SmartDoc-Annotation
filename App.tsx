
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useLayoutEffect } from 'react';
import AnnotationLayer from './components/AnnotationLayer';
import Toolbar from './components/Toolbar';
import CameraModal from './components/CameraModal';
import ThumbnailPanel from './components/ThumbnailPanel';
import { Annotation, ToolType, SmartDocProps, TextAnnotation, SmartDocHandle, PageData, DocumentMeta } from './types';
import { analyzeImageForAnnotations } from './services/geminiService';
import { parsePptx } from './utils/pptx';
import { Info, MessageSquare, Trash2, X, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, ListChecks, Activity, LayoutTemplate, PanelRightClose, PanelRightOpen, MapPin, Type, Camera, Menu, FileText, Box, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { REASON_CODES, SEVERITY_COLORS, STATUS_OPTIONS } from './constants';
import * as pdfjsLib from 'pdfjs-dist';

// --- Internal Page Renderer (Optimized) ---
const PageRenderer: React.FC<{
  page: PageData;
  scale: number;
  tool: ToolType;
  strokeWidth: number;
  fontSize: number;
  annotations: Annotation[];
  onAnnotationsChange: (anns: Annotation[]) => void;
  onAnnotationCreated: (ann: Annotation) => void;
  onAnnotationUpdate: (ann: Annotation) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  severity: number;
  reasonCode: string;
  isVisible: boolean;
  currentColor: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  readOnly?: boolean;
  onDimensionsUpdate?: (id: string, w: number, h: number) => void;
  modelViewerSrc?: string;
}> = React.memo(({
  page,
  scale,
  tool,
  strokeWidth,
  fontSize,
  annotations,
  onAnnotationsChange,
  onAnnotationCreated,
  onAnnotationUpdate,
  onSelect,
  selectedId,
  severity,
  reasonCode,
  currentColor,
  onDelete,
  onEdit,
  readOnly,
  onDimensionsUpdate,
  modelViewerSrc
}) => {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const [currentContentBlob, setCurrentContentBlob] = useState<Blob | string | null>(null);

  // Monitor DOCX height changes safely
  useEffect(() => {
      if (!page.docxData || !onDimensionsUpdate) return;

      const checkHeight = () => {
          if (docxContainerRef.current) {
              const scrollHeight = docxContainerRef.current.scrollHeight;
              const currentHeight = page.height;
              if (scrollHeight > currentHeight + 50) {
                  onDimensionsUpdate(page.id, page.width, scrollHeight + 100);
              }
          }
      };

      const timer = setTimeout(checkHeight, 500);
      let observer: ResizeObserver | null = null;
      if (docxContainerRef.current) {
          observer = new ResizeObserver(() => {
             if(timer) clearTimeout(timer);
             setTimeout(checkHeight, 100);
          });
          observer.observe(docxContainerRef.current);
      }

      return () => {
          clearTimeout(timer);
          observer?.disconnect();
      };
  }, [page.docxData, page.height, page.id, page.width, onDimensionsUpdate]);

  useEffect(() => {
    let active = true;
    let loadTimeout: any;

    const render = async () => {
      // 1. Image Handling
      if (page.imageSrc) {
          if (bgImage && bgImage.src === page.imageSrc) return;
          
          setIsRendering(true);
          setLoadError(null);

          loadTimeout = setTimeout(() => {
             if (active && !bgImage) {
                 console.warn("Image load timed out:", page.imageSrc);
                 setIsRendering(false);
                 setLoadError("Timeout loading image.");
             }
          }, 15000);
          
          const loadImage = (src: string, useCors: boolean) => {
              const img = new Image();
              // Enable CORS to allow cross-origin images (e.g. from Unsplash) to be drawn and exported
              if (useCors) img.crossOrigin = "Anonymous";
              img.src = src;
              
              img.onload = () => {
                  if (active) {
                      clearTimeout(loadTimeout);
                      if (img.naturalWidth > 0) {
                          setBgImage(img);
                          setIsRendering(false);
                      } else {
                          if (useCors) loadImage(src, false);
                          else { setIsRendering(false); setLoadError("Image loaded but has 0 dimensions."); }
                      }
                  }
              };

              img.onerror = (e) => {
                  if (!active) return;
                  if (useCors) {
                      console.warn("CORS load failed, attempting non-CORS fallback...", src);
                      loadImage(src, false);
                  } else {
                      console.error("Final image load failure", e);
                      clearTimeout(loadTimeout);
                      setLoadError("Failed to load image.");
                      setIsRendering(false);
                  }
              };
          };

          loadImage(page.imageSrc, true);
      } 
      // 2. PDF Handling
      else if (page.pdfPage) {
           if (bgImage) return; 
           setIsRendering(true);
           setLoadError(null);
           try {
               const viewport = page.pdfPage.getViewport({ scale: 3.0 }); 
               const canvas = document.createElement('canvas');
               canvas.width = viewport.width;
               canvas.height = viewport.height;
               const context = canvas.getContext('2d');
               if (context) {
                 await page.pdfPage.render({ canvasContext: context, viewport } as any).promise;
                 const imgData = canvas.toDataURL('image/png');
                 const img = new Image();
                 img.src = imgData;
                 if (active) {
                     setBgImage(img);
                     setIsRendering(false);
                 }
               }
           } catch (e) { 
               console.error(e);
               if (active) {
                   setLoadError("PDF Rendering Error");
                   setIsRendering(false);
               }
           }
      }
      // 3. DOCX Handling
      else if (page.docxData && docxContainerRef.current) {
          if (currentContentBlob === page.docxData) return;
          setIsRendering(true);
          setCurrentContentBlob(page.docxData);
          
          try {
              const docx = (window as any).docx;
              if (docx) {
                  await docx.renderAsync(page.docxData, docxContainerRef.current, null, {
                      className: 'docx-content',
                      inWrapper: false, 
                      ignoreWidth: false, 
                      ignoreHeight: false,
                      experimental: true 
                  });
              }
          } catch (e) {
              console.error("Docx render error", e);
              if (active) setLoadError("Document parsing error");
          } finally {
              if (active) setIsRendering(false);
          }
      }
      // 4. 3D Model
      else if (page.modelSrc && modelContainerRef.current) {
          if(currentContentBlob === page.modelSrc) return;
          setCurrentContentBlob(page.modelSrc);
      }
    };

    render();

    return () => { 
        active = false; 
        if (loadTimeout) clearTimeout(loadTimeout);
    };
  }, [page]);

  // Use configured source or default to CDN for online compatibility
  const viewerSrc = modelViewerSrc || "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";

  return (
    <div 
      className="relative bg-white shadow-xl m-auto transition-transform origin-top group shrink-0"
      style={{ 
        width: page.width * scale, 
        height: page.height * scale,
        willChange: 'transform' // Hardware accel for zoom
      }}
      id={`page-${page.id}`}
    >
      {/* Page Number */}
      <div className="absolute -left-12 top-0 text-gray-500 font-mono text-sm hidden xl:block">
        Page {page.pageNumber}
      </div>

      {isRendering && !bgImage && !docxContainerRef.current?.hasChildNodes() && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 z-10">
           <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500 z-10 border-2 border-dashed border-gray-300 m-4 rounded-lg p-4 text-center">
              <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
              <p className="font-medium text-red-400 mb-1">Failed to load content</p>
              <p className="text-xs text-gray-400 max-w-xs">{loadError}</p>
          </div>
      )}
      
      {/* Content Layers */}
      
      {/* Image / PDF Background (Rendered in DOM for performance) */}
      {bgImage && (
          <div className="absolute inset-0 z-0 pointer-events-none select-none">
              <img 
                  src={bgImage.src} 
                  className="w-full h-full object-contain" 
                  alt="Page Background" 
              />
          </div>
      )}

      {/* DOCX */}
      {page.docxData && (
          <>
            <style>{`
                .docx-wrapper { isolation: isolate; }
                .docx-wrapper * { box-sizing: content-box; }
                .docx-content > section, .docx-content > article {
                    background: white;
                    margin-bottom: 40px;
                    padding: 40px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
            `}</style>
            <div 
                ref={docxContainerRef} 
                className="absolute inset-0 overflow-visible bg-gray-100 text-black p-8 docx-wrapper z-0 origin-top-left" 
                style={{ 
                    backgroundColor: '#f3f4f6',
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top left',
                    width: `${(1/scale) * 100}%`,
                    height: `${(1/scale) * 100}%`
                }} 
            />
          </>
      )}
      
      {/* Text/HTML (Used for PPTX slides) */}
      {page.textContent && (
          <div 
            className="absolute inset-0 overflow-auto bg-white text-black p-8 z-0" 
            style={{ 
                color: 'black',
                width: '100%',
                height: '100%'
            }}
          >
              <div 
                dangerouslySetInnerHTML={{ __html: page.textContent }} 
                style={{
                     transform: `scale(${scale})`,
                     transformOrigin: 'top left',
                     width: `${(1/scale) * 100}%`
                }}
              />
          </div>
      )}

      {/* 3D Model */}
      {page.modelSrc && (
          <div ref={modelContainerRef} className="absolute inset-0 bg-gray-100 flex items-center justify-center z-0" style={{ width: '100%', height: '100%' }}>
              <iframe 
                srcDoc={`
                    <html>
                    <head>
                        <script type="module" src="${viewerSrc}"></script>
                        <script>
                            window.onerror = function() {
                                if(!window.customElements.get('model-viewer')) {
                                    var s = document.createElement('script');
                                    s.type='module';
                                    s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
                                    document.head.appendChild(s);
                                }
                            }
                        </script>
                        <style>body { margin: 0; overflow: hidden; background-color: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; }</style>
                    </head>
                    <body>
                        <model-viewer src="${page.modelSrc}" camera-controls auto-rotate ar style="width:100%;height:100%;" shadow-intensity="1"></model-viewer>
                    </body>
                    </html>
                `}
                className="w-full h-full border-none pointer-events-auto"
                title="3D Viewer"
              />
          </div>
      )}

      {/* Annotation Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="w-full h-full pointer-events-auto">
            <AnnotationLayer 
                width={page.width}
                height={page.height}
                documentId={page.documentId}
                tool={tool}
                strokeWidth={strokeWidth}
                fontSize={fontSize}
                annotations={annotations}
                onAnnotationsChange={onAnnotationsChange}
                onAnnotationCreated={onAnnotationCreated}
                onAnnotationUpdate={onAnnotationUpdate}
                onSelect={onSelect}
                selectedId={selectedId}
                scale={scale}
                page={page.pageNumber}
                severity={severity}
                reasonCode={reasonCode}
                currentColor={currentColor}
                onDelete={onDelete}
                onEdit={onEdit}
                readOnly={readOnly}
            />
        </div>
      </div>
    </div>
  );
});

// ... CommentModal remains same ... 
const CommentModal: React.FC<any> = ({ isOpen, onClose, onSave, onDelete, initialData, severityOptions, reasonCodeOptions, statusOptions, readOnly }) => {
    // ... same code ...
    const [formData, setFormData] = useState(initialData);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const severityLevels = Object.keys(severityOptions).map(Number).sort((a: number, b: number) => a - b);
  
    useEffect(() => {
      if (isOpen) {
          setFormData(initialData);
          setTimeout(() => {
             if (!readOnly) {
                commentInputRef.current?.focus();
                if (initialData.type === 'text') {
                    commentInputRef.current?.select();
                }
             }
          }, 100);
      }
    }, [isOpen, initialData, readOnly]);
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
        <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Annotation Details
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-5">
              
              <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Severity
                  </label>
                  <div className="flex gap-2 flex-wrap">
                      {severityLevels.map((s: number) => (
                          <button
                              key={s}
                              type="button"
                              disabled={readOnly}
                              onClick={() => setFormData((prev:any) => ({ ...prev, severity: s }))}
                              className={`flex-1 py-2 rounded-md text-sm font-bold border transition-all ${
                                  formData.severity === s 
                                  ? 'border-white shadow-lg' 
                                  : 'border-transparent opacity-50 hover:opacity-100'
                              } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                              style={{ 
                                  backgroundColor: severityOptions[s],
                                  color: s === 2 ? 'black' : 'white'
                              }}
                          >
                              {s}
                          </button>
                      ))}
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <ListChecks className="w-3 h-3" />
                          Reason Code
                      </label>
                      <select 
                          value={formData.reasonCode}
                          disabled={readOnly}
                          onChange={(e) => setFormData((prev:any) => ({ ...prev, reasonCode: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg block p-2 disabled:opacity-70"
                      >
                          {reasonCodeOptions.map((code: string) => (
                              <option key={code} value={code}>{code}</option>
                          ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          Status
                      </label>
                      <select 
                          value={formData.status}
                          disabled={readOnly && formData.status !== 'New'}
                          onChange={(e) => setFormData((prev:any) => ({ ...prev, status: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg block p-2 disabled:opacity-70"
                      >
                          {statusOptions.map((status: string) => (
                              <option key={status} value={status}>{status}</option>
                          ))}
                      </select>
                  </div>
              </div>
              
              <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Comment
                  </label>
                  <textarea
                      ref={commentInputRef}
                      disabled={readOnly}
                      className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 resize-none placeholder-gray-600 text-sm disabled:opacity-70"
                      placeholder={initialData.type === 'text' ? "Enter text content..." : "Enter your comment here..."}
                      value={initialData.type === 'text' ? formData.text : formData.comment}
                      onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev:any) => ({ 
                              ...prev, 
                              [initialData.type === 'text' ? 'text' : 'comment']: val 
                          }))
                      }}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !readOnly) {
                              e.preventDefault();
                              onSave(formData);
                          }
                      }}
                  />
              </div>
              
            <div className="flex items-center justify-between pt-2 border-t border-gray-700 mt-4">
               <div>
                  {!initialData.isNew && onDelete && !readOnly && (
                      <button 
                        type="button"
                        onClick={() => {
                             if(window.confirm("Are you sure you want to delete this annotation?")) onDelete();
                        }} 
                        className="px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2"
                      >
                          <Trash2 className="w-4 h-4" />
                          Delete
                      </button>
                  )}
               </div>
               <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
                        {readOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button 
                            type="button"
                            onClick={() => onSave(formData)} 
                            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Save
                        </button>
                    )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

const SmartDocApp = forwardRef<SmartDocHandle, SmartDocProps>(({
    documentSrc,
    documentIds, // New
    initialAnnotations = [],
    severityOptions = SEVERITY_COLORS,
    reasonCodeOptions = REASON_CODES,
    statusOptions = STATUS_OPTIONS,
    hideLoadFileBtn,
    hideSaveJsonBtn,
    hideLoadJsonBtn,
    defaultLayout = 'bottom',
    navPosition = 'top', // New
    styleConfig,
    events,
    mode = 'full',
    defaultTool = 'arrow',
    hideCameraBtn = false,
    showThumbnails: initialShowThumbnails = true,
    pdfWorkerSrc, // Prop for PDF Worker
    modelViewerSrc, // Prop for 3D Viewer
}, ref) => {
  // --- State ---
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string>('');
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);

  // ... (Other state and refs remain identical) ...
  const pagesRef = useRef<PageData[]>(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const [tool, setTool] = useState<ToolType>(defaultTool); 
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [scale, setScale] = useState<number>(1);
  const [autoFit, setAutoFit] = useState<boolean>(true); 
  const [severity, setSeverity] = useState<number>(4); 
  const [reasonCode, setReasonCode] = useState<string>(reasonCodeOptions[0]);

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'bottom'>(defaultLayout);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(initialShowThumbnails);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  // Touch/Pinch Zoom State
  const touchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  const activeColor = severityOptions[severity] || severityOptions[4];

  const isViewOnly = mode === 'viewonly';
  const canDraw = mode === 'full';
  const canEdit = mode === 'full' || mode === 'edit';
  const layerReadOnly = isViewOnly; 
  const modalReadOnly = isViewOnly;

  // Filtered Data for View
  const visiblePages = pages.filter(p => p.documentId === currentDocumentId);
  const visibleAnnotations = annotations.filter(a => a.documentId === currentDocumentId);
  const currentDocumentMeta = documents.find(d => d.id === currentDocumentId);

  // Identify Active Page for Single-Page Rendering
  const currentPage = visiblePages[activePageIndex];

  // Resolve Model Viewer Source (Handles file:// protocol issue for 3D Viewer)
  let resolvedModelViewerSrc = modelViewerSrc || "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
     // If user provided a relative path while on file://, ignoring it to prevent CORS error
     if (!resolvedModelViewerSrc.startsWith('http')) {
        resolvedModelViewerSrc = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";
     }
  }

  // Set PDF Worker - KEY FIX FOR "About:Blank" and Relative Path errors
  useLayoutEffect(() => {
    // 1. Determine Source
    let src = pdfWorkerSrc;

    // EDGE CASE: If running via file:// protocol, relative paths to workers fail due to browser security (CORS/Module restrictions).
    // We force CDN usage in this specific case to ensure the demo works out-of-the-box, unless the user provided a blob/http url.
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        const isLocalPath = src && !src.startsWith('http') && !src.startsWith('blob:');
        if (!src || isLocalPath) {
             console.warn("SmartDoc: 'file://' protocol detected. Forcing CDN for PDF Worker to bypass browser worker security restrictions. To use local workers, serve this folder via HTTP (e.g., 'npm run dev' or 'python -m http.server').");
             src = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
        }
    }

    if (!src) {
        // Default to specific stable CDN version to match pdfjs-dist import
        src = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
    }

    // 2. Resolve to Absolute URL
    // This is critical because if this code runs in a blob/bundle, relative paths like "../libs/" 
    // will be resolved against "about:blank" or the blob URL, causing failure.
    try {
        if (src && !src.startsWith('http') && !src.startsWith('blob:') && typeof window !== 'undefined' && window.location) {
            src = new URL(src, window.location.href).toString();
        }
    } catch (e) {
        console.warn("SmartDoc: Could not resolve worker URL to absolute path", e);
    }

    // 3. Apply to GlobalWorkerOptions
    // Only update if changed to avoid unnecessary re-initialization warnings
    if (src && pdfjsLib.GlobalWorkerOptions.workerSrc !== src) {
        // console.debug("SmartDoc: Configuring PDF Worker:", src);
        pdfjsLib.GlobalWorkerOptions.workerSrc = src;
    }
  }, [pdfWorkerSrc]);

  // Define dimension update handler with useCallback to prevent infinite render loops
  const handleDimensionsUpdate = useCallback((id: string, w: number, h: number) => {
      setPages(prev => prev.map(p => {
          if (p.id === id) {
              // Threshold check (5px) to prevent jitter loops on dynamic content
              if (Math.abs(p.width - w) < 5 && Math.abs(p.height - h) < 5) return p;
              return { ...p, width: w, height: h };
          }
          return p;
      }));
  }, []);

  // Notify Ready - UPDATED TO INCLUDE ANNOTATIONS READY
  useEffect(() => {
      if (events?.onSmartDocReady) setTimeout(() => events.onSmartDocReady?.(), 0);
      
      // Fire annotations ready if initial annotations exist
      if (initialAnnotations.length > 0 && events?.onAnnotationsReady) {
          setTimeout(() => events.onAnnotationsReady?.(), 100);
      }
  }, []); // Only runs once on mount

  // Mobile Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Workspace Wheel Zoom Handler (Ctrl + Wheel)
  useEffect(() => {
      const workspace = workspaceRef.current;
      if (!workspace) return;

      const handleWheel = (e: WheelEvent) => {
          // Standard browser zoom shortcut is Ctrl+Wheel. We intercept this to zoom the workspace instead.
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              
              // Disable AutoFit on manual zoom interaction
              setAutoFit(false);

              // Use multiplicative zoom for smoother experience
              const zoomFactor = 0.1;
              setScale(prev => {
                  // e.deltaY > 0 means scrolling down (zoom out typically)
                  const newScale = e.deltaY > 0 
                      ? prev * (1 - zoomFactor) 
                      : prev * (1 + zoomFactor);
                  
                  // Allow scale down to 5% to fit large docs on small screens
                  return Math.min(5, Math.max(0.05, newScale)); 
              });
          }
      };

      // Attaching with { passive: false } is crucial for preventing default browser zoom
      workspace.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
          workspace.removeEventListener('wheel', handleWheel);
      };
  }, []);

  // --- Mobile Pinch-to-Zoom Implementation ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          touchStartRef.current = { dist, scale };
          setAutoFit(false); // Disable auto-fit on manual gesture
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchStartRef.current) {
          e.preventDefault(); // Prevent default browser zoom/scroll
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          
          const startDist = touchStartRef.current.dist;
          const startScale = touchStartRef.current.scale;
          
          // Calculate new scale relative to start
          const newScale = startScale * (dist / startDist);
          setScale(Math.min(5, Math.max(0.05, newScale)));
      }
  };

  const handleTouchEnd = () => {
      touchStartRef.current = null;
  };

  // Autofit Logic
  const calculateBestFit = useCallback((contentWidth: number, contentHeight: number) => {
    if (!workspaceRef.current || contentWidth === 0 || contentHeight === 0) return 1;
    const { clientWidth, clientHeight } = workspaceRef.current;
    
    // Reduced padding (20px) to maximize visibility on mobile
    const padding = 20; 
    const availableWidth = Math.max(10, clientWidth - padding);
    const availableHeight = Math.max(10, clientHeight - padding);
    
    // Allow zooming out significantly, but capped at 1 for max default zoom
    return Math.min(1, Math.min(availableWidth / contentWidth, availableHeight / contentHeight));
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || !currentPage) return;
    const resizeObserver = new ResizeObserver(() => {
        if (autoFit && currentPage) {
            setScale(calculateBestFit(currentPage.width, currentPage.height));
        }
    });
    resizeObserver.observe(workspace);
    return () => resizeObserver.disconnect();
  }, [autoFit, currentPage, calculateBestFit]);


  // --- Multi-Document Loading Logic ---
  const loadDocumentsFromUrls = useCallback(async (urls: string | string[], providedIds?: string[], shouldReset = true) => {
        setIsLoadingFile(true);
        if (shouldReset) {
            setAnnotations([]);
            events?.onClearAnnotations?.();
            setPages([]);
            setDocuments([]);
            pagesRef.current = [];
            setAutoFit(true);
        }

        const urlArray = Array.isArray(urls) ? urls : [urls];
        const docIds = providedIds || urlArray.map((_, i) => (shouldReset ? i : pagesRef.current.length + i).toString());

        const newDocuments: DocumentMeta[] = [];
        const newPages: PageData[] = [];

        for (let i = 0; i < urlArray.length; i++) {
            const url = urlArray[i];
            const docId = docIds[i] || `${Date.now()}-${i}`;
            const lowUrl = url.toLowerCase();
            let fileName = `Document ${docId}`;
            try { fileName = decodeURIComponent(url.split('/').pop() || `Document ${docId}`); } catch(e){}

            // Identify Type
            const isPdf = lowUrl.endsWith('.pdf');
            const isDocx = lowUrl.endsWith('.docx');
            const isModel = lowUrl.endsWith('.glb') || lowUrl.endsWith('.gltf');
            const isHtml = lowUrl.endsWith('.html') || lowUrl.endsWith('.htm');
            const isTxt = lowUrl.endsWith('.txt');

            let pageCount = 0;

            try {
                // 1. PDF
                if (isPdf) {
                    // Try fetch first (Better for binary data control)
                    // If fail, fall back to PDFJS direct load (handles some range requests better but strict CORS still blocks)
                    let pdfDoc = null;
                    
                    try {
                        // Standard fetch to get blob - ADDED CORS mode explicitly
                        const res = await fetch(url, { mode: 'cors' });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const blob = await res.blob();
                        const ab = await blob.arrayBuffer();
                        // Loading from ArrayBuffer (safest for cross-origin if fetch worked)
                        const loadingTask = pdfjsLib.getDocument({ 
                            data: ab,
                            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
                            cMapPacked: true,
                            withCredentials: false // Avoid strict origin checks if possible
                        });
                        pdfDoc = await loadingTask.promise;
                    } catch (fetchErr) {
                        const errorMsg = (fetchErr as Error).message;
                        const isFileProtocol = window.location.protocol === 'file:';
                        
                        console.warn(`PDF Fetch failed (${url}).`, fetchErr);
                        
                        if (isFileProtocol && errorMsg.includes('Failed to fetch')) {
                           console.error("Critical: 'Failed to fetch' usually means browser blocked 'file://' access to the PDF. Use a local server.");
                        }

                        try {
                             // Fallback: Direct URL load (PDF.js internal transport)
                             const loadingTask = pdfjsLib.getDocument({
                                 url,
                                 cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
                                 cMapPacked: true,
                                 withCredentials: false
                             });
                             pdfDoc = await loadingTask.promise;
                        } catch (directErr) {
                             console.error("Critical: Failed to load PDF via both fetch and direct.", directErr);
                             // Push a dummy page to show error state in PageRenderer
                             newPages.push({
                                id: `${docId}-err`, documentId: docId, pageNumber: 1,
                                width: 600, height: 800, 
                            });
                            newDocuments.push({ id: docId, name: fileName, type: 'pdf', pageCount: 1 });
                            continue; // Skip rest of loop for this file
                        }
                    }

                    if (pdfDoc) {
                        pageCount = pdfDoc.numPages;
                        for(let j=1; j<=pdfDoc.numPages; j++){
                            const p = await pdfDoc.getPage(j);
                            const vp = p.getViewport({scale:1});
                            newPages.push({
                                id: `${docId}-p${j}`,
                                documentId: docId,
                                pageNumber: j,
                                width: vp.width,
                                height: vp.height,
                                pdfPage: p
                            });
                        }
                    }
                } 
                // 2. DOCX
                else if (isDocx) {
                    const res = await fetch(url, { mode: 'cors' });
                    const blob = await res.blob();
                    pageCount = 1;
                    newPages.push({
                        id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                        width: 816, height: 1056, docxData: blob
                    });
                }
                // 3. 3D Model
                else if (isModel) {
                    pageCount = 1;
                    newPages.push({
                        id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                        width: 800, height: 600, modelSrc: url
                    });
                }
                // 4. HTML/Text
                else if (isHtml || isTxt) {
                    const res = await fetch(url, { mode: 'cors' });
                    const text = await res.text();
                    pageCount = 1;
                    newPages.push({
                         id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                         width: 800, height: 1000, 
                         textContent: isHtml ? text : `<pre>${text}</pre>`
                    });
                }
                // 5. Image (Fallback)
                else {
                    const dims = await new Promise<{w:number,h:number}>(r => {
                        const img = new Image(); 
                        // Try with anonymous first to see dimensions
                        img.crossOrigin="Anonymous";
                        img.onload=()=>r({w:img.naturalWidth, h:img.naturalHeight});
                        img.onerror=()=> {
                             // If anonymous fails, try without (tainted), just to get dims
                             img.crossOrigin = null;
                             img.src = url; // Re-trigger
                             img.onload=()=>r({w:img.naturalWidth, h:img.naturalHeight});
                             // If that fails too, return default
                             img.onerror=()=>r({w:800, h:600});
                        };
                        img.src = url;
                    });
                    pageCount = 1;
                    newPages.push({
                        id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                        width: dims.w, height: dims.h, imageSrc: url
                    });
                }

                newDocuments.push({
                    id: docId,
                    name: fileName,
                    type: isPdf?'pdf':(isDocx?'docx':(isModel?'model':'image')),
                    pageCount
                });

            } catch (e) {
                console.error(`Failed load: ${url}`, e);
            }
        }

        setDocuments(prev => shouldReset ? newDocuments : [...prev, ...newDocuments]);
        setPages(prev => shouldReset ? newPages : [...prev, ...newPages]);
        
        // Auto-select first loaded doc
        if (newDocuments.length > 0 && (shouldReset || !currentDocumentId)) {
            setCurrentDocumentId(newDocuments[0].id);
        }
        setIsLoadingFile(false);
        // Fire Document Ready Event
        if (events?.onDocumentReady) {
            setTimeout(() => events.onDocumentReady?.(), 50);
        }
  }, [events]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsLoadingFile(true);

      const newDocs: DocumentMeta[] = [];
      const newPages: PageData[] = [];

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const docId = `upload-${Date.now()}-${i}`;
          
          let dataUrl = '';
          const isPdf = file.type === 'application/pdf';
          const isDocx = file.type.includes('wordprocessingml') || file.name.endsWith('.docx');
          const isPptx = file.name.endsWith('.pptx') || file.type.includes('presentationml');

          if (!isPdf && !isDocx && !isPptx) {
              dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => resolve(ev.target?.result as string);
                  reader.readAsDataURL(file);
              });
          }

          let pageCount = 1;

          try {
            if (isPdf) {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ 
                    data: arrayBuffer,
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
                    cMapPacked: true, 
                });
                const pdf = await loadingTask.promise;
                pageCount = pdf.numPages;

                for (let j = 1; j <= pdf.numPages; j++) {
                    const p = await pdf.getPage(j);
                    const vp = p.getViewport({ scale: 1 });
                    newPages.push({
                        id: `${docId}-p${j}`,
                        documentId: docId,
                        pageNumber: j,
                        width: vp.width,
                        height: vp.height,
                        pdfPage: p
                    });
                }
            } else if (isDocx) {
                newPages.push({
                    id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                    width: 816, height: 1056, docxData: file
                });
            } else if (isPptx) {
                try {
                    const slidesHtml = await parsePptx(file);
                    pageCount = slidesHtml.length;
                    slidesHtml.forEach((html, idx) => {
                        newPages.push({
                            id: `${docId}-p${idx + 1}`, 
                            documentId: docId, 
                            pageNumber: idx + 1,
                            width: 960, 
                            height: 540, 
                            textContent: html
                        });
                    });
                } catch (e) {
                    console.error("PPTX Error", e);
                }
            } else {
                const dims = await new Promise<{ w: number, h: number }>(r => {
                    const img = new Image();
                    img.onload = () => r({ w: img.naturalWidth, h: img.naturalHeight });
                    img.src = dataUrl;
                });
                newPages.push({
                    id: `${docId}-p1`, documentId: docId, pageNumber: 1,
                    width: dims.w, height: dims.h, imageSrc: dataUrl
                });
            }

            newDocs.push({
                id: docId,
                name: file.name,
                type: isPdf ? 'pdf' : (isDocx ? 'docx' : (isPptx ? 'pptx' : 'image')),
                pageCount
            });
          } catch(err) {
              console.error("Error loading file", file.name, err);
          }
      }

      setDocuments(prev => [...prev, ...newDocs]);
      setPages(prev => [...prev, ...newPages]);
      if (newDocs.length > 0) setCurrentDocumentId(newDocs[0].id);
      setIsLoadingFile(false);
      
      // Fire Document Ready Event
      if (events?.onDocumentReady) {
          setTimeout(() => events.onDocumentReady?.(), 50);
      }
      e.target.value = ''; 
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
      // (Same as before)
      setIsLoadingFile(true);
      try {
        const dims = await new Promise<{w: number, h: number}>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.src = imageDataUrl;
        });
        const photoId = `camera-${Date.now()}`;
        const newDoc: DocumentMeta = { id: photoId, name: `Photo ${new Date().toLocaleTimeString()}`, type: 'image', pageCount: 1 };
        const newPage: PageData = { id: `${photoId}-p1`, documentId: photoId, pageNumber: 1, width: dims.w, height: dims.h, imageSrc: imageDataUrl };
        setDocuments(prev => [...prev, newDoc]);
        setPages(prev => [...prev, newPage]);
        setCurrentDocumentId(photoId); 
        events?.onPhotoAdd?.({ dataUrl: imageDataUrl, id: photoId });
        // Fire Document Ready for Camera too
        if (events?.onDocumentReady) setTimeout(() => events.onDocumentReady?.(), 50);
      } catch (e) {
          console.error("Failed to process camera image", e);
      } finally {
          setIsLoadingFile(false);
      }
  };

  // Handle Input Props Change
  useEffect(() => {
    if (documentSrc) {
        loadDocumentsFromUrls(documentSrc, documentIds, true);
    }
  }, [documentSrc, documentIds, loadDocumentsFromUrls]); 

  // Handle Document Switching
  const handleDocChange = (id: string) => {
      setCurrentDocumentId(id);
      setActivePageIndex(0);
      events?.onDocumentChange?.(id);
      setTimeout(() => setAutoFit(true), 50);
  };

  useImperativeHandle(ref, () => ({
      loadDocument: async (source, ids) => {
          if (Array.isArray(source)) {
               const urls: string[] = source.map(s => typeof s === 'string' ? s : URL.createObjectURL(s));
               await loadDocumentsFromUrls(urls, ids, true);
          } else if (typeof source === 'string') {
              await loadDocumentsFromUrls([source], ids ? [ids[0]] : undefined, true);
          } else {
              const url = URL.createObjectURL(source);
              await loadDocumentsFromUrls([url], ids ? [ids[0]] : [source.name], true);
          }
      },
      getAnnotations: () => annotations,
      setAnnotations: (anns) => setAnnotations(anns),
      clearAnnotations: () => {
          setAnnotations([]);
          setSelectedAnnotationId(null);
          events?.onClearAnnotations?.();
      }
  }));

  const deleteAnnotation = (id: string) => {
      if (isViewOnly) return;
      setAnnotations(prev => prev.filter(a => a.id !== id));
      if (selectedAnnotationId === id) setSelectedAnnotationId(null);
      events?.onAnnotationDelete?.(id);
  };

  const handleCancelModal = () => {
    if (newAnnotationId && selectedAnnotationId === newAnnotationId) {
        setAnnotations(prev => prev.filter(a => a.id !== newAnnotationId));
        setSelectedAnnotationId(null);
    }
    setNewAnnotationId(null);
    setShowCommentModal(false);
  };

  const handleSaveModal = (data: any) => {
      if (selectedAnnotationId) {
          let updatedAnnotation: Annotation | undefined;
          let isNew = false;
          setAnnotations(prev => {
              const updated = prev.map(a => {
                  if (a.id === selectedAnnotationId) {
                      if (selectedAnnotationId === newAnnotationId) isNew = true;
                      updatedAnnotation = { ...a, ...data, color: severityOptions[data.severity] || severityOptions[4] };
                      return updatedAnnotation!;
                  }
                  return a;
              });
              return updated;
          });
          setSeverity(data.severity);
          setReasonCode(data.reasonCode);
          if (updatedAnnotation) {
             const finalAnn = updatedAnnotation; 
             requestAnimationFrame(() => {
                 isNew ? events?.onAnnotationAdd?.(finalAnn) : events?.onAnnotationUpdate?.(finalAnn);
             });
          }
      }
      setNewAnnotationId(null); 
      setShowCommentModal(false);
  };

  // Nav Rendering
  const NavDots = () => {
      if (documents.length <= 1) return null;
      return (
          <div className="flex gap-2 bg-gray-900/80 p-2 rounded-full backdrop-blur border border-gray-700 mx-auto w-fit z-20 shadow-lg max-w-[80vw] overflow-x-auto no-scrollbar pointer-events-auto">
              {documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocChange(doc.id)}
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                        currentDocumentId === doc.id 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title={doc.name}
                  >
                      {doc.name.length > 20 ? doc.name.substring(0,18)+'...' : doc.name}
                  </button>
              ))}
          </div>
      );
  };

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
      if (tool === 'hand' && workspaceRef.current) {
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setScrollStart({ left: workspaceRef.current.scrollLeft, top: workspaceRef.current.scrollTop });
          e.preventDefault(); 
      } else {
         if (e.target === e.currentTarget) setSelectedAnnotationId(null);
      }
  };
  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
      if (isPanning && workspaceRef.current) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          workspaceRef.current.scrollLeft = scrollStart.left - dx;
          workspaceRef.current.scrollTop = scrollStart.top - dy;
      }
  };

  const handleAnalyze = async () => {
    if(!currentDocumentId) return;
    const page = visiblePages[activePageIndex];
    if (!page) return;
    setIsAnalyzing(true);
    try {
        let imageToAnalyze = page.imageSrc;
        if (!imageToAnalyze && page.pdfPage) {
            const viewport = page.pdfPage.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                await page.pdfPage.render({ canvasContext: ctx, viewport } as any).promise;
                imageToAnalyze = canvas.toDataURL('image/jpeg');
            }
        }
        if (imageToAnalyze) {
            const newAnnotations = await analyzeImageForAnnotations(currentDocumentId, imageToAnalyze, page.width, page.height);
            const pageAnnotations = newAnnotations.map(a => ({
                ...a, page: page.pageNumber, severity: severity, reasonCode: reasonCode, color: severityOptions[severity] || severityOptions[4], status: 'New'
            }));
            pageAnnotations.forEach(ann => events?.onAnnotationAdd?.(ann));
            setAnnotations(prev => [...prev, ...pageAnnotations]);
        }
    } catch (error) {
        alert("Gemini Analysis Failed. Check console or API Key.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Only pass the relevant annotations to PageRenderer to avoid deep re-renders.
  // Note: Filter creates new array, so React.memo uses shallow comparison. 
  // We rely on PageRenderer being fast now that the heavy image is not redrawn on canvas.
  const pageAnnotations = currentPage ? visibleAnnotations.filter(a => (a.page || 1) === currentPage.pageNumber) : [];

  return (
    <div ref={containerRef} className="flex w-full h-full bg-gray-900 text-gray-100 font-sans overflow-hidden" style={styleConfig?.container}>
      {layoutMode === 'sidebar' && (
        <div className={`
             ${isMobile ? 'fixed inset-y-0 left-0 z-50 transition-transform duration-300 shadow-2xl' : 'relative z-10'}
             ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
        `}>
             <Toolbar 
                currentTool={tool} setTool={setTool}
                currentStrokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                currentFontSize={fontSize} setFontSize={setFontSize}
                onClear={() => { setAnnotations([]); events?.onClearAnnotations?.(); }}
                onSave={() => events?.onSave ? events.onSave({file: currentDocumentMeta?.name||'Batch', annotations, timestamp: new Date().toISOString()}) : null}
                onLoad={() => {}}
                onFileChange={handleFileUpload} 
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                hasFile={documents.length > 0}
                scale={scale} setScale={(s) => { setScale(s); setAutoFit(false); }}
                onFitToScreen={() => setAutoFit(true)}
                isFullscreen={isFullscreen} onToggleFullscreen={() => {}}
                selectedAnnotationId={selectedAnnotationId}
                onDeleteSelected={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
                onEditSelected={() => setShowCommentModal(true)}
                severity={severity} setSeverity={setSeverity}
                reasonCode={reasonCode} setReasonCode={setReasonCode}
                hideLoadFileBtn={hideLoadFileBtn}
                hideSaveJsonBtn={hideSaveJsonBtn}
                hideLoadJsonBtn={hideLoadJsonBtn}
                customSeverityColors={severityOptions}
                customReasonCodes={reasonCodeOptions}
                style={styleConfig?.toolbar}
                variant='sidebar'
                mode={mode}
                showThumbnails={showThumbnails}
                onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
                onClose={() => {
                    setMobileMenuOpen(false);
                    if (isMobile) setLayoutMode('bottom');
                }}
                isMobile={isMobile}
             />
        </div>
      )}

      {showThumbnails && documents.length > 0 && (
          <ThumbnailPanel 
            pages={visiblePages}
            activePageIndex={activePageIndex}
            onPageSelect={(idx) => {
                setActivePageIndex(idx);
            }}
          />
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden" style={styleConfig?.layout}>
        
        {/* Header */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shadow-md z-10 shrink-0">
             <div className="flex items-center gap-2">
                 {isMobile && <button type="button" onClick={() => { setLayoutMode('sidebar'); setMobileMenuOpen(true); }} className="p-2"><Menu className="w-5 h-5"/></button>}
                 <span className="font-bold text-lg text-blue-400">SmartDoc</span>
                 <span className="text-gray-500">|</span>
                 <span className="text-gray-300 text-sm font-medium truncate max-w-[150px]">
                     {currentDocumentMeta?.name || 'No Doc'}
                 </span>
             </div>
             
             <div className="flex items-center gap-2">
                  {!hideCameraBtn && !isViewOnly && (
                   <button 
                     type="button"
                     onClick={() => setShowCamera(true)}
                     className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400"
                     title="Add Photo"
                   >
                       <Camera className="w-5 h-5" />
                   </button>
                  )}
                  <button type="button" onClick={() => setLayoutMode(m => m==='sidebar'?'bottom':'sidebar')}><LayoutTemplate className="w-5 h-5 text-gray-400"/></button>
                  <button type="button" onClick={() => setShowRightPanel(!showRightPanel)}><PanelRightOpen className="w-5 h-5 text-gray-400"/></button>
             </div>
        </div>

        {/* Workspace */}
        <div 
             ref={workspaceRef}
             className={`flex-1 relative bg-gray-900/50 overflow-auto flex flex-col p-4 gap-8 min-h-0 ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''}`}
             style={{ 
                 backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', 
                 backgroundSize: '20px 20px',
                 ...styleConfig?.workspace
             }}
             onMouseDown={handleWorkspaceMouseDown}
             onMouseMove={handleWorkspaceMouseMove}
             onMouseUp={() => setIsPanning(false)}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
        >
            {navPosition === 'top' && (
                <div className="sticky top-4 z-30 w-full flex justify-center pointer-events-none mb-4" style={styleConfig?.navBar}>
                    <div className="pointer-events-auto">
                        <NavDots />
                    </div>
                </div>
            )}

            {documents.length === 0 && !isLoadingFile ? (
                <div className="text-center text-gray-500 my-auto">
                    <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Load documents to begin.</p>
                </div>
            ) : isLoadingFile ? (
                <div className="flex flex-col items-center justify-center text-blue-400 my-auto">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span>Loading...</span>
                </div>
            ) : (
                currentPage && (
                    <PageRenderer
                        key={currentPage.id}
                        page={currentPage}
                        scale={scale}
                        tool={tool}
                        strokeWidth={strokeWidth}
                        fontSize={fontSize}
                        annotations={pageAnnotations}
                        onAnnotationsChange={(updatedPageAnns) => {
                             if(isViewOnly) return;
                             setAnnotations(prev => {
                                 const others = prev.filter(a => a.documentId !== currentDocumentId || (a.page || 1) !== currentPage.pageNumber);
                                 return [...others, ...updatedPageAnns];
                             });
                        }}
                        onAnnotationCreated={(ann) => {
                            if (!canDraw) return;
                            setSelectedAnnotationId(ann.id);
                            setNewAnnotationId(ann.id); 
                            setShowCommentModal(true);
                        }}
                        onAnnotationUpdate={(ann) => events?.onAnnotationUpdate?.(ann)}
                        onSelect={setSelectedAnnotationId}
                        selectedId={selectedAnnotationId}
                        severity={severity}
                        reasonCode={reasonCode}
                        isVisible={true}
                        currentColor={activeColor}
                        onDelete={deleteAnnotation}
                        onEdit={() => setShowCommentModal(true)}
                        readOnly={layerReadOnly}
                        onDimensionsUpdate={handleDimensionsUpdate}
                        modelViewerSrc={resolvedModelViewerSrc}
                    />
                )
            )}
            
            {navPosition === 'bottom' && <div className="sticky bottom-4 z-20 pointer-events-none w-full flex justify-center" style={styleConfig?.navBar}>
                <div className="pointer-events-auto"><NavDots /></div>
            </div>}
        </div>

        {layoutMode === 'bottom' && (
             <Toolbar 
                 currentTool={tool} setTool={setTool}
                 currentStrokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                 currentFontSize={fontSize} setFontSize={setFontSize}
                 onClear={() => { setAnnotations([]); events?.onClearAnnotations?.(); }}
                 onSave={() => {}}
                 onLoad={() => {}}
                 onFileChange={handleFileUpload}
                 onAnalyze={handleAnalyze}
                 isAnalyzing={isAnalyzing}
                 hasFile={documents.length > 0}
                 scale={scale} setScale={(s) => { setScale(s); setAutoFit(false); }}
                 onFitToScreen={() => setAutoFit(true)}
                 isFullscreen={isFullscreen} onToggleFullscreen={() => {}}
                 selectedAnnotationId={selectedAnnotationId}
                 onDeleteSelected={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
                 onEditSelected={() => setShowCommentModal(true)}
                 severity={severity} setSeverity={setSeverity}
                 reasonCode={reasonCode} setReasonCode={setReasonCode}
                 customSeverityColors={severityOptions}
                 customReasonCodes={reasonCodeOptions}
                 style={styleConfig?.toolbar}
                 variant='bottom'
                 mode={mode}
                 showThumbnails={showThumbnails}
                 onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
             />
        )}
        
        {showRightPanel && (
            <div className={`absolute top-14 bottom-0 right-0 z-40 bg-gray-900 border-l border-gray-700 w-80 flex flex-col`}>
                 <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                     <span className="font-bold text-gray-400 uppercase text-xs">Annotations ({visibleAnnotations.length})</span>
                     <button type="button" onClick={() => setShowRightPanel(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                     {visibleAnnotations.map(ann => (
                         <div key={ann.id} onClick={() => {
                             setSelectedAnnotationId(ann.id);
                             const page = visiblePages.find(p => p.pageNumber === (ann.page || 1));
                             if(page) document.getElementById(`page-${page.id}`)?.scrollIntoView({behavior:'smooth'});
                         }} className={`p-3 rounded border cursor-pointer ${selectedAnnotationId === ann.id ? 'bg-gray-800 border-blue-500' : 'bg-gray-900 border-gray-700'}`}>
                             <div className="flex items-center justify-between mb-1">
                                 <span className="text-xs font-bold text-gray-200">{ann.reasonCode}</span>
                                 <span className="text-[10px] text-gray-500">Pg {ann.page}</span>
                             </div>
                             <p className="text-xs text-gray-400 truncate">{ann.type==='text'?(ann as TextAnnotation).text:ann.comment}</p>
                         </div>
                     ))}
                 </div>
            </div>
        )}

        <CommentModal 
            isOpen={showCommentModal}
            onClose={handleCancelModal}
            onSave={handleSaveModal}
            onDelete={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
            initialData={{
                comment: annotations.find(a => a.id === selectedAnnotationId)?.comment || "",
                severity: annotations.find(a => a.id === selectedAnnotationId)?.severity || severity,
                reasonCode: annotations.find(a => a.id === selectedAnnotationId)?.reasonCode || reasonCode,
                status: annotations.find(a => a.id === selectedAnnotationId)?.status || 'New',
                text: (annotations.find(a => a.id === selectedAnnotationId) as TextAnnotation)?.text || "",
                type: annotations.find(a => a.id === selectedAnnotationId)?.type,
                isNew: selectedAnnotationId === newAnnotationId
            }}
            severityOptions={severityOptions}
            reasonCodeOptions={reasonCodeOptions}
            statusOptions={statusOptions}
            readOnly={modalReadOnly}
        />

        <CameraModal 
            isOpen={showCamera}
            onClose={() => setShowCamera(false)}
            onCapture={handleCameraCapture}
        />
      </div>
    </div>
  );
});

SmartDocApp.displayName = 'SmartDocApp';
export default SmartDocApp;
