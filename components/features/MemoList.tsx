import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Memo } from '../../types';
import { Icons } from '../../constants';
import MemoCard from './MemoCard';

interface MemoListProps {
  memos: Memo[];
  searchQuery: string;
}

const ITEMS_PER_PAGE = 20;

const MemoList: React.FC<MemoListProps> = ({ memos, searchQuery }) => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset visibility when memos change (e.g. searching or filtering)
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [memos.length, searchQuery]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && visibleCount < memos.length) {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, memos.length));
    }
  }, [visibleCount, memos.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null, // use viewport
      rootMargin: '200px', // start loading before user reaches bottom
      threshold: 0
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const visibleMemos = memos.slice(0, visibleCount);

  if (memos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 opacity-60"
      >
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500 shadow-inner">
          <Icons.List className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No tasks found</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs text-center">
          {searchQuery ? `No matches for "${searchQuery}"` : "You're all caught up! Add a new task to get started."}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {visibleMemos.map(memo => (
            <MemoCard
              key={memo.id}
              memo={memo}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Loading Indicator / Observer Target */}
      <div
        ref={observerTarget}
        className={`h-10 flex items-center justify-center transition-opacity ${visibleCount < memos.length ? 'opacity-100' : 'opacity-0'}`}
      >
        {visibleCount < memos.length && (
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoList;
