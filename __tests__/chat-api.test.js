/**
 * @jest-environment node
 */
import handler from '../Project structure/Pages/API/Chat'

function createRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    ended: false,
    headers: {},
  }
  res.status = jest.fn((code) => {
    res.statusCode = code
    return res
  })
  res.json = jest.fn((payload) => {
    res.body = payload
    return res
  })
  res.end = jest.fn(() => {
    res.ended = true
    return res
  })
  res.setHeader = jest.fn((key, value) => {
    res.headers[key] = value
    return res
  })
  return res
}

function createReq(overrides = {}) {
  return {
    method: 'POST',
    body: {},
    headers: { 'x-forwarded-for': `10.0.0.${ipCounter++}` },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  }
}

function mockFetchResponse(payload, { ok = true, status = 200 } = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(payload),
  })
}

let ipCounter = 1
const originalFetch = global.fetch
const originalKey = process.env.OPENAI_API_KEY

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  global.fetch = originalFetch
  process.env.OPENAI_API_KEY = originalKey
})

describe('Chat API handler', () => {
  it('rejects non-POST requests with 405', async () => {
    global.fetch = jest.fn()
    const res = createRes()

    await handler(createReq({ method: 'GET' }), res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.headers.Allow).toBe('POST')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('never caches responses', async () => {
    global.fetch = jest.fn()
    const res = createRes()

    await handler(createReq({ method: 'GET' }), res)

    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('responds with 503 when the API key is not configured', async () => {
    delete process.env.OPENAI_API_KEY
    global.fetch = jest.fn()
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('forwards the message to the completions API with the server-side key', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'hi there' } }] })
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(options.body)).toEqual({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'hello' }],
    })
  })

  it('responds with the first choice content', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'hi there' } }] })
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toEqual({ reply: 'hi there' })
  })

  it.each([
    ['no choices key', {}],
    ['empty choices array', { choices: [] }],
    ['choice without a message', { choices: [{}] }],
  ])('responds with 502 when the upstream payload has %s', async (_label, payload) => {
    mockFetchResponse(payload)
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.body).toEqual({ error: 'Upstream request failed' })
  })

  it.each([
    ['the message field is missing', {}],
    ['the message is not a string', { message: 42 }],
    ['the message is blank', { message: '   ' }],
    ['the message is too long', { message: 'a'.repeat(2001) }],
  ])('responds with 400 when %s', async (_label, body) => {
    global.fetch = jest.fn()
    const res = createRes()

    await handler(createReq({ body }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rate limits a client after 10 requests in the window', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'ok' } }] })
    const headers = { 'x-forwarded-for': '203.0.113.7' }

    for (let i = 0; i < 10; i += 1) {
      const res = createRes()
      await handler(createReq({ headers, body: { message: 'hello' } }), res)
      expect(res.statusCode).toBe(200)
    }

    const limited = createRes()
    await handler(createReq({ headers, body: { message: 'hello' } }), limited)

    expect(limited.status).toHaveBeenCalledWith(429)
    expect(global.fetch).toHaveBeenCalledTimes(10)
  })

  it('converts upstream errors into a 502 without leaking details', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.body).toEqual({ error: 'Upstream request failed' })
  })

  it('converts an upstream timeout into a 504', async () => {
    const timeout = new Error('The operation was aborted due to timeout')
    timeout.name = 'TimeoutError'
    global.fetch = jest.fn().mockRejectedValue(timeout)
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(504)
    expect(res.body).toEqual({ error: 'Upstream request timed out' })
  })

  it('converts a non-ok upstream status into a 502', async () => {
    mockFetchResponse({}, { ok: false, status: 500 })
    const res = createRes()

    await handler(createReq({ body: { message: 'hello' } }), res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.body).toEqual({ error: 'Upstream request failed' })
  })
})
