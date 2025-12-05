
import React from 'react';

export type ToolType = 'select' | 'rect' | 'circle' | 'pen' | 'text' | 'hand' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: ToolType;
  color: string;
  strokeWidth: number;
  selected?: boolean;
  comment?: string;
  page?: number; // Added for PDF pagination support
  severity?: number;
  reasonCode?: string;
  status?: string; // New status field
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string; // For Gemini auto-labels
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen';
  points: Point[];
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  points: [Point, Point]; // Start and End
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type Annotation = RectAnnotation | CircleAnnotation | PenAnnotation | TextAnnotation | ArrowAnnotation;

export interface DocFile {
  name: string;
  type: string;
  dataUrl: string; // Base64 or Blob URL
}

export interface PageData {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  imageSrc?: string;
  pdfPage?: any;
}

// Library Configuration Types

export interface SmartDocStyleConfig {
  container?: React.CSSProperties;
  toolbar?: React.CSSProperties;
  workspace?: React.CSSProperties;
  layout?: React.CSSProperties;
}

export interface SmartDocEvents {
  onDocumentReady?: () => void;
  onAnnotationsReady?: () => void;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (id: string) => void;
  onClearAnnotations?: () => void;
  /**
   * Triggered when the Save button is clicked.
   * If defined, the default JSON download is prevented, and data is passed here instead.
   */
  onSave?: (data: { file: string; annotations: Annotation[]; timestamp: string }) => void;
}

export interface SmartDocConfig {
  documentSrc?: string | string[]; // URL or Array of URLs to auto-load
  initialAnnotations?: Annotation[];
  
  // Customization Lists
  severityOptions?: Record<number, string>; // { 1: '#color', ... }
  reasonCodeOptions?: string[];
  statusOptions?: string[];
  
  // UI Options
  hideLoadFileBtn?: boolean;
  hideSaveJsonBtn?: boolean;
  hideLoadJsonBtn?: boolean;
  defaultLayout?: 'sidebar' | 'bottom'; // Layout preference
  
  // Styling
  styleConfig?: SmartDocStyleConfig;
}

export interface SmartDocProps extends SmartDocConfig {
  events?: SmartDocEvents;
}

/**
 * Interface for controlling the SmartDoc instance programmatically.
 */
export interface SmartDocHandle {
  /**
   * Load a document from a URL, File, or an Array of URLs/Files.
   */
  loadDocument: (source: string | File | (string | File)[]) => Promise<void>;
  /**
   * Get the current list of annotations.
   */
  getAnnotations: () => Annotation[];
  /**
   * Replace the current annotations with a new list.
   */
  setAnnotations: (annotations: Annotation[]) => void;
  /**
   * Clear all annotations.
   */
  clearAnnotations: () => void;
}

// Global Declaration for Distributed Library
declare global {
  interface Window {
    SmartDoc: {
      create: (containerId: string, config?: SmartDocConfig, events?: SmartDocEvents) => SmartDocInstance;
    }
  }
}

export interface SmartDocInstance extends SmartDocHandle {
  unmount: () => void;
}
