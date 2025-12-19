import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../constants';

interface WhiteboardProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  initialData?: string;
}

const PRESET_COLORS = [
  '#0f172a', // Slate 900
  '#64748b', // Slate 500
  '#ef4444', // Red 500
  '#f59e0b', // Amber 500
  '#10b981', // Emerald 500
  '#3b82f6', // Blue 500
  '#6366f1', // Indigo 500
  '#a855f7', // Purple 500
  '#ec4899', // Pink 500
  '#f43f5e', // Rose 500
  '#14b8a6', // Teal 500
  '#8b5cf6', // Violet 500
];

const Whiteboard: React.FC<WhiteboardProps> = ({ onSave, onCancel, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
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

  const handleCustomColorClick = () => {
    colorInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-card overflow-hidden">
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
            清空画布
          </button>
          <button 
            onClick={handleSave} 
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            保存图稿
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
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-2xl">
          <div className="glass px-6 py-4 rounded-[40px] flex items-center gap-4 md:gap-6 shadow-2xl border border-white/50 w-full overflow-x-auto no-scrollbar">
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setTool('pen')}
                className={`p-3 rounded-2xl transition-all ${tool === 'pen' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                title="画笔"
              >
                <Icons.Pen />
              </button>
              <button 
                onClick={() => setTool('eraser')}
                className={`p-3 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                title="橡皮擦"
              >
                <Icons.Eraser />
              </button>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 shrink-0" />

            <div className={`flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 shrink-0 ${tool === 'eraser' ? 'opacity-20 pointer-events-none' : ''}`}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool('pen'); }}
                  className={`w-7 h-7 rounded-full transition-all border-2 shrink-0 ${color === c ? 'border-indigo-400 scale-125 shadow-sm' : 'border-white'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              
              <div className="w-[1px] h-6 bg-slate-200 mx-1 shrink-0" />
              
              <button
                onClick={handleCustomColorClick}
                className={`w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center transition-all hover:border-indigo-400 hover:scale-110 shrink-0 ${!PRESET_COLORS.includes(color) && tool === 'pen' ? 'border-indigo-400 scale-110' : ''}`}
                style={{ backgroundColor: !PRESET_COLORS.includes(color) ? color : 'transparent' }}
                title="自定义颜色"
              >
                {!PRESET_COLORS.includes(color) ? null : <span className="text-slate-400 text-xs">+</span>}
              </button>
              <input 
                ref={colorInputRef}
                type="color" 
                value={color}
                onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                className="hidden"
              />
            </div>

            <div className="h-8 w-[1px] bg-slate-200 shrink-0" />

            <div className="flex items-center gap-4 md:gap-6 min-w-[140px] shrink-0">
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">大小</span>
                  <span className="text-[10px] font-black text-slate-900">{brushSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  step="1"
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                {[2, 6, 12].map(s => (
                  <button
                    key={s}
                    onClick={() => setBrushSize(s)}
                    className={`flex items-center justify-center transition-all ${brushSize === s ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
                  >
                    <div className="rounded-full bg-current" style={{ width: Math.max(6, s + 1.5), height: Math.max(6, s + 1.5) }} />
                  </button>
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