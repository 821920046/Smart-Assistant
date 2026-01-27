import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  estimatedItemHeight?: number;
  className?: string;
}

export const VirtualList = <T,>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 400,
  overscan = 5,
  estimatedItemHeight = 120,
  className
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<number[]>([]);

  // Calculate dynamic item heights if not fixed
  const getItemHeight = useCallback((index: number) => {
    if (itemHeight) return itemHeight;
    return itemHeights.current[index] || estimatedItemHeight;
  }, [itemHeight, estimatedItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let start = 0;
    let end = items.length;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = 0; i < items.length; i++) {
      accumulatedHeight += getItemHeight(i);
      if (accumulatedHeight > scrollTop + containerHeight) {
        end = Math.min(items.length, i + overscan);
        break;
      }
    }

    return { start, end };
  }, [items.length, scrollTop, containerHeight, overscan, getItemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (itemHeight) return items.length * itemHeight;
    
    return items.reduce((total, _, index) => {
      return total + getItemHeight(index);
    }, 0);
  }, [items.length, itemHeight, getItemHeight]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    if (itemHeight) return visibleRange.start * itemHeight;
    
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [visibleRange.start, itemHeight, getItemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Measure item heights (for dynamic sizing)
  const measureItem = useCallback((index: number, height: number) => {
    if (!itemHeight && height !== itemHeights.current[index]) {
      itemHeights.current[index] = height;
    }
  }, [itemHeight]);

  // Visible items
  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        item: items[i],
        height: getItemHeight(i)
      });
    }
    return items;
  }, [visibleRange, getItemHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <AnimatePresence>
            {visibleItems.map(({ index, item, height }) => (
              <motion.div
                key={typeof item === 'object' && item && 'id' in item ? 
                  (item as any).id : index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 20,
                  delay: (index - visibleRange.start) * 0.05 
                }}
                style={{ 
                  height,
                  marginBottom: index < visibleRange.end - 1 ? '8px' : 0
                }}
                ref={(el) => {
                  if (el && !itemHeight) {
                    measureItem(index, el.getBoundingClientRect().height);
                  }
                }}
              >
                {renderItem(item, index)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Simple memo wrapper for performance
export const MemoizedVirtualList = React.memo(VirtualList) as typeof VirtualList;