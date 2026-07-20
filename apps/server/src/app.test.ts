import { describe, expect, it } from 'vitest'
import type { AiProvider } from './ai'
import { buildApp } from './app'

const fakeAi: AiProvider = {
  async polish() {
    return {
      variants: [
        { tone: '自然', text: '自然版本' },
        { tone: '促销', text: '促销版本' },
        { tone: '简洁', text: '简洁版本' },
      ],
    }
  },
  async comments(request) {
    return { comments: Array.from({ length: request.count }, (_, index) => ({ text: `评论 ${index + 1}` })) }
  },
}

describe('server', () => {
  it('protects AI routes and accepts a valid session', async () => {
    const app = await buildApp({ accessPassword: 'secret', sessionSecret: 'test-secret', aiProvider: fakeAi })
    const unauthorized = await app.inject({ method: 'POST', url: '/api/ai/polish', payload: { text: 'hello', tone: 'natural' } })
    expect(unauthorized.statusCode).toBe(401)

    const session = await app.inject({ method: 'POST', url: '/api/session', payload: { password: 'secret' } })
    expect(session.statusCode).toBe(200)
    const { token } = session.json<{ token: string }>()
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/polish',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'hello', tone: 'natural' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().variants).toHaveLength(3)
    await app.close()
  })
})
