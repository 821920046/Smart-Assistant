import { describe, it, expect } from 'vitest';
import { syncService } from './sync';
import { Memo } from '../types';

describe('syncService.mergeMemos', () => {
    const createMemo = (id: string, updatedAt: number, content = 'test'): Memo => ({
        id,
        content,
        type: 'memo',
        tags: [],
        createdAt: Date.now() - 1000,
        updatedAt,
        isArchived: false,
        isFavorite: false,
        priority: 'normal'
    });

    it('should merge local and remote memos by id', () => {
        const local = [createMemo('1', 100), createMemo('2', 200)];
        const remote = [createMemo('3', 300)];

        const merged = syncService.mergeMemos(local, remote);

        expect(merged).toHaveLength(3);
        expect(merged.map(m => m.id).sort()).toEqual(['1', '2', '3']);
    });

    it('should prefer newer version when ids match', () => {
        const local = [createMemo('1', 100, 'old')];
        const remote = [createMemo('1', 200, 'new')];

        const merged = syncService.mergeMemos(local, remote);

        expect(merged).toHaveLength(1);
        expect(merged[0].content).toBe('new');
        expect(merged[0].updatedAt).toBe(200);
    });

    it('should keep local version if it is newer', () => {
        const local = [createMemo('1', 300, 'local-new')];
        const remote = [createMemo('1', 100, 'remote-old')];

        const merged = syncService.mergeMemos(local, remote);

        expect(merged).toHaveLength(1);
        expect(merged[0].content).toBe('local-new');
    });

    it('should sort results by updatedAt descending', () => {
        const local = [createMemo('1', 100)];
        const remote = [createMemo('2', 300), createMemo('3', 200)];

        const merged = syncService.mergeMemos(local, remote);

        expect(merged.map(m => m.id)).toEqual(['2', '3', '1']);
    });

    it('should handle empty arrays', () => {
        expect(syncService.mergeMemos([], [])).toEqual([]);

        const local = [createMemo('1', 100)];
        expect(syncService.mergeMemos(local, [])).toHaveLength(1);
        expect(syncService.mergeMemos([], local)).toHaveLength(1);
    });
});
