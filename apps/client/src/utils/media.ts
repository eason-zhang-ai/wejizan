import Taro from '@tarojs/taro'
import type { LocalImage } from '@wejizan/contracts'
import { createId } from '@wejizan/editor-core'

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function persistPath(path: string) {
  if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
    const response = await fetch(path)
    return blobToDataUrl(await response.blob())
  }
  try {
    const result = await Taro.saveFile({ tempFilePath: path })
    return 'savedFilePath' in result ? result.savedFilePath : path
  } catch {
    return path
  }
}

export async function chooseImages(maxCount: number): Promise<LocalImage[]> {
  const result = await Taro.chooseMedia({ count: Math.max(1, Math.min(9, maxCount)), mediaType: ['image'], sourceType: ['album', 'camera'] })
  return Promise.all(result.tempFiles.map(async (file, index) => ({
    id: createId('image'),
    src: await persistPath(file.tempFilePath),
    width: file.width,
    height: file.height,
    cropX: 0.5,
    cropY: 0.5,
    scale: 1,
    gradientSeed: index,
  })))
}
