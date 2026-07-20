import fs from 'node:fs'
import path from 'node:path'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import {
  commentsRequestSchema,
  polishRequestSchema,
} from '@wejizan/contracts'
import { z } from 'zod'
import { createAiProviderFromEnv, type AiProvider } from './ai.js'
import { createSessionToken, MemoryQuota, passwordMatches, verifySessionToken } from './auth.js'

export interface AppOptions {
  accessPassword?: string
  sessionSecret?: string
  aiProvider?: AiProvider
  staticDir?: string
  dailyQuota?: number
}

function errorBody(code: string, message: string, requestId: string, retryable = false) {
  return { error: { code, message, requestId, retryable } }
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'req.body.password', 'req.body.imageDataUrl'],
    },
    bodyLimit: 3_200_000,
  })
  if (process.env.NODE_ENV === 'production') {
    if (!options.accessPassword && !process.env.ACCESS_PASSWORD) throw new Error('ACCESS_PASSWORD is required in production')
    if (!options.sessionSecret && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production')
  }
  const accessPassword = options.accessPassword ?? process.env.ACCESS_PASSWORD ?? 'wejizan-local'
  const sessionSecret = options.sessionSecret ?? process.env.SESSION_SECRET ?? 'local-only-session-secret-change-me'
  const aiProvider = options.aiProvider ?? createAiProviderFromEnv()
  const quota = new MemoryQuota(5, options.dailyQuota ?? Number(process.env.AI_DAILY_QUOTA ?? 50))

  await app.register(cors, { origin: true })

  app.get('/api/health/live', async () => ({ status: 'ok' }))
  app.get('/api/health/ready', async () => ({ status: 'ready', aiConfigured: Boolean(aiProvider) }))
  app.get('/api/capabilities', async () => ({
    aiEnabled: Boolean(aiProvider),
    maxLikes: 100,
    maxComments: 8,
    version: '0.1.0',
  }))

  app.post('/api/session', async (request, reply) => {
    const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(request.body)
    if (!parsed.success || !passwordMatches(parsed.data.password, accessPassword)) {
      return reply.code(401).send(errorBody('INVALID_PASSWORD', '访问口令不正确', request.id))
    }
    return { token: createSessionToken(sessionSecret), expiresIn: 86_400 }
  })

  async function authorize(request: FastifyRequest, reply: FastifyReply) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token || !verifySessionToken(token, sessionSecret)) {
      return reply.code(401).send(errorBody('UNAUTHORIZED', '请先输入访问口令', request.id))
    }
    const result = quota.consume(token)
    if (!result.ok) {
      return reply.code(429).send(errorBody('RATE_LIMITED', result.reason === 'day' ? '今日 AI 次数已用完' : '请求过于频繁', request.id, true))
    }
  }

  app.post('/api/ai/polish', { preHandler: authorize }, async (request, reply) => {
    if (!aiProvider) return reply.code(503).send(errorBody('AI_NOT_CONFIGURED', '服务端尚未配置 AI 模型', request.id))
    const parsed = polishRequestSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send(errorBody('INVALID_INPUT', '文案参数无效', request.id))
    return aiProvider.polish(parsed.data)
  })

  app.post('/api/ai/comments', { preHandler: authorize }, async (request, reply) => {
    if (!aiProvider) return reply.code(503).send(errorBody('AI_NOT_CONFIGURED', '服务端尚未配置 AI 模型', request.id))
    const parsed = commentsRequestSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send(errorBody('INVALID_INPUT', '评论参数无效', request.id))
    return aiProvider.comments(parsed.data)
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed')
    reply.code(500).send(errorBody('INTERNAL_ERROR', '服务暂时不可用', request.id, true))
  })

  const candidate = options.staticDir ?? process.env.STATIC_DIR
  if (candidate) {
    const root = path.resolve(candidate)
    if (fs.existsSync(root)) {
      await app.register(fastifyStatic, { root, prefix: '/' })
      app.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) return reply.code(404).send(errorBody('NOT_FOUND', '接口不存在', request.id))
        return reply.sendFile('index.html')
      })
    }
  }

  return app
}
