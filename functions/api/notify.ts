export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { title, body, channel, config } = await context.request.json() as any;

    if (channel === 'wechat') {
      const { webhookUrl } = config;
      if (!webhookUrl) return new Response('Missing webhookUrl', { status: 400 });

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content: `${title}\n\n${body}` }
        })
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (channel === 'email') {
      const { apiKey, to } = config;
      if (!apiKey || !to) return new Response('Missing email config', { status: 400 });

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: [to],
          subject: title,
          text: body,
          html: `<p>${body.replace(/\n/g, '<br>')}</p>`
        })
      });

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }

      if (!res.ok) {
        return new Response(JSON.stringify({
          error: responseData.message || responseData.error || responseText,
          status: res.status
        }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (channel === 'weNotify') {
      const { endpoint, apiKey } = config;
      if (!endpoint) return new Response('Missing endpoint', { status: 400 });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          token: apiKey, // Some WeNotify variants use token in body
          title,
          body,
          content: body, // Compatibility for WeNotify engine
          timestamp: Date.now()
        })
      });
      const data = await res.text();
      return new Response(data, {
        headers: { 'Content-Type': 'application/json' },
        status: res.status
      });
    }

    return new Response('Invalid channel', { status: 400 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
