
import React from 'react';
import { ToolType } from '../types';
import { STROKE_WIDTHS, FONT_SIZES, SEVERITY_COLORS, REASON_CODES } from '../constants';
import { 
  Pencil, Square, Circle, Type, MousePointer2, Hand, MoveRight,
  Trash2, Upload, FileUp, Sparkles, Download,
  ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ListChecks, Maximize, Minimize, Scan,
  PanelLeftClose, PanelBottomClose, MessageSquare
} from 'lucide-react';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
  currentStrokeWidth: number;
  setStrokeWidth: (w: number) => void;
  currentFontSize: number;
  setFontSize: (s: number) => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  hasFile: boolean;
  scale: number;
  setScale: (s: number) => void;
  onFitToScreen?: () => void;
  
  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;

  // Selected Annotation Actions
  selectedAnnotationId?: string | null;
  onDeleteSelected?: () => void;
  onEditSelected?: () => void;

  // Dynamic Props
  severity: number;
  setSeverity: (s: number) => void;
  reasonCode: string;
  setReasonCode: (code: string) => void;
  
  // Custom Config Props
  hideLoadFileBtn?: boolean;
  hideSaveJsonBtn?: boolean;
  hideLoadJsonBtn?: boolean;
  customSeverityColors?: Record<number, string>;
  customReasonCodes?: string[];
  style?: React.CSSProperties;
  
  // Layout
  variant?: 'sidebar' | 'bottom';
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  currentStrokeWidth,
  setStrokeWidth,
  currentFontSize,
  setFontSize,
  onClear,
  onSave,
  onLoad,
  onFileChange,
  onAnalyze,
  isAnalyzing,
  hasFile,
  scale,
  setScale,
  onFitToScreen,
  isFullscreen,
  onToggleFullscreen,
  selectedAnnotationId,
  onDeleteSelected,
  onEditSelected,
  severity,
  setSeverity,
  reasonCode,
  setReasonCode,
  hideLoadFileBtn,
  hideSaveJsonBtn,
  hideLoadJsonBtn,
  customSeverityColors,
  customReasonCodes,
  style,
  variant = 'sidebar'
}) => {
  
  const handleZoomIn = () => setScale(Math.min(5, scale + 0.1));
  const handleZoomOut = () => setScale(Math.max(0.1, scale - 0.1));
  const handleResetZoom = () => {
    if (onFitToScreen) {
        onFitToScreen();
    } else {
        setScale(1);
    }
  };

  const activeSeverityColors = customSeverityColors || SEVERITY_COLORS;
  const activeReasonCodes = customReasonCodes || REASON_CODES;
  const severityLevels = Object.keys(activeSeverityColors).map(Number).sort((a, b) => a - b);

  const tools = [
      { id: 'select', icon: MousePointer2, label: 'Select' },
      { id: 'arrow', icon: MoveRight, label: 'Arrow' }, // Arrow Tool
      { id: 'pen', icon: Pencil, label: 'Pen' },
      { id: 'rect', icon: Square, label: 'Rect' },
      { id: 'circle', icon: Circle, label: 'Circle' },
      { id: 'text', icon: Type, label: 'Text' },
      { id: 'hand', icon: Hand, label: 'Hand' },
  ];

  if (variant === 'bottom') {
      return (
        <div 
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center bg-gray-800/95 backdrop-blur border border-gray-600 rounded-2xl shadow-2xl p-2 gap-4 z-50 animate-in slide-in-from-bottom-5"
          style={style}
        >
             {/* Tools Group */}
            <div className="flex gap-1">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setTool(tool.id as ToolType)}
                        className={`p-2 rounded-xl transition-all ${
                            currentTool === tool.id 
                            ? 'bg-blue-600 text-white shadow-lg scale-105' 
                            : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                        }`}
                        title={tool.label}
                    >
                        <tool.icon className="w-5 h-5" />
                    </button>
                ))}
            </div>

            <div className="w-px h-8 bg-gray-600" />

             {/* Selected Actions (Bottom) */}
            {selectedAnnotationId && (
                <>
                <div className="flex items-center gap-1">
                    <button onClick={onEditSelected} className="p-2 hover:bg-gray-700 text-blue-400 rounded-xl" title="Edit Selected">
                        <MessageSquare className="w-5 h-5" />
                    </button>
                    <button onClick={onDeleteSelected} className="p-2 hover:bg-red-900/50 text-red-400 rounded-xl" title="Delete Selected">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
                <div className="w-px h-8 bg-gray-600" />
                </>
            )}

            {/* Zoom Group */}
            <div className="flex items-center gap-2">
                <button onClick={handleZoomOut} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-10 text-center text-gray-300">{(scale * 100).toFixed(0)}%</span>
                <button onClick={handleZoomIn} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">
                    <ZoomIn className="w-4 h-4" />
                </button>
                 <button onClick={handleResetZoom} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300" title="Fit to Screen">
                    {onFitToScreen ? <Scan className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                </button>
                <button onClick={onToggleFullscreen} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 border-l border-gray-600 ml-1" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
            </div>

            <div className="w-px h-8 bg-gray-600" />
             
             {/* Simple Attributes (Simplified for bottom bar) */}
            <div className="flex items-center gap-2">
                 <div className="flex gap-1">
                    {severityLevels.map(s => (
                        <div 
                            key={s} 
                            onClick={() => setSeverity(s)}
                            className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${severity === s ? 'ring-2 ring-white scale-125' : 'opacity-50 hover:opacity-100'}`}
                            style={{ backgroundColor: activeSeverityColors[s] }}
                            title={`Severity ${s}`}
                        />
                    ))}
                 </div>
                 {/* Width Selector Compact */}
                 <button onClick={() => setStrokeWidth(currentStrokeWidth === 12 ? 2 : currentStrokeWidth + 2)} className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full border border-gray-600">
                    <div className="bg-white rounded-full" style={{ width: Math.max(2, currentStrokeWidth / 2), height: Math.max(2, currentStrokeWidth / 2) }} />
                 </button>
            </div>

        </div>
      );
  }

  // STANDARD SIDEBAR LAYOUT
  return (
    <div 
      className="flex flex-col h-full bg-gray-800 border-r border-gray-700 p-4 w-72 overflow-y-auto gap-6 shadow-2xl z-10"
      style={style}
    >
      
      {/* File Operations */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document</h3>
        
        {!hideLoadFileBtn && (
            <label className="flex items-center justify-center w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors text-sm font-semibold">
            <FileUp className="w-5 h-5 mr-2" />
            Load Files
            <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={onFileChange} />
            </label>
        )}

        {hasFile && (
           <button
           onClick={onAnalyze}
           disabled={isAnalyzing}
           className={`flex items-center justify-center w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
             isAnalyzing 
             ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
             : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white'
           }`}
         >
           <Sparkles className={`w-5 h-5 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
           {isAnalyzing ? 'Analyzing...' : 'Auto-Annotate Page'}
         </button>
        )}
      </div>

      <div className="h-px bg-gray-700" />
      
      {/* Zoom Controls */}
      <div className="space-y-3">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">View</h3>
         <div className="flex items-center justify-between bg-gray-700 rounded-lg p-1">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-600 rounded text-gray-300" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">{(scale * 100).toFixed(0)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-600 rounded text-gray-300" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleResetZoom} className="p-2 hover:bg-gray-600 rounded text-gray-300 border-l border-gray-600 ml-1" title="Fit to Screen">
                {onFitToScreen ? <Scan className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
            </button>
             <button onClick={onToggleFullscreen} className="p-2 hover:bg-gray-600 rounded text-gray-300 border-l border-gray-600 ml-1" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
            </button>
         </div>
      </div>

      <div className="h-px bg-gray-700" />

      {/* Tools */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</h3>
        <div className="grid grid-cols-3 gap-2">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setTool(tool.id as ToolType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                        currentTool === tool.id 
                        ? 'bg-blue-600 text-white shadow-inner' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    <tool.icon className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">{tool.label}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="h-px bg-gray-700" />
      
      {/* Selected Annotation Actions */}
      {selectedAnnotationId && (
        <div className="space-y-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 animate-in zoom-in-95 duration-200">
            <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <MousePointer2 className="w-3 h-3" />
                Selection
            </h3>
            <div className="flex gap-2">
                <button 
                    onClick={onEditSelected}
                    className="flex-1 flex items-center justify-center px-2 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-xs text-white transition-colors"
                    title="Edit Details"
                >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                </button>
                <button 
                    onClick={onDeleteSelected}
                    className="flex-1 flex items-center justify-center px-2 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-900/50 rounded-md text-xs transition-colors"
                    title="Delete Selection"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                </button>
            </div>
        </div>
      )}

      {selectedAnnotationId && <div className="h-px bg-gray-700" />}

      {/* Defect Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            {selectedAnnotationId ? 'Selected Properties' : 'Defect Details'}
        </h3>
        
        {/* Severity */}
        <div className="space-y-2">
            <label className="text-xs text-gray-400">Severity Level</label>
            <div className="flex gap-2 flex-wrap">
                {severityLevels.map(s => (
                    <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`flex-1 py-2 min-w-[3rem] rounded-md text-sm font-bold border-2 transition-all ${
                            severity === s 
                            ? 'border-white scale-105 shadow-lg' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ 
                            backgroundColor: activeSeverityColors[s],
                            color: s === 2 ? 'black' : 'white'
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
                <span>Low</span>
                <span>Crit</span>
            </div>
        </div>

        {/* Reason Code */}
        <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
                <ListChecks className="w-3 h-3" />
                Reason Code
            </label>
            <select 
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
            >
                {activeReasonCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                ))}
            </select>
        </div>

        {/* Width/Size */}
        <div className="pt-2">
            {currentTool === 'text' ? (
                <div className="space-y-1">
                <label className="text-xs text-gray-400">Font Size</label>
                <div className="flex gap-1 flex-wrap">
                    {FONT_SIZES.map(s => (
                        <button
                            key={s}
                            onClick={() => setFontSize(s)}
                            className={`px-2 py-1 text-xs rounded border ${currentFontSize === s ? 'bg-gray-600 border-gray-400 text-white' : 'border-gray-700 text-gray-400'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
            ) : (
                <div className="space-y-1">
                <label className="text-xs text-gray-400">Stroke Width</label>
                <div className="flex gap-1 flex-wrap">
                    {STROKE_WIDTHS.map(w => (
                        <button
                            key={w}
                            onClick={() => setStrokeWidth(w)}
                            className={`w-8 h-8 flex items-center justify-center rounded border ${currentStrokeWidth === w ? 'bg-gray-600 border-gray-400' : 'border-gray-700 bg-gray-800'}`}
                        >
                            <div className="bg-white rounded-full" style={{ width: w, height: w }} />
                        </button>
                    ))}
                </div>
            </div>
            )}
        </div>
      </div>

      <div className="h-px bg-gray-700" />

      {/* Data Operations */}
      <div className="space-y-3 mt-auto">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data</h3>
        
        {!hideSaveJsonBtn && (
            <button onClick={onSave} className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                <Download className="w-4 h-4 mr-3" />
                Save Annotations
            </button>
        )}
        
        {!hideLoadJsonBtn && (
            <label className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-3" />
                Load Annotations
                <input type="file" className="hidden" accept=".json" onChange={onLoad} />
            </label>
        )}
        
        <button onClick={onClear} className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 mr-3" />
            Clear All
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
