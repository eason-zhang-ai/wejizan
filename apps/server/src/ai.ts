import {
  commentsResponseSchema,
  polishResponseSchema,
  type CommentsRequest,
  type CommentsResponse,
  type PolishRequest,
  type PolishResponse,
} from '@wejizan/contracts'

export interface AiProvider {
  polish(request: PolishRequest): Promise<PolishResponse>
  comments(request: CommentsRequest): Promise<CommentsResponse>
}

interface OpenAiCompatibleOptions {
  baseUrl: string
  apiKey: string
  model: string
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse((fenced ?? content).trim()) as unknown
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly options: OpenAiCompatibleOptions) {}

  private async complete(messages: unknown[]) {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0.8,
        messages,
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) {
      throw new Error(`AI upstream returned ${response.status}`)
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI upstream returned no content')
    return extractJson(content)
  }

  async polish(request: PolishRequest) {
    const raw = await this.complete([
      {
        role: 'system',
        content:
          '你是中文朋友圈文案编辑。保持事实不变，不制造价格、功效或承诺。只输出 JSON：{"variants":[{"tone":"自然","text":"..."},{"tone":"促销","text":"..."},{"tone":"简洁","text":"..."}]}。',
      },
      { role: 'user', content: `偏好语气：${request.tone}\n原文：${request.text}` },
    ])
    return polishResponseSchema.parse(raw)
  }

  async comments(request: CommentsRequest) {
    const prompt = `根据朋友圈正文生成 ${request.count} 条口语自然、彼此不同的中文短评论。不要包含联系方式、承诺或敏感内容。只输出 JSON：{"comments":[{"text":"..."}]}。正文：${request.copy}`
    const content: unknown = request.imageDataUrl
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: request.imageDataUrl } },
        ]
      : prompt
    const raw = await this.complete([
      { role: 'system', content: '你负责生成自然、友善的朋友圈评论。' },
      { role: 'user', content },
    ])
    return commentsResponseSchema.parse(raw)
  }
}

export function createAiProviderFromEnv(): AiProvider | undefined {
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL
  if (!baseUrl || !apiKey || !model) return undefined
  return new OpenAiCompatibleProvider({ baseUrl, apiKey, model })
}
