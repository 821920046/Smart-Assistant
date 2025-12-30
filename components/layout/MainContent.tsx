import React, { Suspense } from 'react';
import DashboardView from '../features/DashboardView';
import TasksView from '../features/TasksView';
import KanbanView from '../features/KanbanView';
import SettingsView from '../features/SettingsView';
import Whiteboard from '../features/Whiteboard';
import { Memo } from '../../types';

interface MainContentProps {
    filter: string; // Changed from activeFilter
    searchQuery: string;
    memos: Memo[];
    filteredMemos: Memo[]; // Added
    onUpdate: (memo: Memo) => void;
    onDelete: (id: string) => void;
    onAdd: (memo: Partial<Memo>) => void; // Changed from onAddMemo
    onNavigate: (view: string) => void; // Added
    onClearHistory: () => void;
    isSyncing?: boolean;
    syncError?: any; // Added
    darkMode?: boolean; // Added
    onToggleDarkMode?: () => void; // Added
    onOpenSyncSettings?: () => void; // Added
    onExport?: () => void; // Added
    onImport?: (file: File) => void; // Added
}

const MainContent: React.FC<MainContentProps> = ({
    filter,
    searchQuery,
    memos,
    filteredMemos,
    onUpdate,
    onDelete,
    onAdd,
    onNavigate,
    onClearHistory,
    isSyncing,
    darkMode,
    onToggleDarkMode,
    onOpenSyncSettings,
    onExport,
    onImport
}) => {
    const renderContent = () => {
        switch (filter) {
            case 'dashboard':
                return (
                    <DashboardView
                        memos={memos}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                        onNavigate={onNavigate}
                        isSyncing={isSyncing}
                    />
                );
            case 'tasks':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                        searchQuery={searchQuery}
                        title="Active Tasks"
                    />
                );
            case 'notes':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                        searchQuery={searchQuery}
                        title="All Notes"
                    />
                );
            case 'archive':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                        searchQuery={searchQuery}
                        title="Archived Items"
                        onClearAll={onClearHistory}
                    />
                );
            case 'favorites':
                return (
                    <TasksView
                        memos={filteredMemos}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                        searchQuery={searchQuery}
                        title="Favorite Notes"
                    />
                );
            case 'kanban':
                return (
                    <KanbanView
                        memos={memos.filter(m => !m.isArchived)}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAdd={onAdd}
                    />
                );
            case 'whiteboard':
                return (
                    <Whiteboard
                        memos={memos.filter(m => m.type === 'sketch')}
                        onUpdate={onUpdate}
                        onAdd={onAdd}
                        onDelete={onDelete}
                    />
                );
            case 'settings':
                return (
                    <SettingsView
                        darkMode={!!darkMode}
                        onToggleDarkMode={onToggleDarkMode || (() => { })}
                        isSyncing={!!isSyncing}
                        onOpenSyncSettings={onOpenSyncSettings || (() => { })}
                        onExport={onExport || (() => { })}
                        onImport={onImport || (() => { })}
                        onClearHistory={onClearHistory}
                    />
                );
            default:
                return <DashboardView memos={memos} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} onNavigate={onNavigate} />;
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                {renderContent()}
            </Suspense>
        </div>
    );
};

export default MainContent;
