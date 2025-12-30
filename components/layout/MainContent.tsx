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
    const {
        filter, searchQuery, memos, updateMemo, deleteMemo, addMemo, setFilter,
        clearHistory, isSyncing, darkMode, toggleDarkMode, setSyncSettingsOpen, performSync
    } = useStore();

    const filteredMemos = useMemoFilter(memos, filter, searchQuery);

    const renderContent = () => {
        switch (filter) {
            case 'dashboard':
                return (
                    <DashboardView
                        memos={memos}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                        onNavigate={setFilter}
                        isSyncing={isSyncing}
                    />
                );
            case 'tasks':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                        searchQuery={searchQuery}
                        title="Active Tasks"
                    />
                );
            case 'notes':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                        searchQuery={searchQuery}
                        title="All Notes"
                    />
                );
            case 'archive':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                        searchQuery={searchQuery}
                        title="Archived Items"
                        onClearAll={clearHistory}
                    />
                );
            case 'favorites':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                        searchQuery={searchQuery}
                        title="Favorite Notes"
                    />
                );
            case 'kanban':
                return (
                    <KanbanView
                        memos={memos.filter(m => !m.isArchived)}
                        onUpdate={updateMemo}
                        onDelete={deleteMemo}
                        onAdd={addMemo}
                    />
                );
            case 'whiteboard':
                return (
                    <Whiteboard
                        memos={memos.filter(m => m.type === 'sketch')}
                        onUpdate={updateMemo}
                        onAdd={addMemo}
                        onDelete={deleteMemo}
                    />
                );
            case 'settings':
                return (
                    <SettingsView
                        darkMode={darkMode}
                        onToggleDarkMode={toggleDarkMode}
                        isSyncing={isSyncing}
                        onOpenSyncSettings={() => setSyncSettingsOpen(true)}
                        onExport={async () => {
                            // Trigger export via window event or other means if needed, 
                            // but easier to just move export logic to store or keep it here.
                            // For now, these are usually triggered from Sidebar or App.
                        }}
                        onImport={() => { }}
                        onClearHistory={clearHistory}
                    />
                );
            default:
                return <DashboardView memos={memos} onUpdate={updateMemo} onDelete={deleteMemo} onAdd={addMemo} onNavigate={setFilter} />;
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
