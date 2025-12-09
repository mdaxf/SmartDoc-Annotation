
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, ToolType, Point, RectAnnotation, CircleAnnotation, PenAnnotation, TextAnnotation, ArrowAnnotation } from '../types';
import { isPointInRect, isPointInCircle, isPointNearPath, isPointInText, isPointNearLine } from '../utils/geometry';
import { Pencil, Trash2, MessageSquare } from 'lucide-react';

interface AnnotationLayerProps {
  width: number;
  height: number;
  documentId: string;
  tool: ToolType;
  strokeWidth: number;
  fontSize: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void; 
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  // backgroundImage prop removed - handled in parent for performance
  scale: number;
  page: number;
  
  severity: number;
  reasonCode: string;
  currentColor: string;

  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  
  readOnly?: boolean;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  width,
  height,
  documentId,
  tool,
  strokeWidth,
  fontSize,
  annotations,
  onAnnotationsChange,
  onAnnotationCreated,
  onAnnotationUpdate,
  onSelect,
  selectedId,
  scale,
  page,
  severity,
  reasonCode,
  currentColor,
  onDelete,
  onEdit,
  readOnly
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [draggedAnnotationId, setDraggedAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const requestRef = useRef<number>(0);

  // Dynamic High DPI scaling
  // Cap at 3x to prevent massive canvas memory usage on high-density mobile screens
  const renderScale = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); // optimize for transparency
    if (!ctx) return;

    // Clear the full high-res buffer
    ctx.clearRect(0, 0, width * renderScale, height * renderScale);
    ctx.save();
    
    // Scale context to match logical coordinates
    ctx.scale(renderScale, renderScale);
    
    // NOTE: Background image is now rendered via DOM/CSS in PageRenderer for performance.
    // We only draw vector shapes here.

    [...annotations, currentAnnotation].forEach((ann) => {
      if (!ann) return;
      
      const isSelected = ann.id === selectedId;
      
      ctx.save();
      ctx.beginPath();
      
      if (isSelected) {
          ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
          ctx.shadowBlur = 10; // Reduced blur radius for perf
          ctx.strokeStyle = '#00ffff';
      } else {
          ctx.strokeStyle = ann.color;
      }
      
      ctx.lineWidth = ann.strokeWidth;
      ctx.fillStyle = ann.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let textPos = { x: 0, y: 0 };

      if (ann.type === 'rect') {
        const r = ann as RectAnnotation;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        textPos = { x: r.x, y: r.y };
        
        const labelText = r.label || ann.reasonCode;
        if (labelText) {
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = isSelected ? '#00ffff' : r.color;
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.strokeText(labelText, r.x, r.y - 8);
          ctx.fillText(labelText, r.x, r.y - 8);
        }
      } else if (ann.type === 'circle') {
        const c = ann as CircleAnnotation;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, 2 * Math.PI);
        ctx.stroke();
        textPos = { x: c.x - c.radius, y: c.y - c.radius };
      } else if (ann.type === 'pen') {
        const p = ann as PenAnnotation;
        if (p.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(p.points[0].x, p.points[0].y);
          // Optimize large paths: only draw if visible? (Future)
          // Basic reduction: skip redundant points?
          for (let i = 1; i < p.points.length; i++) {
            ctx.lineTo(p.points[i].x, p.points[i].y);
          }
          ctx.stroke();
          textPos = p.points[0];
        }
      } else if (ann.type === 'arrow') {
        const a = ann as ArrowAnnotation;
        const [start, end] = a.points;
        const headLength = 15 + (a.strokeWidth * 1.5); 
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        
        // Draw Line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Draw Arrowhead
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        
        textPos = start;
      } else if (ann.type === 'text') {
        const t = ann as TextAnnotation;
        ctx.font = `${t.fontSize}px sans-serif`;
        
        const lines = t.text.split('\n');
        const lineHeight = t.fontSize * 1.2;
        
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;

        lines.forEach((line, i) => {
            const yPos = t.y + (i * lineHeight);
            ctx.strokeText(line, t.x, yPos);
            ctx.fillStyle = isSelected ? '#00ffff' : ann.color;
            ctx.fillText(line, t.x, yPos);
        });

        textPos = { x: t.x, y: t.y };
        
        if (isSelected) {
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                if (metrics.width > maxWidth) maxWidth = metrics.width;
            });
            const totalHeight = lines.length * lineHeight;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1; // Thinner selection box
            ctx.strokeRect(t.x - 4, t.y - t.fontSize, maxWidth + 8, totalHeight + (t.fontSize * 0.2)); 
        }
      }

      // Render Comment/Status Overlay
      if (ann.type !== 'text') {
          const displayContent = [
            ann.status ? `[${ann.status}]` : '',
            ann.comment
          ].filter(s => s && s.toString().trim().length > 0).join(' ');

          if (displayContent) {
              ctx.font = "bold 14px sans-serif";
              let drawX = textPos.x;
              let drawY = textPos.y - 22; 
              ctx.textBaseline = "middle";
              ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
              ctx.lineWidth = 3;
              ctx.strokeText(displayContent, drawX, drawY);
              ctx.fillStyle = ann.color;
              ctx.fillText(displayContent, drawX, drawY);
              ctx.textBaseline = "alphabetic";
          }
      }

      ctx.restore();
    });

    ctx.restore();
  }, [width, height, annotations, currentAnnotation, selectedId, renderScale]); // Removed backgroundImage dependency

  // Use requestAnimationFrame for smooth drawing
  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(requestRef.current);
  }, [renderCanvas]);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'hand') return;

    const point = getCanvasPoint(e);

    if (tool === 'select') {
      let foundHit = false;
      // Reverse loop to select top-most element first
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        let hit = false;
        
        const ctx = canvasRef.current?.getContext('2d');

        if (ann.type === 'rect') hit = isPointInRect(point, ann as RectAnnotation);
        else if (ann.type === 'circle') hit = isPointInCircle(point, ann as CircleAnnotation);
        else if (ann.type === 'pen') hit = isPointNearPath(point, ann as PenAnnotation);
        else if (ann.type === 'arrow') hit = isPointNearLine(point, ann as ArrowAnnotation);
        else if (ann.type === 'text' && ctx) {
             ctx.save();
             // Reset transform to identity to measure text in logical pixels, ignoring renderScale
             ctx.setTransform(1, 0, 0, 1, 0, 0); 
             hit = isPointInText(point, ann as TextAnnotation, ctx);
             ctx.restore();
        }

        if (hit) {
          foundHit = true;
          if (onSelect) onSelect(ann.id);
          if (!readOnly) {
              setDraggedAnnotationId(ann.id);
              if (ann.type === 'rect' || ann.type === 'text') {
                 setDragOffset({ x: point.x - ann.x, y: point.y - ann.y });
              } else if (ann.type === 'circle') {
                 setDragOffset({ x: point.x - (ann as CircleAnnotation).x, y: point.y - (ann as CircleAnnotation).y });
              } else if (ann.type === 'pen' || ann.type === 'arrow') {
                 setDragOffset({ x: point.x, y: point.y }); 
              }
          }
          break;
        }
      }
      
      if (!foundHit && onSelect) {
          onSelect(null);
      }
      return;
    }

    if (readOnly) return;

    if (tool === 'text') {
       const newAnn: TextAnnotation = {
           id: generateId(),
           documentId,
           type: 'text',
           x: point.x,
           y: point.y,
           text: "Enter Text",
           color: currentColor,
           strokeWidth: 1, 
           fontSize,
           page,
           severity,
           reasonCode,
           status: 'New'
       };
       onAnnotationsChange([...annotations, newAnn]);
       onAnnotationCreated?.(newAnn);
       return;
    }

    setIsDrawing(true);
    setStartPoint(point);
    if (onSelect) onSelect(null);

    const baseAnn = {
      id: generateId(),
      documentId,
      color: currentColor,
      strokeWidth,
      page,
      severity,
      reasonCode,
      status: 'New'
    };

    if (tool === 'rect') {
      setCurrentAnnotation({ ...baseAnn, type: 'rect', x: point.x, y: point.y, width: 0, height: 0 } as RectAnnotation);
    } else if (tool === 'circle') {
      setCurrentAnnotation({ ...baseAnn, type: 'circle', x: point.x, y: point.y, radius: 0 } as CircleAnnotation);
    } else if (tool === 'pen') {
      setCurrentAnnotation({ ...baseAnn, type: 'pen', points: [point] } as PenAnnotation);
    } else if (tool === 'arrow') {
      setCurrentAnnotation({ ...baseAnn, type: 'arrow', points: [point, point] } as ArrowAnnotation);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === 'hand') return;
    if (readOnly) return;

    const point = getCanvasPoint(e);

    if (draggedAnnotationId) {
        const updated = annotations.map(ann => {
            if (ann.id !== draggedAnnotationId) return ann;
            
            if (ann.type === 'rect' || ann.type === 'text') {
                return { ...ann, x: point.x - dragOffset.x, y: point.y - dragOffset.y };
            }
            if (ann.type === 'circle') {
                return { ...ann, x: point.x - dragOffset.x, y: point.y - dragOffset.y };
            }
            if (ann.type === 'pen') {
                const pen = ann as PenAnnotation;
                const dx = point.x - dragOffset.x;
                const dy = point.y - dragOffset.y;
                const newPoints = pen.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                setDragOffset({ x: point.x, y: point.y }); 
                return { ...ann, points: newPoints };
            }
            if (ann.type === 'arrow') {
                const arr = ann as ArrowAnnotation;
                const dx = point.x - dragOffset.x;
                const dy = point.y - dragOffset.y;
                const newPoints = arr.points.map(p => ({ x: p.x + dx, y: p.y + dy })) as [Point, Point];
                setDragOffset({ x: point.x, y: point.y });
                return { ...ann, points: newPoints };
            }
            return ann;
        });
        onAnnotationsChange(updated);
        return;
    }

    if (!isDrawing || !startPoint || !currentAnnotation) return;

    if (tool === 'rect') {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: point.x - startPoint.x,
        height: point.y - startPoint.y
      } as RectAnnotation);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
      setCurrentAnnotation({
        ...currentAnnotation,
        radius
      } as CircleAnnotation);
    } else if (tool === 'pen') {
      const pen = currentAnnotation as PenAnnotation;
      setCurrentAnnotation({
        ...pen,
        points: [...pen.points, point]
      });
    } else if (tool === 'arrow') {
      const arr = currentAnnotation as ArrowAnnotation;
      setCurrentAnnotation({
        ...arr,
        points: [arr.points[0], point]
      });
    }
  };

  const handleMouseUp = () => {
    if (tool === 'hand') return;
    
    if (draggedAnnotationId && onAnnotationUpdate) {
        const draggedAnn = annotations.find(a => a.id === draggedAnnotationId);
        if (draggedAnn) {
            onAnnotationUpdate(draggedAnn);
        }
    }
    setDraggedAnnotationId(null);
    
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentAnnotation) {
      const newAnn = { ...currentAnnotation };
      onAnnotationsChange([...annotations, newAnn]);
      onAnnotationCreated?.(newAnn);
      if (onSelect) onSelect(newAnn.id); 
      setCurrentAnnotation(null);
    }
    setStartPoint(null);
  };

  let cursor = 'cursor-crosshair';
  if (tool === 'select') cursor = 'cursor-default';
  if (tool === 'hand') cursor = 'cursor-grab active:cursor-grabbing';
  if (readOnly) cursor = 'cursor-default';

  const getSelectedAnnotationBounds = () => {
      const ann = annotations.find(a => a.id === selectedId);
      if (!ann) return null;

      let minX = 0, minY = 0, width = 0;

      if (ann.type === 'rect') {
          const r = ann as RectAnnotation;
          minX = r.x;
          minY = r.y;
          width = r.width;
      } else if (ann.type === 'circle') {
          const c = ann as CircleAnnotation;
          minX = c.x - c.radius;
          minY = c.y - c.radius;
          width = c.radius * 2;
      } else if (ann.type === 'text') {
          const t = ann as TextAnnotation;
          minX = t.x;
          minY = t.y - t.fontSize; 
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
             ctx.save();
             ctx.setTransform(1, 0, 0, 1, 0, 0); 
             ctx.font = `${t.fontSize}px sans-serif`;
             const metrics = ctx.measureText(t.text.split('\n')[0]);
             width = metrics.width;
             ctx.restore();
          } else {
             width = 100;
          }
      } else if (ann.type === 'pen') {
          const p = ann as PenAnnotation;
          if (p.points.length === 0) return null;
          const xs = p.points.map(pt => pt.x);
          const ys = p.points.map(pt => pt.y);
          minX = Math.min(...xs);
          minY = Math.min(...ys);
          width = Math.max(...xs) - minX;
      } else if (ann.type === 'arrow') {
          const a = ann as ArrowAnnotation;
          const xs = a.points.map(pt => pt.x);
          const ys = a.points.map(pt => pt.y);
          minX = Math.min(...xs);
          minY = Math.min(...ys);
          width = Math.max(...xs) - minX;
      }

      return { x: minX, y: minY, w: width };
  };

  const selectedBounds = getSelectedAnnotationBounds();

  return (
    <div className="relative w-full h-full group z-10">
        <canvas
            ref={canvasRef}
            width={width * renderScale}
            height={height * renderScale}
            style={{ width: '100%', height: '100%' }}
            className={`bg-transparent ${cursor} ${tool === 'hand' ? 'pointer-events-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
        
        {/* Context Menu Overlay */}
        {selectedId && selectedBounds && !readOnly && (
            <div 
                className="absolute flex items-center gap-1 bg-gray-900 border border-gray-600 p-1 rounded-lg shadow-xl z-20 animate-in zoom-in-95 duration-150"
                style={{
                    left: Math.max(0, selectedBounds.x * scale),
                    top: Math.max(0, (selectedBounds.y * scale) - 45), 
                    transform: 'translateY(0)' 
                }}
                onMouseDown={(e) => e.stopPropagation()} 
            >
                <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); onEdit && onEdit(selectedId); }}
                    className="p-1.5 hover:bg-gray-700 text-blue-400 rounded-md transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-700 mx-0.5"></div>
                <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); onDelete && onDelete(selectedId); }}
                    className="p-1.5 hover:bg-red-900/50 text-red-400 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        )}
    </div>
  );
};

export default React.memo(AnnotationLayer);
