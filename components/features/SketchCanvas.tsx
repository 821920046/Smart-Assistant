import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Icons } from '../../constants';

interface SketchCanvasProps {
    initialData?: string;
    onSave: (dataUrl: string) => void;
    onCancel: () => void;
}

const COLOR_PALETTE = [
    '#0f172a', '#475569', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#78350f'
];

export const SketchCanvas: React.FC<SketchCanvasProps> = ({ initialData, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
    const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, visible: boolean } | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [redoStack, setRedoStack] = useState<ImageData[]>([]);

    interface TextObject {
        id: string;
        x: number;
        y: number;
        text: string;
        color: string;
        fontSize: number;
    }
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);

    // Initialize Canvas Context and Dimensions
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();

        // Only set width/height if they are different to avoid unnecessary clear/flicker
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) return;

            context.scale(dpr, dpr);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            contextRef.current = context;

            // Load initial image if available and history is empty
            if (initialData && history.length === 0) {
                const img = new Image();
                img.onload = () => {
                    context.drawImage(img, 0, 0, rect.width, rect.height);
                    saveToHistory();
                };
                img.src = initialData;
            }
        } else if (!contextRef.current) {
            contextRef.current = canvas.getContext('2d', { willReadFrequently: true });
        }
    }, [initialData]); // Only re-run if initialData changes physically

    // Update Stroke Settings without clearing canvas
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            contextRef.current.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
        }
    }, [color, brushSize, tool]);

    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;
        try {
            const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
            setHistory(prev => [...prev.slice(-19), snapshot]);
            setRedoStack([]);
        } catch (e) { console.warn("Save failed", e); }
    }, []);

    const undo = () => {
        if (history.length <= 1) return;
        const current = history[history.length - 1];
        const previous = history[history.length - 2];
        setRedoStack(prev => [...prev, current]);
        setHistory(prev => prev.slice(0, -1));
        contextRef.current?.putImageData(previous, 0, 0);
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, next]);
        setRedoStack(prev => prev.slice(0, -1));
        contextRef.current?.putImageData(next, 0, 0);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0]?.clientX;
            clientY = e.touches[0]?.clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        const { offsetX, offsetY } = getCoordinates(e);

        if (tool === 'text') {
            if (textInput?.visible) {
                finalizeText();
            }
            setTextInput({ x: offsetX, y: offsetY, value: '', visible: true });
            setTimeout(() => textInputRef.current?.focus(), 50);
            return;
        }

        setIsDrawing(true);
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
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

    const finalizeText = () => {
        if (!textInput?.value.trim()) {
            setTextInput(null);
            return;
        }

        const newText: TextObject = {
            id: Math.random().toString(36).substr(2, 9),
            x: textInput.x,
            y: textInput.y,
            text: textInput.value,
            color: color,
            fontSize: Math.max(16, brushSize * 4)
        };

        setTextObjects(prev => [...prev, newText]);
        setTextInput(null);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        // Draw all text objects onto canvas before saving
        textObjects.forEach(obj => {
            ctx.font = `bold ${obj.fontSize}px sans-serif`;
            ctx.fillStyle = obj.color;
            ctx.fillText(obj.text, obj.x, obj.y);
        });

        onSave(canvas.toDataURL('image/png', 0.9));
    };

    return (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col overflow-hidden animate-in fade-in duration-300">
            <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-500 hover:text-slate-900 font-bold text-xs tracking-widest transition-colors"
                >
                    EXIT
                </button>
                <div className="flex items-center gap-1 md:gap-3">
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button onClick={undo} disabled={history.length <= 1} className="p-2 disabled:opacity-30 hover:bg-white rounded-md transition-all"><Icons.ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={redo} disabled={redoStack.length === 0} className="p-2 disabled:opacity-30 hover:bg-white rounded-md transition-all"><Icons.ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="px-5 md:px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        DONE
                    </button>
                </div>
            </header>

            <div ref={containerRef} className="flex-1 relative bg-slate-50 overflow-hidden cursor-crosshair touch-none">
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
                        value={textInput.value}
                        onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                        onBlur={finalizeText}
                        onKeyDown={e => e.key === 'Enter' && finalizeText()}
                        placeholder="Type color..."
                        className="absolute p-2 bg-white/90 backdrop-blur-sm border-2 border-indigo-500 rounded-lg text-lg font-bold shadow-2xl outline-none"
                        style={{
                            left: textInput.x,
                            top: textInput.y,
                            color: color,
                            transform: 'translateY(-50%)'
                        }}
                    />
                )}

                {textObjects.map(obj => (
                    <div
                        key={obj.id}
                        className="absolute pointer-events-none whitespace-nowrap"
                        style={{
                            left: obj.x,
                            top: obj.y,
                            color: obj.color,
                            fontSize: obj.fontSize,
                            fontWeight: 'bold',
                            transform: 'translateY(-50%)'
                        }}
                    >
                        {obj.text}
                    </div>
                ))}

                {/* Mobile-Friendly Toolbar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg px-4 bg-white/95 backdrop-blur-xl p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                            <button
                                onClick={() => setTool('pen')}
                                className={`p-2.5 rounded-xl transition-all ${tool === 'pen' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Icons.Pen className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTool('text')}
                                className={`p-2.5 rounded-xl transition-all ${tool === 'text' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Icons.Type className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTool('eraser')}
                                className={`p-2.5 rounded-xl transition-all ${tool === 'eraser' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Icons.Eraser className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="40"
                            value={brushSize}
                            onChange={e => setBrushSize(parseInt(e.target.value))}
                            className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-1">
                        {COLOR_PALETTE.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform active:scale-90 ${color === c ? 'scale-110 shadow-lg' : 'hover:scale-105'}`}
                                style={{
                                    backgroundColor: c,
                                    borderColor: color === c ? '#6366f1' : 'rgba(0,0,0,0.05)'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SketchCanvas;
