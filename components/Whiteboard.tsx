
import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../constants';

interface WhiteboardProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  initialData?: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ onSave, onCancel, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high resolution
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

    // Load initial data if exists
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
    // We export at standard resolution for storage efficiency
    const dataUrl = canvas.toDataURL('image/png', 0.8);
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-card overflow-hidden">
      {/* Header Toolbar */}
      <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 transition-colors">取消</button>
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

      {/* Main Drawing Area */}
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
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 glass px-8 py-4 rounded-[32px] flex items-center gap-8 shadow-2xl border border-white/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTool('pen')}
              className={`p-3 rounded-2xl transition-all ${tool === 'pen' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              <Icons.Pen />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={`p-3 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              <Icons.Eraser />
            </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="flex items-center gap-4">
            {['#0f172a', '#6366f1', '#a855f7', '#f43f5e', '#10b981'].map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                className={`w-7 h-7 rounded-full transition-all border-2 ${color === c && tool === 'pen' ? 'border-indigo-400 scale-125' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="flex items-center gap-4">
            {[2, 4, 8].map(s => (
              <button
                key={s}
                onClick={() => setBrushSize(s)}
                className={`flex items-center justify-center transition-all ${brushSize === s ? 'text-slate-900' : 'text-slate-300'}`}
              >
                <div className="rounded-full bg-current" style={{ width: s * 1.5 + 4, height: s * 1.5 + 4 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
