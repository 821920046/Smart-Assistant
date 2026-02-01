import { NotificationConfig } from '../types';

export const notificationService = {
    async send(title: string, body: string, config: NotificationConfig) {
        const { channels } = config;
        const promises: Promise<any>[] = [];

        // 1. Browser Notification
        if (channels.browser && "Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(title, { body, icon: '/favicon.ico' });
            } catch (e) {
                console.warn("Browser notification failed", e);
            }
        }

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
                }).catch(e => console.error("WeNotify failed", e))
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
                }).catch(e => console.error("WeChat failed", e))
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
                }).catch(e => console.error("Resend failed", e))
            );
        }

        await Promise.allSettled(promises);
    }
};
