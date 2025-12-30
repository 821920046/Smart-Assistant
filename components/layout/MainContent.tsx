import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardView from '@/components/features/DashboardView';
import TasksView from '@/components/features/TasksView';
import KanbanView from '@/components/features/KanbanView';
import SettingsView from '@/components/features/SettingsView';
import Whiteboard from '@/components/features/Whiteboard';
import { useStore } from '../../services/store';
import { useMemoFilter } from '../../hooks/useMemoFilter';

const MainContent: React.FC = () => {
    const { filter, searchQuery, memos, clearHistory } = useStore();
    const filteredMemos = useMemoFilter(memos, filter, searchQuery);

    const renderContent = () => {
        switch (filter) {
            case 'dashboard':
                return <DashboardView />;
            case 'tasks':
                return <TasksView memos={filteredMemos} title="Active Tasks" defaultType="todo" />;
            case 'notes':
                return <TasksView memos={filteredMemos} title="All Notes" defaultType="memo" />;
            case 'archive':
                return (
                    <TasksView
                        memos={filteredMemos}
                        title="Archived Items"
                        onClearAll={clearHistory}
                        defaultType="memo"
                    />
                );
            case 'favorites':
                return <TasksView memos={filteredMemos} title="Favorite Notes" />;
            case 'kanban':
                return <KanbanView />;
            case 'whiteboard':
                return <Whiteboard />;
            case 'settings':
                return <SettingsView />;
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="relative min-h-[500px]">
            <AnimatePresence mode="wait">
                <motion.div
                    key={filter}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        {renderContent()}
                    </Suspense>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default MainContent;
