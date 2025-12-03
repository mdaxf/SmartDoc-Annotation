
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, ToolType, Point, RectAnnotation, CircleAnnotation, PenAnnotation, TextAnnotation } from '../types';
import { isPointInRect, isPointInCircle, isPointNearPath, isPointInText } from '../utils/geometry';
import { getColorForSeverity } from '../constants';

interface AnnotationLayerProps {
  width: number;
  height: number;
  tool: ToolType;
  strokeWidth: number;
  fontSize: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  backgroundImage: HTMLImageElement | null;
  scale: number;
  page: number;
  
  // New props
  severity: number;
  reasonCode: string;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  width,
  height,
  tool,
  strokeWidth,
  fontSize,
  annotations,
  onAnnotationsChange,
  onAnnotationCreated,
  onSelect,
  selectedId,
  backgroundImage,
  scale,
  page,
  severity,
  reasonCode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [draggedAnnotationId, setDraggedAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Render Function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    
    // Draw Background Image
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, width, height);
    }

    // Draw Existing Annotations
    [...annotations, currentAnnotation].forEach((ann) => {
      if (!ann) return;
      
      const isSelected = ann.id === selectedId;
      
      ctx.save();
      ctx.beginPath();
      // Highlight selection
      if (isSelected) {
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#ffffff'; // White highlight for selection
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
        
        // Draw Label/Reason
        const labelText = r.label || ann.reasonCode;
        if (labelText) {
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = isSelected ? '#ffffff' : r.color;
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
          for (let i = 1; i < p.points.length; i++) {
            ctx.lineTo(p.points[i].x, p.points[i].y);
          }
          ctx.stroke();
          textPos = p.points[0];
        }
      } else if (ann.type === 'text') {
        const t = ann as TextAnnotation;
        ctx.font = `${t.fontSize}px sans-serif`;
        ctx.fillStyle = ann.color; // Text uses fill
        if (isSelected) ctx.fillStyle = '#ffffff';
        ctx.fillText(t.text, t.x, t.y);
        textPos = { x: t.x, y: t.y };
        
        // Selection box for text
        if (isSelected) {
            const metrics = ctx.measureText(t.text);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(t.x - 2, t.y - t.fontSize, metrics.width + 4, t.fontSize + 4);
        }
      }

      // Draw Comment/Status Indicator
      // Construct display text: [Status] Comment
      const displayContent = [
        ann.status ? `[${ann.status}]` : '',
        ann.comment
      ].filter(s => s && s.toString().trim().length > 0).join(' ');

      if (displayContent) {
          ctx.font = "italic 11px sans-serif";
          ctx.fillStyle = "#ffffff";
          const commentY = ann.type === 'text' ? textPos.y + 12 : textPos.y - 20;
          
          // Draw a small background for comment
          const commentWidth = ctx.measureText(displayContent).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(textPos.x, commentY - 10, commentWidth + 6, 14);
          
          ctx.fillStyle = "#fbbf24"; // Amber-400
          ctx.fillText(displayContent, textPos.x + 3, commentY + 1);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [width, height, annotations, currentAnnotation, backgroundImage, selectedId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordinate mapping
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If hand tool, we don't handle annotations
    if (tool === 'hand') return;

    const point = getCanvasPoint(e);

    if (tool === 'select') {
      let foundHit = false;
      // Hit detection (reverse order to pick top-most)
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        let hit = false;
        
        const ctx = canvasRef.current?.getContext('2d');

        if (ann.type === 'rect') hit = isPointInRect(point, ann as RectAnnotation);
        else if (ann.type === 'circle') hit = isPointInCircle(point, ann as CircleAnnotation);
        else if (ann.type === 'pen') hit = isPointNearPath(point, ann as PenAnnotation);
        else if (ann.type === 'text' && ctx) hit = isPointInText(point, ann as TextAnnotation, ctx);

        if (hit) {
          foundHit = true;
          setDraggedAnnotationId(ann.id);
          if (onSelect) onSelect(ann.id);

          if (ann.type === 'rect' || ann.type === 'text') {
             setDragOffset({ x: point.x - ann.x, y: point.y - ann.y });
          } else if (ann.type === 'circle') {
             setDragOffset({ x: point.x - (ann as CircleAnnotation).x, y: point.y - (ann as CircleAnnotation).y });
          } else if (ann.type === 'pen') {
             setDragOffset({ x: point.x, y: point.y }); 
          }
          break;
        }
      }
      
      if (!foundHit && onSelect) {
          onSelect(null);
      }
      return;
    }

    if (tool === 'text') {
       const text = prompt("Enter text:", "Annotation");
       if (text) {
           const newAnn: TextAnnotation = {
               id: generateId(),
               type: 'text',
               x: point.x,
               y: point.y,
               text,
               color: getColorForSeverity(severity),
               strokeWidth: 1, 
               fontSize,
               page,
               severity,
               reasonCode,
               status: 'New'
           };
           onAnnotationsChange([...annotations, newAnn]);
           onAnnotationCreated?.(newAnn);
       }
       return;
    }

    // Start drawing
    setIsDrawing(true);
    setStartPoint(point);
    if (onSelect) onSelect(null);

    const baseAnn = {
      id: generateId(),
      color: getColorForSeverity(severity),
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
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === 'hand') return;

    const point = getCanvasPoint(e);

    if (draggedAnnotationId) {
        // Move logic
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
                // Move all points
                const newPoints = pen.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
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
    }
  };

  const handleMouseUp = () => {
    if (tool === 'hand') return;
    setDraggedAnnotationId(null);
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentAnnotation) {
      const newAnn = { ...currentAnnotation };
      onAnnotationsChange([...annotations, newAnn]);
      onAnnotationCreated?.(newAnn);
      if (onSelect) onSelect(newAnn.id); // Select newly created
      setCurrentAnnotation(null);
    }
    setStartPoint(null);
  };

  // Determine Cursor
  let cursor = 'cursor-crosshair';
  if (tool === 'select') cursor = 'cursor-default';
  if (tool === 'hand') cursor = 'cursor-grab active:cursor-grabbing';

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%' }}
      className={`border border-gray-700 bg-gray-800 shadow-xl ${cursor} ${tool === 'hand' ? 'pointer-events-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default AnnotationLayer;
