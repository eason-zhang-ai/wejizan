import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

interface SessionPayload {
  exp: number
  issuedAt: number
  nonce: string
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function sign(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest('base64url')
}

export function passwordMatches(input: string, expected: string) {
  return safeEqual(input, expected)
}

export function createSessionToken(secret: string, now = Date.now()) {
  const payload: SessionPayload = {
    exp: now + 24 * 60 * 60 * 1000,
    issuedAt: now,
    nonce: randomBytes(16).toString('base64url'),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifySessionToken(token: string, secret: string, now = Date.now()) {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature || !safeEqual(signature, sign(encoded, secret))) return false
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload
    return Number.isFinite(payload.exp) && payload.exp > now
  } catch {
    return false
  }
}

interface QuotaBucket {
  minuteKey: number
  minuteCount: number
  dayKey: number
  dayCount: number
}

export class MemoryQuota {
  private readonly buckets = new Map<string, QuotaBucket>()

  constructor(
    private readonly perMinute = 5,
    private readonly perDay = 50,
  ) {}

  consume(token: string, now = Date.now()) {
    const minuteKey = Math.floor(now / 60_000)
    const dayKey = Math.floor(now / 86_400_000)
    const current = this.buckets.get(token) ?? { minuteKey, minuteCount: 0, dayKey, dayCount: 0 }
    if (current.minuteKey !== minuteKey) {
      current.minuteKey = minuteKey
      current.minuteCount = 0
    }
    if (current.dayKey !== dayKey) {
      current.dayKey = dayKey
      current.dayCount = 0
    }
    if (current.minuteCount >= this.perMinute) return { ok: false as const, reason: 'minute' as const }
    if (current.dayCount >= this.perDay) return { ok: false as const, reason: 'day' as const }
    current.minuteCount += 1
    current.dayCount += 1
    this.buckets.set(token, current)
    return { ok: true as const, remaining: Math.max(0, this.perDay - current.dayCount) }
  }
}
