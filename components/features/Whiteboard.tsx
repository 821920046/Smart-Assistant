import React, { useState } from 'react';
import { Icons } from '../../constants';
import { Memo } from '../../types';
import { SketchCanvas } from './SketchCanvas';
import { useStore } from '../../services/store';

const Whiteboard: React.FC = () => {
    const { memos: allMemos, updateMemo, addMemo, deleteMemo } = useStore();
    const [editingMemo, setEditingMemo] = useState<Memo | 'new' | null>(null);

    const memos = allMemos.filter(m => m.type === 'sketch');

    const handleSave = (dataUrl: string) => {
        if (editingMemo === 'new') {
            addMemo({
                type: 'sketch',
                content: 'Sketch',
                sketchData: dataUrl
            });
        } else if (editingMemo) {
            updateMemo({
                ...editingMemo,
                sketchData: dataUrl
            });
        }
        setEditingMemo(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Visual Thoughts</h1>
                    <p className="text-slate-500 dark:text-slate-400">Capture your visual ideas and sketches.</p>
                </div>
                <button
                    onClick={() => setEditingMemo('new')}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    <Icons.Plus className="w-5 h-5" />
                    <span>NEW SKETCH</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memos.map(memo => (
                    <div key={memo.id} className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all">
                        <div className="aspect-video bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                            {memo.sketchData && <img src={memo.sketchData} alt="Sketch" className="max-w-full max-h-full object-contain" />}
                        </div>
                        <div className="p-4 flex justify-between items-center border-t dark:border-slate-700">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date(memo.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingMemo(memo)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Icons.Edit className="w-4 h-4" /></button>
                                <button onClick={() => deleteMemo(memo.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Icons.Trash className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {memos.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-400 font-medium">No sketches yet. Start drawing!</p>
                    </div>
                )}
            </div>

            {editingMemo && (
                <SketchCanvas
                    initialData={editingMemo === 'new' ? undefined : editingMemo.sketchData}
                    onSave={handleSave}
                    onCancel={() => setEditingMemo(null)}
                />
            )}
        </div>
    );
};

export default Whiteboard;
