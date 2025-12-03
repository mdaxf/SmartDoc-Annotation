
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AnnotationLayer from './components/AnnotationLayer';
import Toolbar from './components/Toolbar';
import { Annotation, ToolType, SmartDocProps } from './types';
import { analyzeImageForAnnotations } from './services/geminiService';
import { Code, Info, MessageSquare, Trash2, X, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, ListChecks, Activity } from 'lucide-react';
import { getColorForSeverity, REASON_CODES, SEVERITY_COLORS, STATUS_OPTIONS } from './constants';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

// Enhanced Modal Component
interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { comment: string; severity: number; reasonCode: string; status: string }) => void;
  initialData: {
    comment: string;
    severity: number;
    reasonCode: string;
    status: string;
  };
  severityOptions: Record<number, string>;
  reasonCodeOptions: string[];
  statusOptions: string[];
}

const CommentModal: React.FC<CommentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  severityOptions,
  reasonCodeOptions,
  statusOptions
}) => {
  const [formData, setFormData] = useState(initialData);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const severityLevels = Object.keys(severityOptions).map(Number).sort((a,b) => a - b);

  useEffect(() => {
    if (isOpen) {
        setFormData(initialData);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
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
            
            {/* Severity Selection */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Severity
                </label>
                <div className="flex gap-2 flex-wrap">
                    {severityLevels.map(s => (
                        <button
                            key={s}
                            onClick={() => setFormData(prev => ({ ...prev, severity: s }))}
                            className={`flex-1 py-2 min-w-[3rem] rounded-md text-sm font-bold border-2 transition-all ${
                                formData.severity === s 
                                ? 'border-white scale-105 shadow-lg' 
                                : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
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
                {/* Reason Code */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <ListChecks className="w-3 h-3" />
                        Reason Code
                    </label>
                    <select 
                        value={formData.reasonCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, reasonCode: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                    >
                        {reasonCodeOptions.map(code => (
                            <option key={code} value={code}>{code}</option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Status
                    </label>
                    <select 
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                    >
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Comment Area */}
            <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Comment
                </label>
                <textarea
                    ref={inputRef}
                    className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder-gray-600 text-sm"
                    placeholder="Enter your comment here..."
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSave(formData);
                        }
                    }}
                />
            </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button 
              onClick={() => onSave(formData)} 
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SmartDocApp: React.FC<SmartDocProps> = ({
    documentSrc,
    initialAnnotations = [],
    severityOptions = SEVERITY_COLORS,
    reasonCodeOptions = REASON_CODES,
    statusOptions = STATUS_OPTIONS,
    hideLoadFileBtn,
    hideSaveJsonBtn,
    hideLoadJsonBtn,
    styleConfig,
    events
}) => {
  // Application State
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [tool, setTool] = useState<ToolType>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [scale, setScale] = useState<number>(1);
  const [autoFit, setAutoFit] = useState<boolean>(true); // Responsive auto-fit state
  
  // Defect/Severity State
  const [severity, setSeverity] = useState<number>(4); // Default 4
  const [reasonCode, setReasonCode] = useState<string>(reasonCodeOptions[0]);

  // Selection & Editing State
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  // File State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string>("Untitled");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);

  // UI State
  const [showJson, setShowJson] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Panning State
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  // Handle Initial Annotations Event
  useEffect(() => {
    if (initialAnnotations.length > 0 && events?.onAnnotationsReady) {
        events.onAnnotationsReady();
    }
  }, []); // Run once

  // Calculate best fit scale for the current container and content
  const calculateBestFit = useCallback((contentWidth: number, contentHeight: number) => {
    if (!workspaceRef.current || contentWidth === 0 || contentHeight === 0) return 1;
    
    const { clientWidth, clientHeight } = workspaceRef.current;
    const padding = 64; // Approx padding
    const availableWidth = Math.max(100, clientWidth - padding);
    const availableHeight = Math.max(100, clientHeight - padding);

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    
    // Fit entirely within view (contain), but max out at 1.0 (100%) to prevent upscaling blurriness
    // unless the container is very small, then allow downscale.
    // Actually, fit to page usually implies shrinking large images to fit.
    return Math.min(1, Math.min(scaleX, scaleY));
  }, []);

  // Responsive Resize Observer
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const resizeObserver = new ResizeObserver(() => {
        if (autoFit && dimensions.width > 0 && dimensions.height > 0) {
            const newScale = calculateBestFit(dimensions.width, dimensions.height);
            setScale(newScale);
        }
    });

    resizeObserver.observe(workspace);
    return () => resizeObserver.disconnect();
  }, [autoFit, dimensions, calculateBestFit]);

  // Handle Document Auto-Load
  useEffect(() => {
    if (documentSrc) {
        const loadFromUrl = async () => {
            setIsLoadingFile(true);
            try {
                const response = await fetch(documentSrc);
                const blob = await response.blob();
                const fileType = documentSrc.toLowerCase().endsWith('.pdf') || blob.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
                
                const file = new File([blob], documentSrc.split('/').pop() || 'document', { type: fileType });
                
                // Reuse existing load logic by creating a synthetic event
                const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileChange(event);
            } catch (err) {
                console.error("Failed to auto-load document:", err);
                setIsLoadingFile(false);
            }
        };
        loadFromUrl();
    }
  }, [documentSrc]);

  // Handle Ctrl + Scroll for Zoom
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.1;
        setAutoFit(false); // Disable auto-fit on manual zoom
        setScale(prev => {
          const next = Math.max(0.1, Math.min(5, prev + delta));
          return Number(next.toFixed(1));
        });
      }
    };

    workspace.addEventListener('wheel', handleWheel, { passive: false });
    return () => workspace.removeEventListener('wheel', handleWheel);
  }, []);

  // Sync Toolbar with Selected Annotation
  useEffect(() => {
    if (selectedAnnotationId) {
      const ann = annotations.find(a => a.id === selectedAnnotationId);
      if (ann) {
        if (ann.severity) setSeverity(ann.severity);
        if (ann.reasonCode) setReasonCode(ann.reasonCode);
      }
    }
  }, [selectedAnnotationId, annotations]);

  // Update Selected Annotation when Toolbar Changes
  const updateSelectedSeverity = (newSeverity: number) => {
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
      if (updatedAnn) {
          const ann = updatedAnn;
          requestAnimationFrame(() => events?.onAnnotationUpdate?.(ann));
      }
    }
  };

  const updateSelectedReasonCode = (newCode: string) => {
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
      if (updatedAnn) {
        const ann = updatedAnn;
        requestAnimationFrame(() => events?.onAnnotationUpdate?.(ann));
      }
    }
  };

  // Helper
  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

  // PDF Page Renderer
  const renderPdfPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
      setIsLoadingFile(true);
      try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // Render at 2x quality
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error("Could not get canvas context");

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport } as any).promise;

          const imgData = canvas.toDataURL('image/jpeg');
          setImageSrc(imgData); // Trigger background update
          
          const img = new Image();
          img.src = imgData;
          img.onload = () => {
              setBgImage(img);
              setDimensions({ width: viewport.width, height: viewport.height });
              
              if (autoFit) {
                  const fitScale = calculateBestFit(viewport.width, viewport.height);
                  setScale(fitScale);
              }
              setIsLoadingFile(false);
              events?.onDocumentReady?.();
          };
      } catch (err) {
          console.error("Error rendering PDF page", err);
          setIsLoadingFile(false);
      }
  };

  const changePage = (delta: number) => {
      if (!pdfDoc) return;
      const newPage = currentPage + delta;
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
          setSelectedAnnotationId(null);
          renderPdfPage(pdfDoc, newPage);
      }
  };

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAnnotations([]); // Clear annotations for new file
    events?.onClearAnnotations?.();
    
    setSelectedAnnotationId(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setIsLoadingFile(true);
    setAutoFit(true); // Reset to auto-fit for new document

    if (file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            
            await renderPdfPage(pdf, 1);
        } catch (error) {
            console.error("Error loading PDF", error);
            alert("Failed to load PDF file.");
            setIsLoadingFile(false);
        }
    } else if (file.type.includes('image')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            setImageSrc(src);
            
            const img = new Image();
            img.src = src;
            img.onload = () => {
                setBgImage(img);
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                setDimensions({ width: w, height: h });
                
                // Calculate Scale to Fit based on container
                const fitScale = calculateBestFit(w, h);
                setScale(fitScale);

                setIsLoadingFile(false);
                events?.onDocumentReady?.();
            };
        };
        reader.readAsDataURL(file);
    } else {
        alert("Unsupported file type. Please use Image or PDF.");
        setIsLoadingFile(false);
    }
  };

  const handleSave = () => {
    const data = {
      file: fileName,
      annotations,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-annotations.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (!imageSrc) return;
    setIsAnalyzing(true);
    try {
        const newAnnotations = await analyzeImageForAnnotations(imageSrc, dimensions.width, dimensions.height);
        // Add current page info and default severity to new annotations
        const pageAnnotations = newAnnotations.map(a => ({
             ...a,
             page: currentPage,
             severity: severity,
             reasonCode: reasonCode,
             color: severityOptions[severity] || severityOptions[4],
             status: 'New'
        }));
        
        // Auto-generated annotations event loop
        pageAnnotations.forEach(ann => events?.onAnnotationAdd?.(ann));
        
        setAnnotations(prev => [...prev, ...pageAnnotations]);
    } catch (error) {
        alert("Gemini Analysis Failed. Check console or API Key.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const deleteAnnotation = (id: string) => {
      setAnnotations(prev => prev.filter(a => a.id !== id));
      if (selectedAnnotationId === id) setSelectedAnnotationId(null);
      events?.onAnnotationDelete?.(id);
  };

  const handleCancelModal = () => {
    // If we are cancelling the creation of a new annotation, delete it
    if (newAnnotationId && selectedAnnotationId === newAnnotationId) {
        deleteAnnotation(newAnnotationId);
    }
    setNewAnnotationId(null);
    setShowCommentModal(false);
  };

  const handleSaveModal = (data: { comment: string; severity: number; reasonCode: string; status: string }) => {
      if (selectedAnnotationId) {
          let updatedAnnotation: Annotation | undefined;
          
          setAnnotations(prev => {
              const updated = prev.map(a => {
                  if (a.id === selectedAnnotationId) {
                      updatedAnnotation = { 
                          ...a, 
                          comment: data.comment,
                          severity: data.severity,
                          reasonCode: data.reasonCode,
                          status: data.status,
                          color: severityOptions[data.severity] || severityOptions[4]
                      };
                      return updatedAnnotation;
                  }
                  return a;
              });
              return updated;
          });
          
          // Also update global state for continuity
          setSeverity(data.severity);
          setReasonCode(data.reasonCode);
          
          // Emit update event
          if (updatedAnnotation) {
              const ann = updatedAnnotation;
              requestAnimationFrame(() => events?.onAnnotationUpdate?.(ann));
          }
      }
      setNewAnnotationId(null); // The annotation is now committed
      setShowCommentModal(false);
  };

  // Get position for floating menu relative to the container
  const getFloatingMenuPosition = () => {
      if (!selectedAnnotation) return { top: 0, left: 0 };
      
      let x = 0;
      let y = 0;
      
      if (selectedAnnotation.type === 'pen') {
          const p = (selectedAnnotation as any).points[0];
          x = p.x;
          y = p.y;
      } else {
          // @ts-ignore
          x = selectedAnnotation.x;
          // @ts-ignore
          y = selectedAnnotation.y;
      }
      
      return { top: y * scale, left: x * scale };
  };

  // Hand Tool Pan Logic
  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
      if (tool === 'hand' && workspaceRef.current) {
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setScrollStart({ 
              left: workspaceRef.current.scrollLeft, 
              top: workspaceRef.current.scrollTop 
          });
          e.preventDefault(); // Prevent text selection
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

  const handleWorkspaceMouseUp = () => {
      setIsPanning(false);
  };
  
  const handleClear = () => {
      setAnnotations(prev => prev.filter(a => (a.page || 1) !== currentPage));
      setSelectedAnnotationId(null);
      events?.onClearAnnotations?.();
  };
  
  const handleFitToScreen = () => {
      setAutoFit(true);
      const newScale = calculateBestFit(dimensions.width, dimensions.height);
      setScale(newScale);
  };

  // Filter Annotations for View
  // Defaults to page 1 for images or undefined
  const visibleAnnotations = annotations.filter(a => {
      const annPage = a.page || 1;
      return annPage === currentPage;
  });

  return (
    <div className="flex w-full h-full bg-gray-900 text-gray-100 font-sans overflow-hidden" style={styleConfig?.container}>
      
      {/* Sidebar Toolbar */}
      <Toolbar 
        currentTool={tool}
        setTool={(t) => {
             setTool(t);
             if (t !== 'select') setSelectedAnnotationId(null);
        }}
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
        hasFile={!!imageSrc}
        scale={scale}
        setScale={(newScale) => {
            setAutoFit(false);
            setScale(newScale);
        }}
        onFitToScreen={handleFitToScreen}
        // Props
        severity={severity}
        setSeverity={updateSelectedSeverity}
        reasonCode={reasonCode}
        setReasonCode={updateSelectedReasonCode}
        // Custom
        hideLoadFileBtn={!!documentSrc || hideLoadFileBtn}
        hideSaveJsonBtn={hideSaveJsonBtn}
        hideLoadJsonBtn={hideLoadJsonBtn}
        customSeverityColors={severityOptions}
        customReasonCodes={reasonCodeOptions}
        style={styleConfig?.toolbar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={styleConfig?.layout}>
        
        {/* Top Header */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shadow-md z-10 shrink-0">
            <div className="flex items-center gap-3">
               <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                 SmartDoc Annotator
               </span>
               <span className="text-gray-500 text-sm">|</span>
               <span className="text-gray-300 text-sm font-medium truncate max-w-xs">{fileName}</span>
            </div>
            
            {/* PDF Pagination Controls */}
            {totalPages > 0 && (
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                        onClick={() => changePage(-1)}
                        disabled={currentPage <= 1 || isLoadingFile}
                        className="p-1 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-mono w-20 text-center text-gray-200">
                         {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={() => changePage(1)}
                        disabled={currentPage >= totalPages || isLoadingFile}
                        className="p-1 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-4">
               <button 
                onClick={() => setShowJson(!showJson)}
                className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${showJson ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}
                title="Toggle JSON View"
               >
                   <Code className="w-5 h-5" />
               </button>
            </div>
        </div>

        {/* Workspace */}
        <div 
             ref={workspaceRef}
             className={`flex-1 relative bg-gray-900/50 overflow-auto flex p-8 ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''}`}
             style={{ 
                 backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', 
                 backgroundSize: '20px 20px',
                 ...styleConfig?.workspace
             }}
             onMouseDown={handleWorkspaceMouseDown}
             onMouseMove={handleWorkspaceMouseMove}
             onMouseUp={handleWorkspaceMouseUp}
             onMouseLeave={handleWorkspaceMouseUp}
        >
            {!imageSrc && !isLoadingFile ? (
                <div className="text-center text-gray-500 my-auto mx-auto">
                    <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">No Document Loaded</h2>
                    <p className="max-w-md mx-auto">Upload an image (PNG, JPG) or PDF to start annotating. <br/> Use the toolbar on the left to load a file.</p>
                </div>
            ) : isLoadingFile ? (
                <div className="flex flex-col items-center justify-center text-blue-400 my-auto mx-auto">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span className="text-lg font-medium">Loading Document...</span>
                </div>
            ) : (
                <div 
                    className="relative shadow-2xl transition-all duration-100 ease-out" 
                    style={{ 
                        width: dimensions.width * scale, 
                        height: dimensions.height * scale,
                        margin: 'auto', // Keeps centered when smaller than viewport
                        flexShrink: 0   // Prevents crushing when zoomed out or in small window
                    }}
                >
                   <AnnotationLayer 
                        width={dimensions.width}
                        height={dimensions.height}
                        tool={tool}
                        strokeWidth={strokeWidth}
                        fontSize={fontSize}
                        annotations={visibleAnnotations}
                        onAnnotationsChange={(updatedVisible) => {
                            // Merge visible updates back into main list
                            setAnnotations(prev => {
                                // Remove current page's annotations from main list
                                const otherPages = prev.filter(a => (a.page || 1) !== currentPage);
                                // Combine. The updatedVisible items already have page prop from AnnotationLayer.
                                return [...otherPages, ...updatedVisible];
                            });
                        }}
                        onAnnotationCreated={(ann) => {
                            // Note: 'ann' already has 'page' from AnnotationLayer
                            setSelectedAnnotationId(ann.id);
                            setNewAnnotationId(ann.id); 
                            setShowCommentModal(true);
                            events?.onAnnotationAdd?.(ann);
                        }}
                        onAnnotationUpdate={(ann) => {
                            events?.onAnnotationUpdate?.(ann);
                        }}
                        onSelect={setSelectedAnnotationId}
                        selectedId={selectedAnnotationId}
                        backgroundImage={bgImage}
                        scale={scale}
                        page={currentPage}
                        severity={severity}
                        reasonCode={reasonCode}
                   />

                   {/* Floating Context Menu for Selected Annotation */}
                   {selectedAnnotationId && selectedAnnotation && tool !== 'hand' && (
                       <div 
                         className="absolute z-10 flex flex-col gap-1 p-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl animate-in zoom-in-95 duration-100"
                         style={{ 
                             // Position based on scale
                             top: Math.max(0, getFloatingMenuPosition().top - 50), 
                             left: getFloatingMenuPosition().left 
                         }}
                       >
                           <div className="flex gap-1">
                                <button 
                                    onClick={() => setShowCommentModal(true)}
                                    className="p-2 text-blue-400 hover:bg-gray-700 rounded transition-colors"
                                    title="Edit Comment"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => deleteAnnotation(selectedAnnotationId)}
                                    className="p-2 text-red-400 hover:bg-gray-700 rounded transition-colors"
                                    title="Delete Annotation"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                           </div>
                       </div>
                   )}
                </div>
            )}
        </div>

        {/* JSON Overlay Panel */}
        {showJson && (
            <div className="absolute top-14 right-0 bottom-0 w-80 bg-gray-900/95 border-l border-gray-700 backdrop-blur-sm p-4 overflow-auto shadow-2xl z-20 transition-transform animate-in slide-in-from-right">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Annotation Data</h3>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(annotations, null, 2)}
                </pre>
            </div>
        )}

        {/* Comment Modal */}
        <CommentModal 
            key={selectedAnnotationId || 'modal'}
            isOpen={showCommentModal}
            onClose={handleCancelModal}
            onSave={handleSaveModal}
            initialData={{
                comment: selectedAnnotation?.comment || "",
                severity: selectedAnnotation?.severity || severity,
                reasonCode: selectedAnnotation?.reasonCode || reasonCode,
                status: selectedAnnotation?.status || 'New'
            }}
            severityOptions={severityOptions}
            reasonCodeOptions={reasonCodeOptions}
            statusOptions={statusOptions}
        />

      </div>
    </div>
  );
};

export default SmartDocApp;
