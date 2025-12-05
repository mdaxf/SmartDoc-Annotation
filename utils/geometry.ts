
import { Point, RectAnnotation, CircleAnnotation, PenAnnotation, TextAnnotation, ArrowAnnotation } from '../types';

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const isPointInRect = (point: Point, rect: RectAnnotation): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const isPointInCircle = (point: Point, circle: CircleAnnotation): boolean => {
  const dist = getDistance(point, { x: circle.x, y: circle.y });
  return dist <= circle.radius;
};

// Simple bounding box hit test for pen paths for performance
export const isPointNearPath = (point: Point, pen: PenAnnotation, threshold: number = 10): boolean => {
  if (pen.points.length < 2) return false;
  // A robust implementation would use point-to-segment distance.
  // We will use a simplified check: is point near any vertex?
  return pen.points.some(p => getDistance(point, p) < threshold);
};

// Distance from point p to line segment vw
const distToSegmentSquared = (p: Point, v: Point, w: Point) => {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2);
};

export const isPointNearLine = (point: Point, arrow: ArrowAnnotation, threshold: number = 10): boolean => {
  if (arrow.points.length < 2) return false;
  const distSq = distToSegmentSquared(point, arrow.points[0], arrow.points[1]);
  return distSq < threshold * threshold;
};

export const isPointInText = (point: Point, text: TextAnnotation, ctx: CanvasRenderingContext2D): boolean => {
  ctx.font = `${text.fontSize}px sans-serif`;
  const metrics = ctx.measureText(text.text);
  const height = text.fontSize; // Approximation
  return (
    point.x >= text.x &&
    point.x <= text.x + metrics.width &&
    point.y >= text.y - height &&
    point.y <= text.y
  );
};
