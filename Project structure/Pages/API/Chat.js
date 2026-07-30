const MAX_MESSAGE_LENGTH = 2000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 10
const UPSTREAM_TIMEOUT_MS = 30_000

const requestLog = new Map()

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded || '').split(',')[0].trim()
  return ip || req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(key) {
  const now = Date.now()
  const hits = (requestLog.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  hits.push(now)
  requestLog.set(key, hits)

  for (const [k, timestamps] of requestLog) {
    if (timestamps.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(k)
  }

  return hits.length > RATE_LIMIT_MAX_REQUESTS
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '8kb' },
  },
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not configured')
    return res.status(503).json({ error: 'Chat is unavailable' })
  }

  if (isRateLimited(clientKey(req))) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const message = req.body?.message
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Field "message" must be a string' })
  }

  const trimmed = message.trim()
  if (!trimmed) {
    return res.status(400).json({ error: 'Field "message" must not be empty' })
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Field "message" must be at most ${MAX_MESSAGE_LENGTH} characters`,
    })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: trimmed }],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('OpenAI request failed with status %d', response.status)
      return res.status(502).json({ error: 'Upstream request failed' })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content
    if (typeof reply !== 'string') {
      return res.status(502).json({ error: 'Upstream request failed' })
    }

    return res.status(200).json({ reply })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      console.error('Chat request timed out after %dms', UPSTREAM_TIMEOUT_MS)
      return res.status(504).json({ error: 'Upstream request timed out' })
    }
    console.error('Chat request errored:', error)
    return res.status(502).json({ error: 'Upstream request failed' })
  }
}
