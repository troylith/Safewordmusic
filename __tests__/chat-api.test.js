/**
 * @jest-environment node
 */
import handler from '../pages/api/chat'

function createRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    ended: false,
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
  return res
}

function mockFetchResponse(payload) {
  global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(payload) })
}

const originalFetch = global.fetch
const originalKey = process.env.OPENAI_API_KEY

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
})

afterEach(() => {
  jest.restoreAllMocks()
  global.fetch = originalFetch
  process.env.OPENAI_API_KEY = originalKey
})

describe('Chat API handler', () => {
  it('rejects non-POST requests with 405 and no body', async () => {
    global.fetch = jest.fn()
    const res = createRes()

    await handler({ method: 'GET', body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.ended).toBe(true)
    expect(res.json).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('forwards the message to the completions API with the configured key', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'hi there' } }] })
    const res = createRes()

    await handler({ method: 'POST', body: { message: 'hello' } }, res)

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

  it('fails with 500 when the API key is not configured', async () => {
    delete process.env.OPENAI_API_KEY
    global.fetch = jest.fn()
    const res = createRes()

    await handler({ method: 'POST', body: { message: 'hello' } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toEqual({ error: 'OPENAI_API_KEY is not set' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('responds with the first choice content', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'hi there' } }] })
    const res = createRes()

    await handler({ method: 'POST', body: { message: 'hello' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toEqual({ reply: 'hi there' })
  })

  it.each([
    ['no choices key', {}],
    ['empty choices array', { choices: [] }],
    ['choice without a message', { choices: [{}] }],
  ])('falls back to "No reply" when the response has %s', async (_label, payload) => {
    mockFetchResponse(payload)
    const res = createRes()

    await handler({ method: 'POST', body: { message: 'hello' } }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toEqual({ reply: 'No reply' })
  })

  it('sends an undefined message when the body has no message field', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'ok' } }] })
    const res = createRes()

    await handler({ method: 'POST', body: {} }, res)

    expect(JSON.parse(global.fetch.mock.calls[0][1].body).messages).toEqual([{ role: 'user' }])
  })

  it('propagates fetch failures', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const res = createRes()

    await expect(handler({ method: 'POST', body: { message: 'hello' } }, res)).rejects.toThrow(
      'network down'
    )
    expect(res.json).not.toHaveBeenCalled()
  })
})
