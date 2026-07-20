import Taro from '@tarojs/taro'
import type { CommentsResponse, PolishResponse } from '@wejizan/contracts'

const configuredBase = process.env.TARO_APP_API_BASE_URL ?? ''

async function apiRequest<T>(path: string, method: 'GET' | 'POST', data?: unknown, token?: string): Promise<T> {
  const response = await Taro.request<T & { error?: { message?: string } }>({
    url: `${configuredBase}${path}`,
    method,
    data,
    header: token ? { authorization: `Bearer ${token}` } : undefined,
    timeout: 50_000,
  })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(response.data?.error?.message ?? '请求失败，请稍后重试')
  }
  return response.data
}

export function createSession(password: string) {
  return apiRequest<{ token: string; expiresIn: number }>('/api/session', 'POST', { password })
}

export function polishCopy(text: string, token: string) {
  return apiRequest<PolishResponse>('/api/ai/polish', 'POST', { text, tone: 'natural' }, token)
}

export function generateComments(copy: string, count: number, token: string) {
  return apiRequest<CommentsResponse>('/api/ai/comments', 'POST', { copy, count }, token)
}
