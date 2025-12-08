
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import AnnotationLayer from './components/AnnotationLayer';
import Toolbar from './components/Toolbar';
import CameraModal from './components/CameraModal';
import ThumbnailPanel from './components/ThumbnailPanel';
import { Annotation, ToolType, SmartDocProps, TextAnnotation, SmartDocHandle, PageData } from './types';
import { analyzeImageForAnnotations } from './services/geminiService';
import { Info, MessageSquare, Trash2, X, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, ListChecks, Activity, LayoutTemplate, PanelRightClose, PanelRightOpen, MapPin, Type, Camera, Menu } from 'lucide-react';
import { REASON_CODES, SEVERITY_COLORS, STATUS_OPTIONS } from './constants';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

// Internal component to handle rendering of individual pages (especially PDFs)
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
  isVisible: boolean; // prop to optimize rendering
  currentColor: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  readOnly?: boolean;
}> = ({
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
  readOnly
}) => {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let active = true;

    const render = async () => {
      // If we already have a loaded image for this source, don't re-render unless source changed
      if (bgImage && (page.imageSrc ? bgImage.src === page.imageSrc : true)) return;
      
      setIsRendering(true);
      
      try {
        if (page.imageSrc) {
           const img = new Image();
           img.src = page.imageSrc;
           await new Promise((resolve) => { img.onload = resolve; });
           if (active) setBgImage(img);
        } else if (page.pdfPage) {
           // Render PDF page to canvas then to image
           const viewport = page.pdfPage.getViewport({ scale: 2.0 }); // High quality render
           const canvas = document.createElement('canvas');
           canvas.width = viewport.width;
           canvas.height = viewport.height;
           const context = canvas.getContext('2d');
           if (context) {
             await page.pdfPage.render({ canvasContext: context, viewport } as any).promise;
             const imgData = canvas.toDataURL('image/jpeg');
             const img = new Image();
             img.src = imgData;
             if (active) setBgImage(img);
           }
        }
      } catch (err) {
        console.error("Error rendering page", page.pageNumber, err);
      } finally {
        if (active) setIsRendering(false);
      }
    };

    render();

    return () => { active = false; };
  }, [page]);

  return (
    <div 
      className="relative bg-white shadow-xl mb-8 transition-transform origin-top"
      style={{ 
        width: page.width * scale, 
        height: page.height * scale,
        // Removed maxWidth: '100%' to ensure correct scaling logic during zoom
      }}
      id={`page-${page.pageNumber}`}
    >
      {/* Page Number Indicator */}
      <div className="absolute -left-12 top-0 text-gray-500 font-mono text-sm hidden xl:block">
        Page {page.pageNumber}
      </div>

      {isRendering && !bgImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
           <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      <AnnotationLayer 
          width={page.width}
          height={page.height}
          tool={tool}
          strokeWidth={strokeWidth}
          fontSize={fontSize}
          annotations={annotations}
          onAnnotationsChange={onAnnotationsChange}
          onAnnotationCreated={onAnnotationCreated}
          onAnnotationUpdate={onAnnotationUpdate}
          onSelect={onSelect}
          selectedId={selectedId}
          backgroundImage={bgImage}
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
  );
};


const CommentModal: React.FC<any> = ({ isOpen, onClose, onSave, onDelete, initialData, severityOptions, reasonCodeOptions, statusOptions, readOnly }) => {
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
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
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
                          disabled={readOnly && formData.status !== 'New'} // Allow changing status only if specifically allowed, but for now readOnly locks all
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
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
                        {readOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button 
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
    initialAnnotations = [],
    severityOptions = SEVERITY_COLORS,
    reasonCodeOptions = REASON_CODES,
    statusOptions = STATUS_OPTIONS,
    hideLoadFileBtn,
    hideSaveJsonBtn,
    hideLoadJsonBtn,
    defaultLayout = 'bottom',
    styleConfig,
    events,
    mode = 'full',
    defaultTool = 'arrow',
    hideCameraBtn = false,
    showThumbnails: initialShowThumbnails = true,
}, ref) => {
  // Application State
  const [pages, setPages] = useState<PageData[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  
  // Interaction State
  const [tool, setTool] = useState<ToolType>(defaultTool); 
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [scale, setScale] = useState<number>(1);
  const [autoFit, setAutoFit] = useState<boolean>(true); 
  
  // Defect/Severity State
  const [severity, setSeverity] = useState<number>(4); 
  const [reasonCode, setReasonCode] = useState<string>(reasonCodeOptions[0]);

  // Selection & Editing State
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  // File State
  const [fileName, setFileName] = useState<string>("Untitled");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // UI State
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'bottom'>(defaultLayout);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // New UI Features
  const [showThumbnails, setShowThumbnails] = useState<boolean>(initialShowThumbnails);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  
  // Fullscreen State
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Panning State
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const activeColor = severityOptions[severity] || severityOptions[4];

  // Derived Mode Properties
  const isViewOnly = mode === 'viewonly';
  const isEditMode = mode === 'edit';
  // Allow drawing only in full mode
  const canDraw = mode === 'full';
  // Allow editing existing annotations in full and edit modes
  const canEdit = mode === 'full' || mode === 'edit';
  
  // Effective ReadOnly passed to layers/modals
  // AnnotationLayer is readOnly if we are in viewonly OR if we are in edit mode (cannot drag/resize geometries usually, or we can allow it? 
  // Let's assume Edit Mode allows metadata edit but geometry edit is debatable. 
  // For simplicity, let's say AnnotationLayer is readOnly in 'viewonly'. In 'edit', you can select but not draw new.)
  // Actually, AnnotationLayer handles 'tool' logic. If tool is 'select', we can move things.
  // If we want to prevent moving in 'edit' mode, we'd need a stricter flag. 
  // Based on prompt "edit: can change status... cannot add new", usually means geometry is locked too? 
  // Let's assume geometry is editable in 'edit' mode for now, just no new tools.
  const layerReadOnly = isViewOnly; 
  
  // Modal ReadOnly: In ViewOnly, modal is read only. In Edit/Full, it is editable.
  const modalReadOnly = isViewOnly;

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        // If mobile, default to bottom layout if not specified
        if (mobile && defaultLayout === 'sidebar') {
           // Optional: force bottom layout on mobile init? 
           // Leaving as is to respect props, but allowing switching.
        }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Logic to process files (Shared between drag-drop, input, and imperative call)
  const processFiles = useCallback(async (files: FileList | File[], shouldResetAnnotations = true) => {
      if (!files || files.length === 0) return;

      // Reset state based on flag
      if (shouldResetAnnotations) {
          setAnnotations([]); 
          events?.onClearAnnotations?.();
      }
      
      setSelectedAnnotationId(null);
      setIsLoadingFile(true);
      if (shouldResetAnnotations) {
          setAutoFit(true);
          setPages([]);
      }
      
      const fileList = Array.isArray(files) ? files : Array.from(files);
      setFileName(prev => shouldResetAnnotations ? (fileList.length > 1 ? `${fileList.length} Files` : fileList[0].name) : `Mixed Content`);

      const newPages: PageData[] = [];
      const startPageNum = shouldResetAnnotations ? 0 : pages.length;

      try {
          // Process all files
          for (let i = 0; i < fileList.length; i++) {
              const file = fileList[i];
              
              if (file.type === 'application/pdf') {
                  const arrayBuffer = await file.arrayBuffer();
                  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                  const pdf = await loadingTask.promise;
                  
                  // Add all pages from PDF
                  for (let j = 1; j <= pdf.numPages; j++) {
                      const page = await pdf.getPage(j);
                      const viewport = page.getViewport({ scale: 1.0 });
                      
                      newPages.push({
                          id: `${file.name}-p${j}-${Math.random()}`,
                          pageNumber: startPageNum + newPages.length + 1,
                          width: viewport.width,
                          height: viewport.height,
                          pdfPage: page
                      });
                  }
              } else if (file.type.includes('image')) {
                  const src = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) => resolve(e.target?.result as string);
                      reader.readAsDataURL(file);
                  });
                  
                  const dims = await new Promise<{w: number, h: number}>((resolve) => {
                     const img = new Image();
                     img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                     img.src = src;
                  });

                  newPages.push({
                      id: `${file.name}-${Math.random()}`,
                      pageNumber: startPageNum + newPages.length + 1,
                      width: dims.w,
                      height: dims.h,
                      imageSrc: src
                  });
              } else {
                  console.warn(`Unsupported file type: ${file.type}`);
                  // alert(`File type not supported: ${file.name}\nPlease upload Images or PDF.`);
              }
          }
          
          if (shouldResetAnnotations) {
              setPages(newPages);
              if (newPages.length > 0) {
                  const fitScale = calculateBestFit(newPages[0].width, newPages[0].height);
                  setScale(fitScale);
              }
          } else {
              setPages(prev => [...prev, ...newPages]);
          }
          
          events?.onDocumentReady?.();
          
      } catch (error) {
          console.error("Error loading files", error);
          alert("Failed to load files.");
      } finally {
          setIsLoadingFile(false);
      }
  }, [events, pages, setScale]); // Added dependencies

  const loadDocumentsFromUrls = useCallback(async (urls: string | string[], shouldResetAnnotations = true) => {
        setIsLoadingFile(true);
        try {
            const urlArray = Array.isArray(urls) ? urls : [urls];
            const filePromises = urlArray.map(async (url) => {
                const response = await fetch(url);
                const blob = await response.blob();
                const fileType = url.toLowerCase().endsWith('.pdf') || blob.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
                // Try to infer name
                const name = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'document';
                return new File([blob], name, { type: fileType });
            });
            
            const files = await Promise.all(filePromises);
            await processFiles(files, shouldResetAnnotations);
        } catch (err) {
            console.error("Failed to auto-load document:", err);
            setIsLoadingFile(false);
        }
  }, [processFiles]);

  const handleCameraCapture = async (imageDataUrl: string) => {
      // Create a simplified file-like object processing
      setIsLoadingFile(true);
      try {
        const dims = await new Promise<{w: number, h: number}>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.src = imageDataUrl;
        });

        const newPage: PageData = {
            id: `camera-capture-${Date.now()}`,
            pageNumber: pages.length + 1,
            width: dims.w,
            height: dims.h,
            imageSrc: imageDataUrl
        };

        setPages(prev => [...prev, newPage]);
        
        // Trigger Event Callback
        events?.onPhotoAdd?.(imageDataUrl);

        // Scroll to the new page
        setTimeout(() => scrollToPage(pages.length), 100);

      } catch (e) {
          console.error("Failed to process camera image", e);
      } finally {
          setIsLoadingFile(false);
      }
  };

  // Expose Imperative API
  useImperativeHandle(ref, () => ({
      loadDocument: async (source: string | File | (string | File)[]) => {
          if (Array.isArray(source)) {
              // Handle mixed array of strings and Files
              const files: File[] = [];
              const urls: string[] = [];
              source.forEach(item => {
                  if (typeof item === 'string') urls.push(item);
                  else files.push(item);
              });

              if (urls.length > 0) {
                 // Fetch URLs first
                 const fetchedFilesPromises = urls.map(async (url) => {
                     const response = await fetch(url);
                     const blob = await response.blob();
                     const fileType = url.toLowerCase().endsWith('.pdf') || blob.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
                     const name = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'document';
                     return new File([blob], name, { type: fileType });
                 });
                 const fetchedFiles = await Promise.all(fetchedFilesPromises);
                 files.push(...fetchedFiles);
              }
              
              if (files.length > 0) {
                  await processFiles(files);
              }
          } else if (typeof source === 'string') {
              await loadDocumentsFromUrls(source);
          } else {
              await processFiles([source]);
          }
      },
      getAnnotations: () => annotations,
      setAnnotations: (anns: Annotation[]) => setAnnotations(anns),
      clearAnnotations: () => {
          setAnnotations([]);
          setSelectedAnnotationId(null);
          events?.onClearAnnotations?.();
      }
  }));

  // Handle Initial Annotations Event
  useEffect(() => {
    if (initialAnnotations.length > 0 && events?.onAnnotationsReady) {
        events.onAnnotationsReady();
    }
  }, []); 

  const calculateBestFit = useCallback((contentWidth: number, contentHeight: number) => {
    if (!workspaceRef.current || contentWidth === 0 || contentHeight === 0) return 1;
    const { clientWidth, clientHeight } = workspaceRef.current;
    const padding = 64; 
    const availableWidth = Math.max(100, clientWidth - padding);
    const availableHeight = Math.max(100, clientHeight - padding);
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    return Math.min(1, Math.min(scaleX, scaleY));
  }, []);

  // Update Scale on window resize if AutoFit
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || pages.length === 0) return;

    const resizeObserver = new ResizeObserver(() => {
        if (autoFit && pages[activePageIndex]) {
            const p = pages[activePageIndex];
            const newScale = calculateBestFit(p.width, p.height);
            setScale(newScale);
        }
    });
    resizeObserver.observe(workspace);
    return () => resizeObserver.disconnect();
  }, [autoFit, pages, activePageIndex, calculateBestFit]);

  // Auto load documentSrc
  useEffect(() => {
    if (documentSrc) {
        // IMPORTANT: Do NOT reset annotations if we are loading the initial document 
        // and initial annotations were provided.
        // We assume that if initialAnnotations exist, they belong to this documentSrc.
        const shouldReset = initialAnnotations.length === 0;
        loadDocumentsFromUrls(documentSrc, shouldReset);
    }
  }, [documentSrc, loadDocumentsFromUrls]); // removed initialAnnotations from dep array to avoid loops

  // Handle Scroll to determine active page
  const handleScroll = () => {
    if (!workspaceRef.current) return;
    const { scrollTop, clientHeight } = workspaceRef.current;
    const scrollMiddle = scrollTop + (clientHeight / 2);
    // Intersection observer handles active page, scroll updates are visual
  };

  // Intersection Observer for Active Page
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                 const id = entry.target.id;
                 const index = parseInt(id.replace('page-', '')) - 1;
                 if (!isNaN(index)) setActivePageIndex(index);
            }
        });
    }, { threshold: [0.5] });

    pages.forEach(p => {
        const el = document.getElementById(`page-${p.pageNumber}`);
        if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages]);


  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setAutoFit(false); 
        setScale(prev => {
          const next = Math.max(0.1, Math.min(5, prev + delta));
          return Number(next.toFixed(1));
        });
      }
    };
    workspace.addEventListener('wheel', handleWheel, { passive: false });
    return () => workspace.removeEventListener('wheel', handleWheel);
  }, []);

  // Fullscreen Logic
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error("Error enabling fullscreen:", err);
        });
    } else {
        document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut for deleting annotations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && !showCommentModal && !isViewOnly) {
            // Check if we are focusing on an input, if so, don't delete annotation
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;
            
            deleteAnnotation(selectedAnnotationId);
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, showCommentModal, isViewOnly]);

  // Update selection properties
  useEffect(() => {
    if (selectedAnnotationId) {
      const ann = annotations.find(a => a.id === selectedAnnotationId);
      if (ann) {
        if (ann.severity) setSeverity(ann.severity);
        if (ann.reasonCode) setReasonCode(ann.reasonCode);
      }
    }
  }, [selectedAnnotationId, annotations]);

  const updateSelectedSeverity = (newSeverity: number) => {
    if (isViewOnly) return;
    setSeverity(newSeverity);
    if (selectedAnnotationId) {
      let updatedAnn: Annotation | undefined;
      setAnnotations(prev => {
          const updated = prev.map(a => {
            if (a.id === selectedAnnotationId) {
                const updatedItem = { ...a, severity: newSeverity, color: severityOptions[newSeverity] || severityOptions[4] };
                updatedAnn = updatedItem;
                return updatedItem;
            }
            return a;
          });
          return updated;
      });
      if (updatedAnn) requestAnimationFrame(() => events?.onAnnotationUpdate?.(updatedAnn!));
    }
  };

  const updateSelectedReasonCode = (newCode: string) => {
    if (isViewOnly) return;
    setReasonCode(newCode);
    if (selectedAnnotationId) {
      let updatedAnn: Annotation | undefined;
      setAnnotations(prev => {
          const updated = prev.map(a => {
            if (a.id === selectedAnnotationId) {
                const updatedItem = { ...a, reasonCode: newCode };
                updatedAnn = updatedItem;
                return updatedItem;
            }
            return a;
          });
          return updated;
      });
      if (updatedAnn) requestAnimationFrame(() => events?.onAnnotationUpdate?.(updatedAnn!));
    }
  };

  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

  // File Loading Logic (Wrapper for Input Change)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        processFiles(e.target.files);
    }
  };

  const scrollToPage = (pageIndex: number) => {
      const pageEl = document.getElementById(`page-${pageIndex + 1}`);
      if (pageEl) {
          pageEl.scrollIntoView({ behavior: 'smooth' });
          setActivePageIndex(pageIndex);
      }
  };

  const handleSave = () => {
    const data = {
      file: fileName,
      annotations,
      timestamp: new Date().toISOString()
    };

    if (events?.onSave) {
        // Delegate save logic to the external handler
        events.onSave(data);
    } else {
        // Default behavior: Download JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}-annotations.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.annotations && Array.isArray(data.annotations)) {
          setAnnotations(data.annotations);
          events?.onAnnotationsReady?.();
        } else {
            alert("Invalid JSON format");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    const activePage = pages[activePageIndex];
    if (!activePage) return;

    setIsAnalyzing(true);
    try {
        // Prepare image data for analysis
        let imageToAnalyze = activePage.imageSrc;
        
        // If it's a PDF page or we don't have source, we need to extract from rendered canvas or stored proxy
        if (!imageToAnalyze && activePage.pdfPage) {
            // Render specific page to base64 for Gemini
            const viewport = activePage.pdfPage.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                await activePage.pdfPage.render({ canvasContext: ctx, viewport } as any).promise;
                imageToAnalyze = canvas.toDataURL('image/jpeg');
            }
        }

        if (imageToAnalyze) {
            const newAnnotations = await analyzeImageForAnnotations(imageToAnalyze, activePage.width, activePage.height);
            const pageAnnotations = newAnnotations.map(a => ({
                ...a,
                page: activePage.pageNumber,
                severity: severity,
                reasonCode: reasonCode,
                color: severityOptions[severity] || severityOptions[4],
                status: 'New'
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

  const deleteAnnotation = (id: string) => {
      if (isViewOnly) return;
      setAnnotations(prev => prev.filter(a => a.id !== id));
      if (selectedAnnotationId === id) setSelectedAnnotationId(null);
      events?.onAnnotationDelete?.(id);
  };

  const handleCancelModal = () => {
    if (newAnnotationId && selectedAnnotationId === newAnnotationId) {
        deleteAnnotation(newAnnotationId);
    }
    setNewAnnotationId(null);
    setShowCommentModal(false);
  };

  const handleSaveModal = (data: any) => {
      if (selectedAnnotationId) {
          let updatedAnnotation: Annotation | undefined;
          setAnnotations(prev => {
              const updated = prev.map(a => {
                  if (a.id === selectedAnnotationId) {
                      updatedAnnotation = { 
                          ...a, 
                          ...data,
                          color: severityOptions[data.severity] || severityOptions[4]
                      };
                      return updatedAnnotation!;
                  }
                  return a;
              });
              return updated;
          });
          setSeverity(data.severity);
          setReasonCode(data.reasonCode);
          if (updatedAnnotation) requestAnimationFrame(() => events?.onAnnotationUpdate?.(updatedAnnotation!));
      }
      setNewAnnotationId(null); 
      setShowCommentModal(false);
  };

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
      if (tool === 'hand' && workspaceRef.current) {
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setScrollStart({ 
              left: workspaceRef.current.scrollLeft, 
              top: workspaceRef.current.scrollTop 
          });
          e.preventDefault(); 
      } else {
         // Deselect if clicking background
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

  const handleWorkspaceMouseUp = () => {
      setIsPanning(false);
  };
  
  const handleClear = () => {
      setAnnotations([]);
      setSelectedAnnotationId(null);
      events?.onClearAnnotations?.();
  };
  
  const handleFitToScreen = () => {
      setAutoFit(true);
      if (pages[activePageIndex]) {
          const p = pages[activePageIndex];
          const newScale = calculateBestFit(p.width, p.height);
          setScale(newScale);
      }
  };

  return (
    <div ref={containerRef} className="flex w-full h-full bg-gray-900 text-gray-100 font-sans overflow-hidden" style={styleConfig?.container}>
      
      {/* Sidebar Layout - Render as Drawer on Mobile */}
      {layoutMode === 'sidebar' && (
        <>
            {/* Backdrop for Mobile Drawer */}
            {isMobile && mobileMenuOpen && (
                <div 
                    className="fixed inset-0 top-14 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                ></div>
            )}
            
            {/* Sidebar Content */}
            <div 
                className={`
                    ${isMobile ? 'fixed left-0 bottom-0 top-14 z-50 transition-transform duration-300 shadow-2xl w-72 border-r border-gray-700 bg-gray-800' : 'relative z-10'}
                    ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
                `}
            >
                <Toolbar 
                    currentTool={tool}
                    setTool={(t) => { setTool(t); if (t !== 'select') setSelectedAnnotationId(null); if(isMobile) setMobileMenuOpen(false); }}
                    currentStrokeWidth={strokeWidth}
                    setStrokeWidth={setStrokeWidth}
                    currentFontSize={fontSize}
                    setFontSize={setFontSize}
                    onClear={handleClear}
                    onSave={handleSave}
                    onLoad={handleLoad}
                    onFileChange={handleFileChange}
                    onAnalyze={handleAnalyze}
                    isAnalyzing={isAnalyzing}
                    hasFile={pages.length > 0}
                    scale={scale}
                    setScale={(newScale) => { setAutoFit(false); setScale(newScale); }}
                    onFitToScreen={handleFitToScreen}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                    selectedAnnotationId={selectedAnnotationId}
                    onDeleteSelected={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
                    onEditSelected={() => setShowCommentModal(true)}
                    severity={severity}
                    setSeverity={updateSelectedSeverity}
                    reasonCode={reasonCode}
                    setReasonCode={updateSelectedReasonCode}
                    hideLoadFileBtn={!!documentSrc || hideLoadFileBtn}
                    hideSaveJsonBtn={hideSaveJsonBtn}
                    hideLoadJsonBtn={hideLoadJsonBtn}
                    customSeverityColors={severityOptions}
                    customReasonCodes={reasonCodeOptions}
                    style={styleConfig?.toolbar}
                    variant='sidebar'
                    mode={mode}
                    
                    // Camera & Thumbnails Props
                    showThumbnails={showThumbnails}
                    onToggleThumbnails={() => { setShowThumbnails(!showThumbnails); if(isMobile) setMobileMenuOpen(false); }}

                    // Mobile Drawer Close: Switch to bottom toolbar on close
                    onClose={() => {
                        setMobileMenuOpen(false);
                        if(isMobile) setLayoutMode('bottom');
                    }}
                    isMobile={isMobile}
                />
            </div>
        </>
      )}

      {/* Thumbnail Panel - Left side (between toolbar and workspace) */}
      {showThumbnails && pages.length > 0 && (
          <ThumbnailPanel 
            pages={pages}
            activePageIndex={activePageIndex}
            onPageSelect={(idx) => scrollToPage(idx)}
          />
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden" style={styleConfig?.layout}>
        
        {/* Top Header */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2">
               {/* Mobile Menu Button - Always show on mobile to allow switching to Sidebar/Options */}
               {isMobile && (
                   <button 
                        onClick={() => {
                            if (layoutMode === 'bottom') {
                                setLayoutMode('sidebar');
                                // slight delay to ensure render before sliding in
                                setTimeout(() => setMobileMenuOpen(true), 10);
                            } else {
                                setMobileMenuOpen(!mobileMenuOpen);
                            }
                        }}
                        className="p-2 -ml-2 rounded-lg text-gray-300 hover:bg-gray-700"
                    >
                        <Menu className="w-6 h-6" />
                   </button>
               )}

               <span className="font-bold text-lg text-blue-400">SmartDoc</span>
               {!isMobile && (
                   <>
                    <span className="text-gray-500 text-sm">|</span>
                    <span className="text-gray-300 text-sm font-medium truncate max-w-xs">{fileName}</span>
                   </>
               )}
            </div>
            
            {pages.length > 0 && !isMobile && (
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                        onClick={() => scrollToPage(activePageIndex - 1)}
                        disabled={activePageIndex === 0}
                        className="p-1 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-mono w-24 text-center text-gray-200">
                         {activePageIndex + 1} / {pages.length}
                    </span>
                    <button 
                        onClick={() => scrollToPage(activePageIndex + 1)}
                        disabled={activePageIndex >= pages.length - 1}
                        className="p-1 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2 md:gap-3">
               
               {/* Camera Button in Header - Hidden if disabled via config or mode */}
               {!hideCameraBtn && !isViewOnly && (
                   <button 
                     onClick={() => setShowCamera(true)}
                     className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400"
                     title="Add Photo"
                   >
                       <Camera className="w-5 h-5" />
                   </button>
               )}

               <div className="w-px h-6 bg-gray-700 mx-1 hidden md:block"></div>

               {/* Toggle Layout Button - Available on Mobile now */}
               <button 
                onClick={() => {
                    const newMode = layoutMode === 'sidebar' ? 'bottom' : 'sidebar';
                    setLayoutMode(newMode);
                    // If switching to sidebar on mobile, open the drawer
                    if (newMode === 'sidebar' && isMobile) {
                        setTimeout(() => setMobileMenuOpen(true), 10);
                    }
                }}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400"
                title="Toggle Layout"
               >
                   <LayoutTemplate className="w-5 h-5" />
               </button>

               <button 
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${showRightPanel ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}
                title="Toggle Annotation List"
               >
                   {showRightPanel ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
               </button>
            </div>
        </div>

        {/* Workspace - Continuous Scroll */}
        <div 
             ref={workspaceRef}
             className={`flex-1 relative bg-gray-900/50 overflow-auto flex flex-col items-center p-4 md:p-8 gap-4 md:gap-8 min-h-0 ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''}`}
             style={{ 
                 backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', 
                 backgroundSize: '20px 20px',
                 ...styleConfig?.workspace
             }}
             onMouseDown={handleWorkspaceMouseDown}
             onMouseMove={handleWorkspaceMouseMove}
             onMouseUp={handleWorkspaceMouseUp}
             onMouseLeave={handleWorkspaceMouseUp}
             onScroll={handleScroll}
        >
            {pages.length === 0 && !isLoadingFile ? (
                <div className="text-center text-gray-500 my-auto mx-auto p-4">
                    <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">No Document Loaded</h2>
                    <p className="max-w-md mx-auto">Upload images or a PDF to start annotating.</p>
                </div>
            ) : isLoadingFile ? (
                <div className="flex flex-col items-center justify-center text-blue-400 my-auto mx-auto">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span className="text-lg font-medium">Loading Document...</span>
                </div>
            ) : (
                pages.map((page, index) => (
                    <PageRenderer
                        key={page.id}
                        page={page}
                        scale={scale}
                        tool={tool}
                        strokeWidth={strokeWidth}
                        fontSize={fontSize}
                        // Filter annotations for this page
                        annotations={annotations.filter(a => (a.page || 1) === page.pageNumber)}
                        onAnnotationsChange={(updatedPageAnns) => {
                             if(isViewOnly) return;
                             setAnnotations(prev => {
                                 // Remove old anns for this page, add updated ones
                                 const others = prev.filter(a => (a.page || 1) !== page.pageNumber);
                                 return [...others, ...updatedPageAnns];
                             });
                        }}
                        onAnnotationCreated={(ann) => {
                            if (!canDraw) return;
                            setSelectedAnnotationId(ann.id);
                            setNewAnnotationId(ann.id); 
                            setShowCommentModal(true);
                            events?.onAnnotationAdd?.(ann);
                        }}
                        onAnnotationUpdate={(ann) => {
                            if(!canEdit) return;
                            events?.onAnnotationUpdate?.(ann);
                        }}
                        onSelect={setSelectedAnnotationId}
                        selectedId={selectedAnnotationId}
                        severity={severity}
                        reasonCode={reasonCode}
                        isVisible={true}
                        currentColor={activeColor}
                        onDelete={(id) => deleteAnnotation(id)}
                        onEdit={() => setShowCommentModal(true)}
                        readOnly={layerReadOnly}
                    />
                ))
            )}
        </div>

        {layoutMode === 'bottom' && !showCamera && (
                <Toolbar 
                    currentTool={tool}
                    setTool={(t) => { setTool(t); if (t !== 'select') setSelectedAnnotationId(null); }}
                    currentStrokeWidth={strokeWidth}
                    setStrokeWidth={setStrokeWidth}
                    currentFontSize={fontSize}
                    setFontSize={setFontSize}
                    onClear={handleClear}
                    onSave={handleSave}
                    onLoad={handleLoad}
                    onFileChange={handleFileChange}
                    onAnalyze={handleAnalyze}
                    isAnalyzing={isAnalyzing}
                    hasFile={pages.length > 0}
                    scale={scale}
                    setScale={(newScale) => { setAutoFit(false); setScale(newScale); }}
                    onFitToScreen={handleFitToScreen}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                    selectedAnnotationId={selectedAnnotationId}
                    onDeleteSelected={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
                    onEditSelected={() => setShowCommentModal(true)}
                    severity={severity}
                    setSeverity={updateSelectedSeverity}
                    reasonCode={reasonCode}
                    setReasonCode={updateSelectedReasonCode}
                    customSeverityColors={severityOptions}
                    customReasonCodes={reasonCodeOptions}
                    style={styleConfig?.toolbar}
                    variant='bottom'
                    mode={mode}

                    // Camera & Thumbnails Props (Bottom toolbar needs them too)
                    showThumbnails={showThumbnails}
                    onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
                />
            )}

        {/* Right Panel: Annotation List */}
        {showRightPanel && (
            <div className={`
                fixed inset-y-0 right-0 z-40 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl transition-transform duration-300 w-80 
                ${isMobile ? 'top-14' : 'top-14'}
            `}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                         <ListChecks className="w-4 h-4" />
                         Annotations ({annotations.length})
                     </h3>
                     {isMobile && (
                         <button onClick={() => setShowRightPanel(false)}><X className="w-5 h-5 text-gray-500" /></button>
                     )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                    {annotations.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 text-sm">No annotations yet.</div>
                    ) : (
                        annotations.map((ann) => (
                            <div 
                                key={ann.id}
                                onClick={() => {
                                    scrollToPage((ann.page || 1) - 1);
                                    setSelectedAnnotationId(ann.id);
                                    if(isMobile) setShowRightPanel(false);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-800 ${
                                    selectedAnnotationId === ann.id 
                                    ? 'bg-gray-800 border-blue-500 shadow-lg' 
                                    : 'bg-gray-900 border-gray-700'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full mt-1 shrink-0" 
                                        style={{ backgroundColor: ann.color || severityOptions[4] }} 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-semibold text-gray-200 truncate">
                                                {ann.reasonCode || 'Uncategorized'}
                                            </span>
                                            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <MapPin className="w-2 h-2" />
                                                Pg {ann.page || 1}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">
                                            {ann.type === 'text' ? (ann as TextAnnotation).text : (ann.comment || 'No comments')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Comment Modal */}
        <CommentModal 
            key={selectedAnnotationId || 'modal'}
            isOpen={showCommentModal}
            onClose={handleCancelModal}
            onSave={handleSaveModal}
            onDelete={() => {
                if (selectedAnnotationId) {
                    deleteAnnotation(selectedAnnotationId); 
                    setShowCommentModal(false);
                }
            }}
            initialData={{
                comment: selectedAnnotation?.comment || "",
                severity: selectedAnnotation?.severity || severity,
                reasonCode: selectedAnnotation?.reasonCode || reasonCode,
                status: selectedAnnotation?.status || 'New',
                text: (selectedAnnotation as TextAnnotation)?.text || "",
                type: selectedAnnotation?.type,
                isNew: selectedAnnotationId === newAnnotationId
            }}
            severityOptions={severityOptions}
            reasonCodeOptions={reasonCodeOptions}
            statusOptions={statusOptions}
            readOnly={modalReadOnly}
        />

        {/* Camera Modal */}
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
