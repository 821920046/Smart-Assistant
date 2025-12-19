import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../constants';

interface WhiteboardProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  initialData?: string;
}

const COLOR_PALETTE = [
  // Grayscale
  '#0f172a', '#475569', '#94a3b8', '#ffffff',
  // Warm
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  // Cool
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  // Vibrant
  '#d946ef', '#ec4899', '#f43f5e', '#78350f'
];

const Whiteboard: React.FC<WhiteboardProps> = ({ onSave, onCancel, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const context = canvas.getContext('2d');
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
      };
      img.src = initialData;
    }

    // Load recent colors from local storage
    const saved = localStorage.getItem('whiteboard_recent_colors');
    if (saved) setRecentColors(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    }
  }, [color, brushSize, tool]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
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
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
      };
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.8);
    onSave(dataUrl);
  };

  const selectColor = (newColor: string) => {
    setColor(newColor);
    setTool('pen');
    
    // Update recent colors if it's not in the main palette
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
      {/* Header */}
      <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm">取消</button>
          <div className="h-4 w-[1px] bg-slate-100" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">绘图板</span>
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

      {/* Drawing Area */}
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
        
        {/* Floating Tool Palette */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-4xl">
          <div className="glass px-6 py-5 rounded-[48px] shadow-2xl border border-white/60 w-full flex flex-col gap-6">
            
            {/* Top Row: Tools & Brush Sizes */}
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
                <div className="flex items-center gap-2">
                  {[4, 12, 24].map(s => (
                    <button
                      key={s}
                      onClick={() => setBrushSize(s)}
                      className={`flex items-center justify-center transition-all ${brushSize === s ? 'text-indigo-600' : 'text-slate-200 hover:text-slate-400'}`}
                    >
                      <div className="rounded-full bg-current" style={{ width: Math.max(6, (s/2) + 4), height: Math.max(6, (s/2) + 4) }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row: Color Selection */}
            <div className={`flex flex-col gap-4 ${tool === 'eraser' ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {/* Custom Picker Trigger */}
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

                {/* Recent Colors */}
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

                {/* Main Palette */}
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