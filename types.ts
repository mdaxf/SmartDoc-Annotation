
import React from 'react';

export type ToolType = 'select' | 'rect' | 'circle' | 'pen' | 'text' | 'hand' | 'arrow';

export type SmartDocMode = 'full' | 'edit' | 'viewonly';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  documentId: string; // NEW: Link annotation to specific doc
  type: ToolType;
  color: string;
  strokeWidth: number;
  selected?: boolean;
  comment?: string;
  page?: number; 
  severity?: number;
  reasonCode?: string;
  status?: string; 
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string; 
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
  points: [Point, Point]; 
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
  dataUrl: string; 
}

export interface PageData {
  id: string;
  documentId: string; // NEW
  pageNumber: number; // Page number RELATIVE to the specific document
  width: number;
  height: number;
  imageSrc?: string;
  pdfPage?: any;
  docxData?: Blob; 
  textContent?: string; // HTML/TXT
  modelSrc?: string; // 3D GLB/GLTF
  sheetData?: any; // Excel (Placeholder for future)
}

export interface DocumentMeta {
    id: string;
    name: string;
    type: string;
    pageCount: number;
}

// Library Configuration Types

export interface SmartDocStyleConfig {
  container?: React.CSSProperties;
  toolbar?: React.CSSProperties;
  workspace?: React.CSSProperties;
  layout?: React.CSSProperties;
  navBar?: React.CSSProperties; // New
}

export interface SmartDocEvents {
  onSmartDocReady?: () => void;
  onSmartDocLoaded?: () => void; // Added alias
  onDocumentReady?: () => void;
  onAnnotationsReady?: () => void;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (id: string) => void;
  onClearAnnotations?: () => void;
  /**
   * Triggered when a new photo is captured via the Camera.
   * Returns object with dataUrl and the newly assigned document ID.
   */
  onPhotoAdd?: (data: { dataUrl: string; id: string }) => void;
  /**
   * Triggered when a document is uploaded via the Toolbar.
   * Returns object with the generated ID, the raw File object, and the Data URL (base64).
   */
  onUpload?: (data: { id: string; file: File; dataUrl: string }) => void;
  onSave?: (data: { file: string; annotations: Annotation[]; timestamp: string }) => void;
  onDocumentChange?: (documentId: string) => void; // New
}

export interface SmartDocConfig {
  documentSrc?: string | string[]; 
  documentIds?: string[]; // NEW: ID mapping for source array
  initialAnnotations?: Annotation[];
  
  severityOptions?: Record<number, string>; 
  reasonCodeOptions?: string[];
  statusOptions?: string[];
  
  hideLoadFileBtn?: boolean;
  hideSaveJsonBtn?: boolean;
  hideLoadJsonBtn?: boolean;
  defaultLayout?: 'sidebar' | 'bottom'; 
  navPosition?: 'top' | 'bottom'; // NEW: Document switching nav position
  
  mode?: SmartDocMode; 
  defaultTool?: ToolType; 
  hideCameraBtn?: boolean;
  showThumbnails?: boolean; 
  
  // New: Path to PDF Worker for offline environments
  pdfWorkerSrc?: string; 
  // New: Path to Model Viewer (3D) for offline environments
  modelViewerSrc?: string;

  styleConfig?: SmartDocStyleConfig;
}

export interface SmartDocProps extends SmartDocConfig {
  events?: SmartDocEvents;
}

export interface SmartDocHandle {
  loadDocument: (source: string | File | (string | File)[], documentIds?: string[]) => Promise<void>;
  getAnnotations: () => Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  clearAnnotations: () => void;
}

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
