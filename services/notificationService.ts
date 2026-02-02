import { NotificationConfig } from '../types';

export const notificationService = {
    async send(title: string, body: string, config: NotificationConfig) {
        const { channels } = config;
        const results: { channel: string; success: boolean; error?: any }[] = [];

        // 1. Browser Notification (Still direct as it's a client API)
        if (channels.browser && "Notification" in window) {
            if (Notification.permission === "granted") {
                try {
                    new Notification(title, { body, icon: '/favicon.ico' });
                    results.push({ channel: 'browser', success: true });
                } catch (e) {
                    results.push({ channel: 'browser', success: false, error: e });
                }
            } else {
                results.push({ channel: 'browser', success: false, error: 'Permission not granted' });
            }
        }

        const promises: Promise<any>[] = [];

        // Helper to send via proxy
        const sendViaProxy = async (channel: string, channelConfig: any) => {
            try {
                const res = await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, body, channel, config: channelConfig })
                });
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || `Proxy error: ${res.status}`);
                }
                results.push({ channel, success: true });
            } catch (e) {
                results.push({ channel, success: false, error: e instanceof Error ? e.message : String(e) });
            }
        };

        // 2. WeNotify Edge
        if (channels.weNotify?.enabled && channels.weNotify.endpoint) {
            promises.push(sendViaProxy('weNotify', channels.weNotify));
        }

        // 3. WeChat Robot
        if (channels.wechat?.enabled && channels.wechat.webhookUrl) {
            promises.push(sendViaProxy('wechat', channels.wechat));
        }

        // 4. Email (Resend)
        if (channels.email?.enabled && channels.email.apiKey && channels.email.to) {
            promises.push(sendViaProxy('email', channels.email));
        }

        await Promise.allSettled(promises);
        return results;
    }
};
