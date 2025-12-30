import React, { useRef, useState, useEffect } from 'react';
import { Icons } from '../../constants';
import { Memo } from '../../types';

interface WhiteboardProps {
    memos: Memo[];
    onUpdate: (memo: Memo) => void;
    onAdd: (memo: Partial<Memo>) => void;
    onDelete: (id: string) => void;
}

const COLOR_PALETTE = [
    '#0f172a', '#475569', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#78350f'
];

const Editor: React.FC<{
    initialData?: string;
    onSave: (dataUrl: string) => void;
    onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#0f172a');
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
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const setupCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();

            if (Math.abs(canvas.width - rect.width * dpr) < 1 &&
                Math.abs(canvas.height - rect.height * dpr) < 1) {
                return;
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

            if (history.length > 0) {
                context.putImageData(history[history.length - 1], 0, 0);
            } else if (initialData) {
                const img = new Image();
                img.onload = () => {
                    context.drawImage(img, 0, 0, rect.width, rect.height);
                    saveToHistory();
                };
                img.src = initialData;
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(setupCanvas);
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
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
        try {
            const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
            setHistory(prev => [...prev, snapshot].slice(-20));
            setRedoStack([]);
        } catch (e) {
            console.warn("History save failed", e);
        }
    };

    const undo = () => {
        if (history.length <= 1) return;
        const next = history[history.length - 1];
        setRedoStack(prev => [...prev, next]);
        const previous = history[history.length - 2];
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
            clientX = e.touches[0]?.clientX || (e as any).changedTouches[0].clientX;
            clientY = e.touches[0]?.clientY || (e as any).changedTouches[0].clientY;
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
            setTextInput({ x: offsetX, y: offsetY, value: '', visible: true });
            setTimeout(() => textInputRef.current?.focus(), 10);
            return;
        }
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        const { offsetX, offsetY } = getCoordinates(e);
        contextRef.current?.lineTo(offsetX, offsetY);
        contextRef.current?.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) { setIsDrawing(false); saveToHistory(); }
    };

    const finalizeText = () => {
        if (!textInput?.value.trim()) { setTextInput(null); return; }
        setTextObjects(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            x: textInput.x,
            y: textInput.y,
            text: textInput.value,
            color: color,
            fontSize: Math.max(12, brushSize * 4)
        }]);
        setTextInput(null);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;
        textObjects.forEach(obj => {
            ctx.font = `bold ${obj.fontSize}px sans-serif`;
            ctx.fillStyle = obj.color;
            ctx.fillText(obj.text, obj.x, obj.y + (obj.fontSize / 4));
        });
        onSave(canvas.toDataURL('image/png', 0.8));
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">
            <header className="h-16 border-b flex items-center justify-between px-6 bg-white/90 backdrop-blur-md">
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 font-bold text-sm">EXIT</button>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">SAVE SKETCH</button>
                </div>
            </header>
            <div ref={containerRef} className="flex-1 relative bg-slate-50 cursor-crosshair">
                <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full block" />
                {textInput?.visible && (
                    <input ref={textInputRef} value={textInput.value} onChange={e => setTextInput({ ...textInput, value: e.target.value })} onBlur={finalizeText} className="absolute p-2 bg-white border border-blue-500 rounded" style={{ left: textInput.x, top: textInput.y }} />
                )}
                {textObjects.map(obj => (
                    <div key={obj.id} className="absolute pointer-events-none" style={{ left: obj.x, top: obj.y, transform: 'translate(-50%, -50%)', color: obj.color, fontSize: obj.fontSize, fontWeight: 'bold' }}>{obj.text}</div>
                ))}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 bg-white p-4 rounded-3xl shadow-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setTool('pen')} className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-white shadow' : ''}`}><Icons.Pen /></button>
                            <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-white shadow' : ''}`}><Icons.Eraser /></button>
                        </div>
                        <input type="range" min="1" max="40" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="accent-indigo-600" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {COLOR_PALETTE.map(c => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full shrink-0 border-2" style={{ backgroundColor: c, borderColor: color === c ? '#6366f1' : 'transparent' }} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Whiteboard: React.FC<WhiteboardProps> = ({ memos, onUpdate, onAdd, onDelete }) => {
    const [editingMemo, setEditingMemo] = useState<Memo | 'new' | null>(null);

    const handleSave = (dataUrl: string) => {
        if (editingMemo === 'new') {
            onAdd({ type: 'sketch', content: 'Sketch', sketchData: dataUrl, createdAt: Date.now(), updatedAt: Date.now() });
        } else if (editingMemo) {
            onUpdate({ ...editingMemo, sketchData: dataUrl, updatedAt: Date.now() });
        }
        setEditingMemo(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold dark:text-white">Visual Thoughts</h1>
                <button onClick={() => setEditingMemo('new')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">+ NEW SKETCH</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memos.map(memo => (
                    <div key={memo.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="aspect-video bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                            {memo.sketchData && <img src={memo.sketchData} alt="Sketch" className="max-w-full max-h-full object-contain" />}
                        </div>
                        <div className="p-4 flex justify-between items-center border-t dark:border-slate-700">
                            <span className="text-xs text-slate-400">{new Date(memo.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingMemo(memo)} className="p-2 text-indigo-600"><Icons.Edit /></button>
                                <button onClick={() => onDelete(memo.id)} className="p-2 text-rose-500"><Icons.Trash /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {memos.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">No sketches yet. Start drawing!</div>}
            </div>
            {editingMemo && <Editor initialData={editingMemo === 'new' ? undefined : editingMemo.sketchData} onSave={handleSave} onCancel={() => setEditingMemo(null)} />}
        </div>
    );
};
export default Whiteboard;
