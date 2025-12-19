
import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../constants.js';

interface WhiteboardProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  initialData?: string;
}

const COLOR_PALETTE = [
  '#0f172a', '#475569', '#94a3b8', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#78350f'
];

const Whiteboard: React.FC<WhiteboardProps> = ({ onSave, onCancel, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  
  // Text Tool State
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, visible: boolean } | null>(null);

  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Undo/Redo States
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    
    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
        saveToHistory(); // Initial state
      };
      img.src = initialData;
    } else {
      saveToHistory(); // Initial blank state
    }

    const saved = localStorage.getItem('whiteboard_recent_colors');
    if (saved) setRecentColors(JSON.parse(saved));

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    }
  }, [color, brushSize, tool]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, snapshot].slice(-20)); // Keep last 20 steps
    setRedoStack([]); // Clear redo on new action
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    setRedoStack(prev => [...prev, current]);
    setHistory(prev => prev.slice(0, -1));
    context.putImageData(previous, 0, 0);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));
    context.putImageData(next, 0, 0);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);

    if (tool === 'text') {
      setTextInput({ x: offsetX, y: offsetY, value: '', visible: true });
      setTimeout(() => textInputRef.current?.focus(), 10);
      return;
    }

    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'text') return;
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      contextRef.current?.closePath();
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
        offsetY: (e as React.MouseEvent).nativeEvent.offsetY,
      };
    }
  };

  const finalizeText = () => {
    if (!textInput || !textInput.value.trim() || !contextRef.current) {
      setTextInput(null);
      return;
    }

    const ctx = contextRef.current;
    const fontSize = Math.max(12, brushSize * 4);
    ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(textInput.value, textInput.x, textInput.y + (fontSize/4));
    
    setTextInput(null);
    saveToHistory();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleSave = () => {
    if (textInput?.visible) finalizeText();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.8);
    onSave(dataUrl);
  };

  const selectColor = (newColor: string) => {
    setColor(newColor);
    if (tool === 'eraser') setTool('pen');
    if (!COLOR_PALETTE.includes(newColor)) {
      setRecentColors(prev => {
        const filtered = prev.filter(c => c !== newColor);
        const updated = [newColor, ...filtered].slice(0, 5);
        localStorage.setItem('whiteboard_recent_colors', JSON.stringify(updated));
        return updated;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-card overflow-hidden">
      <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm">取消</button>
          <div className="h-4 w-[1px] bg-slate-100" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">绘图板</span>
          
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={undo} 
              disabled={history.length <= 1}
              className={`p-2.5 rounded-xl transition-all ${history.length <= 1 ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-50 active:scale-90'}`}
              title="撤销 (Ctrl+Z)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
            </button>
            <button 
              onClick={redo} 
              disabled={redoStack.length === 0}
              className={`p-2.5 rounded-xl transition-all ${redoStack.length === 0 ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-50 active:scale-90'}`}
              title="重做 (Ctrl+Y)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleClear} 
            className="px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-50 text-[11px] font-black uppercase tracking-widest transition-all"
          >
            清空
          </button>
          <button 
            onClick={handleSave} 
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            保存
          </button>
        </div>
      </header>

      <div className="flex-1 relative bg-slate-50/30 overflow-hidden cursor-crosshair" style={{
        backgroundImage: 'radial-gradient(#e2e8f0 0.8px, transparent 0.8px)',
        backgroundSize: '24px 24px'
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />

        {textInput?.visible && (
          <input
            ref={textInputRef}
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onBlur={finalizeText}
            onKeyDown={(e) => e.key === 'Enter' && finalizeText()}
            className="absolute p-2 bg-white/90 backdrop-blur border-2 border-indigo-500 rounded-xl shadow-2xl outline-none font-bold"
            style={{
              left: textInput.x,
              top: textInput.y,
              transform: 'translate(-50%, -50%)',
              color: color,
              fontSize: `${Math.max(14, brushSize * 3)}px`,
              minWidth: '100px'
            }}
          />
        )}
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-4xl">
          <div className="glass px-6 py-5 rounded-[48px] shadow-2xl border border-white/60 w-full flex flex-col gap-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setTool('pen')}
                  className={`p-3.5 rounded-2xl transition-all ${tool === 'pen' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                  title="画笔"
                >
                  <Icons.Pen />
                </button>
                <button 
                  onClick={() => setTool('text')}
                  className={`p-3.5 rounded-2xl transition-all ${tool === 'text' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                  title="文字工具"
                >
                  <Icons.Type />
                </button>
                <button 
                  onClick={() => setTool('eraser')}
                  className={`p-3.5 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                  title="橡皮擦"
                >
                  <Icons.Eraser />
                </button>
              </div>

              <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />

              <div className="flex-1 flex items-center gap-6 max-w-xs">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">画笔粗细</span>
                    <span className="text-[9px] font-black text-slate-900">{brushSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="40" 
                    step="1"
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className={`flex flex-col gap-4 ${tool === 'eraser' ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => colorInputRef.current?.click()}
                  className="w-10 h-10 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center transition-all hover:border-indigo-400 hover:bg-indigo-50 shrink-0"
                  title="自定义颜色"
                >
                  <div className="w-5 h-5 rounded-md" style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }} />
                </button>
                <input 
                  ref={colorInputRef}
                  type="color" 
                  value={color}
                  onChange={(e) => selectColor(e.target.value)}
                  className="hidden"
                />

                {recentColors.length > 0 && (
                  <>
                    <div className="w-[1px] h-8 bg-slate-100 shrink-0 mx-1" />
                    {recentColors.map(c => (
                      <button
                        key={`recent-${c}`}
                        onClick={() => selectColor(c)}
                        className={`w-10 h-10 rounded-2xl transition-all border-2 shrink-0 shadow-sm ${color === c ? 'border-indigo-500 scale-110' : 'border-white'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </>
                )}

                <div className="w-[1px] h-8 bg-slate-100 shrink-0 mx-1" />

                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => selectColor(c)}
                    className={`w-10 h-10 rounded-2xl transition-all border-2 shrink-0 shadow-sm ${color === c ? 'border-indigo-500 scale-110' : 'border-white'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
