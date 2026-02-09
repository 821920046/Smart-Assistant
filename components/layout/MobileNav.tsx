import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../../constants';
import { useStore } from '../../services/store';
import { useHaptic } from '../../hooks/useHaptic';
import { useSwipe } from '../../hooks/useSwipe';
import { cn } from '../../utils/cn';

const MobileNav: React.FC = () => {
  const { filter: activeFilter, setFilter: setActiveFilter, isSketching } = useStore();
  const [activeTab, setActiveTab] = useState(activeFilter);
  const { hapticFeedback } = useHaptic();

  const navItems = [
    { id: 'dashboard', icon: Icons.Home, label: 'Home' },
    { id: 'todo', label: 'Tasks', icon: Icons.List },
    { id: 'notes', label: 'Notes', icon: Icons.FileText }, // Changed from 'memo' to 'notes' to match MainContent filter
    { id: 'whiteboard', label: 'Board', icon: Icons.Edit },
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
  ];

  const getTabIndex = (tabId: string) => navItems.findIndex(item => item.id === tabId);

  // Enhanced swipe navigation
  useSwipe({
    onSwipeLeft: () => {
      if (isSketching) return;
      const currentIndex = getTabIndex(activeFilter);
      if (currentIndex < navItems.length - 1) {
        const nextTab = navItems[currentIndex + 1];
        setActiveFilter(nextTab.id);
        setActiveTab(nextTab.id);
        hapticFeedback('light');
      }
    },
    onSwipeRight: () => {
      if (isSketching) return;
      const currentIndex = getTabIndex(activeFilter);
      if (currentIndex > 0) {
        const prevTab = navItems[currentIndex - 1];
        setActiveFilter(prevTab.id);
        setActiveTab(prevTab.id);
        hapticFeedback('light');
      }
    },
    threshold: 60,
    preventDefault: false
  });

  const handleTabPress = (tabId: string) => {
    // If clicking the already active tab
    if (activeFilter === tabId) {
      if (tabId === 'todo') {
        window.dispatchEvent(new CustomEvent('trigger-create-memo', { detail: { type: 'todo' } }));
        hapticFeedback('success');
      } else if (tabId === 'notes') {
        window.dispatchEvent(new CustomEvent('trigger-create-memo', { detail: { type: 'memo' } }));
        hapticFeedback('success');
      }
      return;
    }

    setActiveFilter(tabId);
    setActiveTab(tabId);
    hapticFeedback('selection');
  };

  const indicatorPosition = (getTabIndex(activeTab) * 20); // 20% per tab

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Active Tab Indicator */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500">
        <motion.div
          className="h-full w-1/5 bg-white shadow-lg"
          initial={false}
          animate={{
            x: `${indicatorPosition}%`
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        />
      </div>

      {/* Navigation Container */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 pb-safe">
        <div className="flex items-center justify-around px-2 pt-2 pb-3">
          {navItems.map((item, index) => {
            const isActive = activeFilter === item.id;
            const isPrevActive = getTabIndex(activeTab) === index - 1;
            const isNextActive = getTabIndex(activeTab) === index + 1;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleTabPress(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 min-w-[72px] relative overflow-hidden',
                  isActive && 'bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
                  !isActive && 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isActive ? 1.1 : 1,
                  transition: { delay: index * 0.05 }
                }}
              >
                {/* Hover Background Effect */}
                {!isActive && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}

                {/* Active Tab Glow */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-purple-500/10 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  className={cn(
                    'relative z-10 transition-all duration-300',
                    isActive && 'text-indigo-600 dark:text-indigo-400'
                  )}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    rotate: isActive ? 0 : (isPrevActive ? -5 : isNextActive ? 5 : 0)
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <item.icon
                    className={cn(
                      'w-6 h-6',
                      isActive && 'fill-current'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  className={cn(
                    'text-[10px] font-medium relative z-10 transition-all duration-300',
                    isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
                  )}
                  animate={{
                    scale: isActive ? 1.1 : 1
                  }}
                >
                  {item.label}
                </motion.span>

                {/* Active Tab Dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Hints */}
        <div className="text-center text-[9px] text-slate-400 pb-2">
          Swipe to navigate • Tap to select
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
