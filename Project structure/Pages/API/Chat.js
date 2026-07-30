const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const message = req.body?.message;
  if (typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'A non-empty "message" string is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('chat: OPENAI_API_KEY is not configured');
    return res.status(500).json({ error: 'Chat is not configured' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('chat: upstream request timed out after %dms', REQUEST_TIMEOUT_MS);
      return res.status(504).json({ error: 'Chat provider timed out' });
    }
    console.error('chat: upstream request failed', error);
    return res.status(502).json({ error: 'Chat provider is unreachable' });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await response.text().catch((error) => {
    console.error('chat: failed to read upstream response body', error);
    return '';
  });

  if (!response.ok) {
    console.error('chat: upstream returned %d: %s', response.status, rawBody);
    const status = response.status === 429 || response.status >= 500 ? 502 : 500;
    return res.status(status).json({ error: 'Chat provider returned an error' });
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    console.error('chat: upstream returned invalid JSON', error);
    return res.status(502).json({ error: 'Chat provider returned an invalid response' });
  }

  const reply = data.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || reply === '') {
    console.error('chat: upstream response contained no reply: %s', rawBody);
    return res.status(502).json({ error: 'Chat provider returned no reply' });
  }

  return res.status(200).json({ reply });
}
