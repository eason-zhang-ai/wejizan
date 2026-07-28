import Taro from '@tarojs/taro'
import {
  commentsResponseSchema,
  polishResponseSchema,
  type CommentsResponse,
  type PolishResponse,
} from '@wejizan/contracts'
import type { AiConfig } from './storage'

interface OpenAiCompletion {
  choices?: Array<{ message?: { content?: string } }>
}

function apiBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(normalized)) throw new Error('API 地址必须以 http:// 或 https:// 开头')
  return /\/v1$/i.test(normalized) ? normalized : `${normalized}/v1`
}

function parseJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse((fenced ?? content).trim()) as unknown
}

function errorMessage(data: unknown, statusCode: number) {
  if (typeof data === 'object' && data) {
    const error = (data as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string') return error.message
  }
  return `AI 服务返回 ${statusCode}`
}

async function completion(config: AiConfig, messages: unknown[]) {
  const response = await Taro.request<OpenAiCompletion | { error?: { message?: string } }>({
    url: `${apiBaseUrl(config.baseUrl)}/chat/completions`,
    method: 'POST',
    data: {
      model: config.model,
      temperature: 0.8,
      messages,
    },
    header: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    timeout: 50_000,
  })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(errorMessage(response.data, response.statusCode))
  }
  const content = (response.data as OpenAiCompletion).choices?.[0]?.message?.content
  if (!content) throw new Error('AI 服务没有返回内容')
  try {
    return parseJson(content)
  } catch {
    throw new Error('AI 返回格式无效，请更换支持 JSON 输出的模型')
  }
}

export async function testAiConfig(config: AiConfig) {
  const response = await Taro.request({
    url: `${apiBaseUrl(config.baseUrl)}/models`,
    method: 'GET',
    header: { authorization: `Bearer ${config.apiKey}` },
    timeout: 15_000,
  })
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(errorMessage(response.data, response.statusCode))
}

export async function polishCopy(text: string, config: AiConfig): Promise<PolishResponse> {
  const raw = await completion(config, [
    {
      role: 'system',
      content: '你是中文朋友圈文案编辑。保持事实不变，不制造价格、功效或承诺。只输出 JSON：{"variants":[{"tone":"自然","text":"..."},{"tone":"促销","text":"..."},{"tone":"简洁","text":"..."}]}。',
    },
    { role: 'user', content: `偏好语气：natural\n原文：${text}` },
  ])
  return polishResponseSchema.parse(raw)
}

export async function generateComments(copy: string, count: number, config: AiConfig): Promise<CommentsResponse> {
  const raw = await completion(config, [
    { role: 'system', content: '你负责生成自然、友善的朋友圈评论。' },
    { role: 'user', content: `根据朋友圈正文生成 ${count} 条口语自然、彼此不同的中文短评论。不要包含联系方式、承诺或敏感内容。只输出 JSON：{"comments":[{"text":"..."}]}。正文：${copy}` },
  ])
  return commentsResponseSchema.parse(raw)
}
