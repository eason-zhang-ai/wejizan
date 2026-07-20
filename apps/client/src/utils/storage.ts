import Taro from '@tarojs/taro'
import { editorProjectSchema, type EditorProject } from '@wejizan/contracts'

const PROJECT_KEY = 'wejizan.project.v1'
const TOKEN_KEY = 'wejizan.session.token'

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

export function loadSessionToken() {
  return Taro.getStorageSync<string>(TOKEN_KEY) || ''
}

export function saveSessionToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token)
}
