import { NotificationConfig } from '../types';

export const notificationService = {
    async send(title: string, body: string, config: NotificationConfig, trackId?: string) {
        const { channels } = config;
        const results: { channel: string; success: boolean; error?: any }[] = [];

        // 1. Browser Notification
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

        // 2. WeNotify Edge
        if (channels.weNotify?.enabled && channels.weNotify.endpoint) {
            promises.push(
                fetch(channels.weNotify.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(channels.weNotify.apiKey ? { 'Authorization': `Bearer ${channels.weNotify.apiKey}` } : {})
                    },
                    body: JSON.stringify({ title, body, timestamp: Date.now() })
                }).then(() => results.push({ channel: 'weNotify', success: true }))
                    .catch(e => results.push({ channel: 'weNotify', success: false, error: e }))
            );
        }

        // 3. WeChat Robot
        if (channels.wechat?.enabled && channels.wechat.webhookUrl) {
            promises.push(
                fetch(channels.wechat.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        msgtype: 'text',
                        text: { content: `${title}\n\n${body}` }
                    })
                }).then(() => results.push({ channel: 'wechat', success: true }))
                    .catch(e => results.push({ channel: 'wechat', success: false, error: e }))
            );
        }

        // 4. Email (Resend)
        if (channels.email?.enabled && channels.email.apiKey && channels.email.to) {
            promises.push(
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${channels.email.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Smart Assistant <onboarding@resend.dev>',
                        to: [channels.email.to],
                        subject: title,
                        text: body
                    })
                }).then(() => results.push({ channel: 'email', success: true }))
                    .catch(e => results.push({ channel: 'email', success: false, error: e }))
            );
        }

        await Promise.allSettled(promises);
        return results;
    }
};
