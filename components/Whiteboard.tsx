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
  const containerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, visible: boolean } | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // 可拖动文字对象
  interface TextObject {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
  }
  const [textObjects, setTextObjects] = useState<TextObject[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize canvas and handle resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // If dimensions haven't changed significantly, skip
      if (Math.abs(canvas.width - rect.width * dpr) < 1 && 
          Math.abs(canvas.height - rect.height * dpr) < 1) {
        return;
      }

      // Save current content before resizing
      let currentContent: ImageData | null = null;
      if (contextRef.current) {
        try {
          // Create a temporary canvas to hold the current content
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            currentContent = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          }
        } catch (e) {
          console.warn("Failed to preserve content during resize", e);
        }
      }

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

      // Restore content
      if (history.length > 0) {
        context.putImageData(history[history.length - 1], 0, 0);
      } else if (initialData && !currentContent) {
         const img = new Image();
         img.onload = () => {
            context.drawImage(img, 0, 0, rect.width, rect.height);
            saveToHistory();
         };
         img.src = initialData;
      }
    };

    // Use ResizeObserver for robust size detection
    const resizeObserver = new ResizeObserver(() => {
       window.requestAnimationFrame(setupCanvas);
    });
    
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Run once on mount to set up observer

  // Update context properties when tool/color changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    }
  }, [color, brushSize, tool]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current || canvas?.getContext('2d');
    if (!canvas || !context) return;
    try {
      const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev, snapshot].slice(-20));
      setRedoStack([]);
    } catch (e) {
      console.warn("Failed to save history", e);
    }
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
    // Prevent default to stop scrolling/pull-to-refresh on mobile
    if (e.cancelable) e.preventDefault();
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
    if (e.cancelable) e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && (e as any).changedTouches.length > 0) {
        clientX = (e as any).changedTouches[0].clientX;
        clientY = (e as any).changedTouches[0].clientY;
      } else {
        return { offsetX: 0, offsetY: 0 };
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const finalizeText = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }

    // 创建可拖动文字对象而不是直接绘制
    const fontSize = Math.max(12, brushSize * 4);
    const newTextObj: TextObject = {
      id: Math.random().toString(36).substr(2, 9),
      x: textInput.x,
      y: textInput.y,
      text: textInput.value,
      color: color,
      fontSize: fontSize
    };
    setTextObjects(prev => [...prev, newTextObj]);
    setTextInput(null);
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
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // 先将所有文字对象绘制到画布上
    textObjects.forEach(obj => {
      ctx.font = `bold ${obj.fontSize}px 'Outfit', 'Inter', sans-serif`;
      ctx.fillStyle = obj.color;
      ctx.fillText(obj.text, obj.x, obj.y + (obj.fontSize / 4));
    });

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
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm px-2">取消</button>
          <div className="h-4 w-[1px] bg-slate-100" />
          <div className="flex flex-col hidden md:flex">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mb-1">Creative Canvas</span>
            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Pixel Perfect Design</span>
          </div>

          <div className="flex items-center gap-1 ml-2 md:ml-4 bg-slate-50 p-1 rounded-xl">
            <button
              onClick={undo}
              disabled={history.length <= 1}
              className={`p-2 rounded-lg transition-all ${history.length <= 1 ? 'text-slate-200' : 'text-slate-600 hover:bg-white active:scale-90 shadow-sm'}`}
              title="撤销 (Ctrl+Z)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`p-2 rounded-lg transition-all ${redoStack.length === 0 ? 'text-slate-200' : 'text-slate-600 hover:bg-white active:scale-90 shadow-sm'}`}
              title="重做 (Ctrl+Y)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-rose-500 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hidden sm:block"
          >
            清空
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            保存
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        className="flex-1 relative bg-[#f8fafc] overflow-hidden cursor-crosshair"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px'
        }}
        onMouseMove={(e) => {
          if (draggingId) {
            const rect = e.currentTarget.getBoundingClientRect();
            const newX = e.clientX - rect.left;
            const newY = e.clientY - rect.top;
            setTextObjects(prev => prev.map(obj =>
              obj.id === draggingId ? { ...obj, x: newX, y: newY } : obj
            ));
          }
        }}
        onMouseUp={() => setDraggingId(null)}
        onMouseLeave={() => setDraggingId(null)}
        onTouchMove={(e) => {
          if (draggingId && e.touches.length > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const touch = e.touches[0];
            const newX = touch.clientX - rect.left;
            const newY = touch.clientY - rect.top;
            setTextObjects(prev => prev.map(obj =>
              obj.id === draggingId ? { ...obj, x: newX, y: newY } : obj
            ));
          }
        }}
        onTouchEnd={() => setDraggingId(null)}
      >
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
            className="absolute p-3 bg-white/90 backdrop-blur border-2 border-blue-500 rounded-xl shadow-2xl outline-none font-black tracking-tight z-50"
            style={{
              left: textInput.x,
              top: textInput.y,
              transform: 'translate(-50%, -50%)',
              color: color,
              fontSize: `${Math.max(14, brushSize * 3)}px`,
              minWidth: '150px'
            }}
          />
        )}

        {/* 可拖动文字对象 */}
        {textObjects.map(obj => (
          <div
            key={obj.id}
            className="absolute cursor-move select-none group z-40"
            style={{
              left: obj.x,
              top: obj.y,
              transform: 'translate(-50%, -50%)',
              color: obj.color,
              fontSize: `${obj.fontSize}px`,
              fontWeight: 'bold',
              fontFamily: "'Outfit', 'Inter', sans-serif",
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingId(obj.id);
              dragOffset.current = { x: e.clientX - obj.x, y: e.clientY - obj.y };
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDraggingId(obj.id);
              const touch = e.touches[0];
              dragOffset.current = { x: touch.clientX - obj.x, y: touch.clientY - obj.y };
            }}
          >
            {obj.text}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTextObjects(prev => prev.filter(t => t.id !== obj.id));
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full px-4 max-w-2xl z-50">
          <div className="glass px-5 py-3 rounded-[24px] shadow-xl border border-white/80 w-full flex flex-col gap-4 bg-white/90 backdrop-blur-md">

            <div className="flex items-center justify-between gap-4">
              {/* Tool Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-[16px] relative overflow-hidden shrink-0">
                <div
                  className="absolute bg-white shadow-sm rounded-[12px] transition-all duration-300 ease-out z-0"
                  style={{
                    width: 'calc(33.33% - 4px)',
                    height: 'calc(100% - 8px)',
                    left: tool === 'pen' ? '4px' : tool === 'text' ? '33.33%' : 'calc(66.66% - 4px)',
                    top: '4px'
                  }}
                />
                <button
                  onClick={() => setTool('pen')}
                  className={`flex items-center justify-center w-12 h-10 rounded-[12px] transition-all relative z-10 ${tool === 'pen' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="笔刷"
                >
                  <Icons.Pen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={`flex items-center justify-center w-12 h-10 rounded-[12px] transition-all relative z-10 ${tool === 'text' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="文字"
                >
                  <Icons.Type className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex items-center justify-center w-12 h-10 rounded-[12px] transition-all relative z-10 ${tool === 'eraser' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="擦除"
                >
                  <Icons.Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Brush Size Slider */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[100px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">粗细</span>
                  <span className="text-[9px] font-bold text-blue-500">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Color Palette */}
            <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 transition-all duration-300 ${tool === 'eraser' ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-all hover:border-blue-400 shrink-0"
                title="自定义颜色"
              >
                <div className="w-4 h-4 rounded-full" style={{ background: 'conic-gradient(from 0deg, #ff4d4d, #f9cb28, #32cd32, #00ced1, #1e90ff, #ff00ff, #ff4d4d)' }} />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => selectColor(e.target.value)}
                className="hidden"
              />

              <div className="w-[1px] h-6 bg-slate-200 shrink-0 mx-1" />

              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => selectColor(c)}
                  className={`w-8 h-8 rounded-full transition-all border-2 shrink-0 shadow-sm ${color === c ? 'border-blue-600 scale-110' : 'border-transparent hover:border-slate-200'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
