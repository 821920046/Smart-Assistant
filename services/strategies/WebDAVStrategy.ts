import { Memo } from '../../types';
import { SyncConfig } from '../sync';
import { BaseSyncStrategy } from './SyncStrategy';

export class WebDAVStrategy extends BaseSyncStrategy {
    async sync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
        const { webdavUrl, webdavUser, webdavPass } = config.settings;
        if (!webdavUrl) throw new Error('WebDAV URL 未配置');

        const auth = btoa(`${webdavUser}:${webdavPass}`);
        const fileName = 'memo_ai_sync.json';
        const fullUrl = `${webdavUrl.replace(/\/$/, '')}/${fileName}`;

        let remoteMemos: Memo[] = [];
        try {
            const res = await fetch(fullUrl, { headers: { 'Authorization': `Basic ${auth}` } });
            if (res.ok) {
                remoteMemos = await res.json();
            }
        } catch (e) {
            console.log('Remote WebDAV file not found or inaccessible');
        }

        const merged = this.mergeMemos(localMemos, remoteMemos);

        const needsUpload = merged.some(m => {
            const remote = remoteMemos.find(r => r.id === m.id);
            return !remote || m.updatedAt > remote.updatedAt;
        });

        if (needsUpload) {
            const putRes = await fetch(fullUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(merged)
            });
            if (!putRes.ok) throw new Error(`WebDAV PUT failed: ${putRes.status}`);
        }

        return merged;
    }
}
