export interface Env {
    // Secrets to be configured in Cloudflare Dashboard
    GITHUB_TOKEN?: string;
    GITHUB_REPO?: string; // e.g. "user/repo"
    GIST_ID?: string;
    GIST_TOKEN?: string;
    ENCRYPTION_PASSWORD?: string;

    // KV Store to prevent duplicate notifications within the same time window
    NOTIFIED_CACHE?: KVNamespace;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(handleScheduled(env));
    },
};

async function handleScheduled(env: Env) {
    console.log("Cron trigger started at:", new Date().toISOString());

    try {
        let syncData: any = null;

        // 1. Fetch Sync Data (GitHub or Gist)
        if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
            syncData = await fetchFromGitHub(env);
        } else if (env.GIST_TOKEN && env.GIST_ID) {
            syncData = await fetchFromGist(env);
        }

        if (!syncData) {
            console.error("No sync provider configured or fetch failed");
            return;
        }

        // 2. Decrypt Data
        const password = env.ENCRYPTION_PASSWORD;
        if (!password) {
            console.error("ENCRYPTION_PASSWORD not set");
            return;
        }

        // Cloudflare Workers support subtle crypto natively
        const decryptedJson = await decryptData(syncData, password);
        const data = JSON.parse(decryptedJson);

        // 3. Scan for Reminders
        const allMemos = [...(data.memos || []), ...(data.todos || []), ...(data.whiteboards || [])];
        const config = data.notificationConfig;

        if (!config || !config.channels) {
            console.log("No notification config found in sync data");
            return;
        }

        const now = Date.now();
        const remindersToTrigger = allMemos.filter(memo => {
            // Must have reminderAt, must be in the past (or within 2 min window for safety), must not be reminded
            return memo.reminderAt &&
                now >= memo.reminderAt &&
                (now - memo.reminderAt) < 3600000 && // Only notify if it's within the last hour (avoid old spam)
                !memo.reminded;
        });

        console.log(`Found ${remindersToTrigger.length} potential reminders`);

        for (const memo of remindersToTrigger) {
            const lockKey = `notified:${memo.id}:${memo.reminderAt}`;

            // Check if we already notified this in a previous cron run
            if (env.NOTIFIED_CACHE) {
                const alreadyNotified = await env.NOTIFIED_CACHE.get(lockKey);
                if (alreadyNotified) continue;
            }

            console.log(`Triggering notification for memo: ${memo.id}`);

            const title = "任务提醒 (来自云端)";
            const body = memo.content || memo.title || "您有一个到期任务！";

            const success = await sendNotification(title, body, config.channels);

            if (success && env.NOTIFIED_CACHE) {
                // Cache for 2 hours to prevent duplicates
                await env.NOTIFIED_CACHE.put(lockKey, "1", { expirationTtl: 7200 });
            }
        }
    } catch (err: any) {
        console.error("Cron handler failed:", err.message);
    }
}

async function fetchFromGitHub(env: Env) {
    const [owner, repo] = env.GITHUB_REPO!.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json?ref=smart-assistant-data&t=${Date.now()}`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Cloudflare-Worker'
        }
    });

    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
    const data = await res.json() as any;
    const content = atob(data.content.replace(/\s/g, ''));
    return JSON.parse(content);
}

async function fetchFromGist(env: Env) {
    const url = `https://api.github.com/gists/${env.GIST_ID}?t=${Date.now()}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `token ${env.GIST_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Cloudflare-Worker'
        }
    });

    if (!res.ok) throw new Error(`Gist fetch failed: ${res.status}`);
    const data = await res.json() as any;
    const file = data.files['sync-data.json'];
    if (!file) throw new Error("sync-data.json not found in gist");
    return JSON.parse(file.content);
}

async function decryptData(encrypted: any, password: string): Promise<string> {
    const encoder = new TextEncoder();

    const salt = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

async function sendNotification(title: string, body: string, channels: any) {
    let success = false;

    // 1. WeNotify Edge
    if (channels.weNotify?.enabled && channels.weNotify.endpoint) {
        let endpoint = channels.weNotify.endpoint;
        if (!endpoint.endsWith('/wxsend') && !endpoint.includes('/api/')) {
            endpoint = endpoint.replace(/\/$/, '') + '/wxsend';
        }
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: channels.weNotify.apiKey,
                    title, content: body, timestamp: Date.now()
                })
            });
            success = true;
        } catch (e) { console.error("WeNotify failed", e); }
    }

    // 2. WeChat Robot
    if (channels.wechat?.enabled && channels.wechat.webhookUrl) {
        try {
            await fetch(channels.wechat.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    msgtype: 'text',
                    text: { content: `${title}\n\n${body}` }
                })
            });
            success = true;
        } catch (e) { console.error("WeChat failed", e); }
    }

    // 3. Email (Resend)
    if (channels.email?.enabled && channels.email.apiKey && channels.email.to) {
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${channels.email.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: [channels.email.to],
                    subject: title,
                    text: body,
                    html: `<p>${body.replace(/\n/g, '<br>')}</p>`
                })
            });
            success = true;
        } catch (e) { console.error("Email failed", e); }
    }

    return success;
}
