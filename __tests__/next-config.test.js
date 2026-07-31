/**
 * @jest-environment node
 */
const nextConfig = require('../next.config')

async function getHeaders() {
  const rules = await nextConfig.headers()
  expect(rules).toHaveLength(1)
  expect(rules[0].source).toBe('/:path*')
  return Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]))
}

describe('next.config security hardening', () => {
  it('does not advertise the framework and enables strict mode', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    expect(nextConfig.reactStrictMode).toBe(true)
  })

  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
    ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ])('sends %s on every route', async (key, value) => {
    const headers = await getHeaders()
    expect(headers[key]).toBe(value)
  })
})
