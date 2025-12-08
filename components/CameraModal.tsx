
import React, { useRef, useEffect, useState } from 'react';
import { X, Check, RefreshCw, AlertCircle, ZoomIn, ZoomOut, ScanEye } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stream State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Capability State
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [isNativeZoom, setIsNativeZoom] = useState(false);

  // Digital Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    setPan({ x: 0, y: 0 });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API is not supported. Use HTTPS.");
      setIsLoading(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 }, // Prefer high res for quality zoom
          height: { ideal: 1080 }
        }, 
        audio: false 
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      handleStreamSuccess(mediaStream);
    } catch (err: any) {
      console.warn("Environment camera failed, trying default...", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        handleStreamSuccess(fallbackStream);
      } catch (fallbackErr: any) {
        console.error("Camera access error:", fallbackErr);
        handleError(fallbackErr);
      }
    }
  };

  const handleStreamSuccess = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
    
    // Check Native Zoom Capability
    const track = mediaStream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const extendedCaps = caps as any;

    if (extendedCaps.zoom) {
      setIsNativeZoom(true);
      setMinZoom(extendedCaps.zoom.min || 1);
      setMaxZoom(extendedCaps.zoom.max || 10);
      setZoom(extendedCaps.zoom.min || 1);
    } else {
      setIsNativeZoom(false);
      setMinZoom(1);
      setMaxZoom(5); // Digital zoom up to 5x
      setZoom(1);
    }

    setIsLoading(false);
  };

  const handleError = (err: any) => {
    setIsLoading(false);
    setError("Could not start camera. Please check permissions.");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // --- Controls ---

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);

    // If native, apply to hardware
    if (isNativeZoom && stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ zoom: newZoom } as any] });
      } catch (err) {
        console.warn("Native zoom failed", err);
      }
    } else {
        // Digital zoom handles via CSS & Canvas Crop
        // Reset pan if zooming out to 1
        if (newZoom === 1) setPan({ x: 0, y: 0 });
    }
  };

  const triggerFocus = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
        // Attempt to trigger focus
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
    } catch (e) {
        // Ignore focus errors
    }
  };

  // --- Panning Logic ---

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isNativeZoom && zoom > 1 && !capturedImage) {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
        setPan({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };


  // --- Capture Logic ---

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Case 1: Native Hardware Zoom
      // The video feed is already zoomed. Capture full frame.
      if (isNativeZoom || zoom === 1) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } 
      // Case 2: Digital Zoom
      // We need to crop the high-res video source to match what the user sees in the viewport.
      else {
          // 1. Calculate the resolution of the source video
          const vW = video.videoWidth;
          const vH = video.videoHeight;

          // 2. Calculate the dimensions of the "Viewport" in source pixels
          //    e.g. if Zoom is 2x, we see 1/2 of the width.
          const sWidth = vW / zoom;
          const sHeight = vH / zoom;

          // 3. Calculate Layout Ratio to map Screen Pan (pixels) to Video Pan (pixels)
          //    video.offsetWidth is the rendered width on screen.
          const layoutW = video.offsetWidth;
          const layoutH = video.offsetHeight;
          const scaleX = vW / layoutW;
          const scaleY = vH / layoutH;

          // 4. Calculate Origin (Top-Left) of the crop
          //    Start with center crop
          let sx = (vW - sWidth) / 2;
          let sy = (vH - sHeight) / 2;

          //    Apply Pan adjustment
          //    Note: Panning +100px on screen means moving the viewport RIGHT.
          //    Moving viewport RIGHT means the source window x DECREASES relative to image?
          //    CSS Translate moves the element. If I translate +X, I see the left side? No.
          //    Let's visualize:
          //    Image is scaled up. We see center.
          //    Translate(+X) moves the image right. We see the LEFT side of the image.
          //    So the source window moves LEFT (-X).
          //    However, `pan.x` is divided by `zoom` in the CSS transform `translate(${pan.x / zoom}px)`.
          //    So effective screen shift is `pan.x / zoom`.
          
          const panXInSourcePixels = (pan.x / zoom) * scaleX;
          const panYInSourcePixels = (pan.y / zoom) * scaleY;

          // If we move Image RIGHT (+Pan), we need to capture coordinates to the LEFT (-Sx)
          sx -= panXInSourcePixels;
          sy -= panYInSourcePixels;

          // 5. Clamp to bounds (prevent capturing outside video)
          if (sx < 0) sx = 0;
          if (sy < 0) sy = 0;
          if (sx + sWidth > vW) sx = vW - sWidth;
          if (sy + sHeight > vH) sy = vH - sHeight;

          // 6. Draw Cropped Region
          //    We keep canvas size equal to video source resolution for quality, 
          //    or we could reduce it. Let's keep high res but cropped aspect.
          //    Actually, let's make the output canvas the size of the crop (so it acts like a true zoom).
          canvas.width = sWidth;
          canvas.height = sHeight;

          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
        
        {/* Top Bar (Actions) */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent h-28 pointer-events-none">
             <div className="pointer-events-auto">
                {!capturedImage && (
                    <button 
                        onClick={triggerFocus}
                        className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/70 transition-all border border-white/20 shadow-lg"
                        title="Attempt Focus"
                    >
                        <ScanEye className="w-6 h-6" />
                    </button>
                )}
             </div>

             <button 
                onClick={onClose}
                className="pointer-events-auto bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-red-900/80 hover:text-white transition-all border border-white/20 shadow-lg"
                title="Close Camera"
             >
                <X className="w-6 h-6" />
             </button>
        </div>

        {/* Viewport */}
        <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {isLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-400 z-20 bg-gray-900">
                     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <span className="font-medium text-white tracking-widest uppercase text-sm">Initializing Camera</span>
                 </div>
            )}

            {error ? (
                <div className="text-red-400 p-6 text-center max-w-xs mx-auto z-20 bg-gray-800 rounded-xl border border-red-900/50 shadow-2xl">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-bold mb-2">Camera Error</p>
                    <p className="text-sm opacity-90">{error}</p>
                    <button onClick={startCamera} className="mt-6 px-4 py-2 bg-red-900/50 hover:bg-red-900 rounded text-white text-sm border border-red-800">Retry</button>
                </div>
            ) : capturedImage ? (
                // Review Captured Image: Display WITHOUT transforms, as the image is already cropped
                <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
            ) : (
                // Live Video Feed: Use max-w/max-h to ensure element size matches content aspect ratio
                // This is crucial for accurate digital zoom calculations
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out shadow-2xl"
                    style={{ 
                        transform: !isNativeZoom ? `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` : 'none',
                    }}
                />
            )}
            <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Bottom Bar (Controls) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md pt-6 pb-8 px-6 flex flex-col gap-6 rounded-t-3xl border-t border-white/10">
            
            {/* Zoom Slider (Live only) */}
            {!capturedImage && !error && !isLoading && (
                <div className="flex items-center gap-4 px-4 max-w-md mx-auto w-full">
                    <ZoomOut className="w-5 h-5 text-gray-400" />
                    <input 
                        type="range" 
                        min={minZoom} 
                        max={maxZoom} 
                        step={0.1} 
                        value={zoom} 
                        onChange={handleZoomChange}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <ZoomIn className="w-5 h-5 text-gray-400" />
                    <span className="text-xs font-mono text-gray-300 w-8 text-right">{zoom.toFixed(1)}x</span>
                </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex items-center justify-center w-full">
                {capturedImage ? (
                    // REVIEW MODE: OK / Retake Buttons
                    <div className="flex gap-4 w-full max-w-md animate-in slide-in-from-bottom-5">
                        <button 
                            onClick={handleRetake}
                            className="flex-1 py-4 bg-gray-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-600 active:scale-95 transition-all"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Retake
                        </button>

                        <button 
                            onClick={handleConfirm}
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/30 active:scale-95 transition-all"
                        >
                            <Check className="w-5 h-5" />
                            Use Photo
                        </button>
                    </div>
                ) : (
                    // LIVE MODE
                    <div className="grid grid-cols-3 items-center w-full max-w-md mx-auto">
                        <div className="flex justify-start">
                             <button 
                                onClick={onClose}
                                className="text-white font-medium text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 rounded-full transition-all"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={handleCapture}
                                disabled={!!error || isLoading}
                                className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-red-600"
                                aria-label="Take Photo"
                            >
                                <div className="w-16 h-16 rounded-full bg-white transition-all duration-150 active:scale-90 shadow-inner" />
                            </button>
                        </div>

                         <div className="flex justify-end pointer-events-none">
                            <div className="w-16"></div> 
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default CameraModal;
