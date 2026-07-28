import Taro from '@tarojs/taro'
import { editorProjectSchema, type EditorProject } from '@wejizan/contracts'

const PROJECT_KEY = 'wejizan.project.v1'
const AI_CONFIGS_KEY = 'wejizan.ai.configs.v1'

export interface AiConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AiConfigDraft {
  id?: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

export async function loadProject(): Promise<EditorProject | undefined> {
  try {
    const value = Taro.getStorageSync(PROJECT_KEY)
    const parsed = editorProjectSchema.safeParse(typeof value === 'string' ? JSON.parse(value) : value)
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export async function saveProject(project: EditorProject) {
  Taro.setStorageSync(PROJECT_KEY, JSON.stringify(project))
}

function isAiConfig(value: unknown): value is AiConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<AiConfig>
  return typeof config.id === 'string'
    && typeof config.name === 'string'
    && typeof config.baseUrl === 'string'
    && typeof config.apiKey === 'string'
    && typeof config.model === 'string'
    && typeof config.active === 'boolean'
    && typeof config.createdAt === 'string'
    && typeof config.updatedAt === 'string'
}

export function loadAiConfigs(): AiConfig[] {
  try {
    const value = Taro.getStorageSync<unknown>(AI_CONFIGS_KEY)
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.filter(isAiConfig) : []
  } catch {
    return []
  }
}

export function getActiveAiConfig() {
  const configs = loadAiConfigs()
  return configs.find((config) => config.active) ?? configs[0]
}

function persistAiConfigs(configs: AiConfig[]) {
  Taro.setStorageSync(AI_CONFIGS_KEY, JSON.stringify(configs))
}

export function saveAiConfig(draft: AiConfigDraft) {
  const now = new Date().toISOString()
  const configs = loadAiConfigs()
  const existing = draft.id ? configs.find((config) => config.id === draft.id) : undefined
  const next: AiConfig = {
    id: existing?.id ?? `ai-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    apiKey: draft.apiKey.trim(),
    model: draft.model.trim(),
    active: existing?.active ?? configs.length === 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const saved = existing ? configs.map((config) => config.id === next.id ? next : config) : [...configs, next]
  persistAiConfigs(saved)
  return next
}

export function activateAiConfig(id: string) {
  const configs = loadAiConfigs().map((config) => ({ ...config, active: config.id === id, updatedAt: new Date().toISOString() }))
  persistAiConfigs(configs)
  return configs.find((config) => config.active)
}

export function deleteAiConfig(id: string) {
  const remaining = loadAiConfigs().filter((config) => config.id !== id)
  if (remaining.length > 0 && !remaining.some((config) => config.active)) remaining[0] = { ...remaining[0]!, active: true, updatedAt: new Date().toISOString() }
  persistAiConfigs(remaining)
}
