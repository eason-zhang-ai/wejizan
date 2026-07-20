import Taro from '@tarojs/taro'
import type { EditorProject, MomentPost } from '@wejizan/contracts'
import { AVATAR_COLORS } from '@wejizan/editor-core'

function waitForPaint() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') return resolve()
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function captureWeb(project: EditorProject) {
  await waitForPaint()
  const node = document.getElementById('capture-surface')
  if (!node) throw new Error('截图画布尚未准备好')
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: project.device === 'ios' ? 393 : 360,
    height: project.device === 'ios' ? 852 : 800,
  })
  const link = document.createElement('a')
  link.download = `伪集赞-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`
  link.href = dataUrl
  link.click()
}

function wrapText(ctx: Taro.CanvasContext, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 8) {
  const chars = Array.from(text)
  let line = ''
  let lineIndex = 0
  for (const char of chars) {
    const next = `${line}${char}`
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight)
      lineIndex += 1
      line = char
      if (lineIndex >= maxLines) break
    } else {
      line = next
    }
  }
  if (lineIndex < maxLines && line) {
    ctx.fillText(line, x, y + lineIndex * lineHeight)
    lineIndex += 1
  }
  return lineIndex * lineHeight
}

function drawAvatar(ctx: Taro.CanvasContext, post: MomentPost, x: number, y: number, size: number) {
  const color = AVATAR_COLORS[post.author.avatarSeed % AVATAR_COLORS.length]![0]
  ctx.setFillStyle(color)
  ctx.fillRect(x, y, size, size)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(size * 0.42)
  ctx.fillText(post.author.nickname.slice(-1), x + size * 0.34, y + size * 0.64)
}

async function saveMiniCanvas(logical: { width: number; height: number }) {
  const result = await Taro.canvasToTempFilePath({
    canvasId: 'capture-canvas',
    width: logical.width,
    height: logical.height,
    destWidth: logical.width * 3,
    destHeight: logical.height * 3,
    fileType: 'png',
  })
  await Taro.saveImageToPhotosAlbum({ filePath: result.tempFilePath })
}

async function captureMiniProgramOverlay(project: EditorProject) {
  const logical = project.device === 'ios' ? { width: 393, height: 852 } : { width: 360, height: 800 }
  const overlay = project.overlay ?? { x: 8, y: 58, width: 84, replaceStatusBar: false }
  const post = project.posts.find((item) => item.id === project.targetPostId) ?? project.posts[0]!
  const ctx = Taro.createCanvasContext('capture-canvas')
  ctx.setFillStyle('#e8e9e8')
  ctx.fillRect(0, 0, logical.width, logical.height)
  if (overlay.sourceImage?.src) {
    ctx.drawImage(overlay.sourceImage.src, 0, 0, logical.width, logical.height)
  } else {
    ctx.setFillStyle('#66736d')
    ctx.setFontSize(15)
    ctx.fillText('请先上传朋友圈截图', logical.width / 2 - 70, logical.height / 2)
  }
  if (overlay.replaceStatusBar) {
    const statusHeight = project.device === 'ios' ? 47 : 32
    ctx.setFillStyle('rgba(250,250,250,0.96)')
    ctx.fillRect(0, 0, logical.width, statusHeight)
    ctx.setFillStyle('#111111')
    ctx.setFontSize(12)
    ctx.fillText(project.device === 'ios' ? '9:41' : '中国移动', 20, statusHeight * 0.62)
    ctx.fillText('▮▮  ◉  ▰', logical.width - 78, statusHeight * 0.62)
  }

  const x = logical.width * overlay.x / 100
  const y = logical.height * overlay.y / 100
  const width = logical.width * overlay.width / 100
  const likesText = `♡ ${post.likers.map((item) => item.nickname).join('，')}`
  const likesLines = post.likers.length > 0 ? Math.max(1, Math.ceil(likesText.length * 7 / Math.max(40, width - 14))) : 0
  const height = Math.max(32, 12 + likesLines * 18 + post.comments.length * 25 + (post.comments.length > 0 && likesLines > 0 ? 5 : 0))
  ctx.setFillStyle('#f3f3f5')
  ctx.fillRect(x, y, width, height)
  let cursorY = y + 18
  if (post.likers.length > 0) {
    ctx.setFillStyle('#576b95')
    ctx.setFontSize(12)
    cursorY += wrapText(ctx, likesText, x + 7, cursorY, width - 14, 17, 8)
  }
  if (post.comments.length > 0) {
    if (post.likers.length > 0) {
      ctx.setStrokeStyle('#e7e8ea')
      ctx.beginPath()
      ctx.moveTo(x + 7, cursorY + 1)
      ctx.lineTo(x + width - 7, cursorY + 1)
      ctx.stroke()
      cursorY += 9
    }
    post.comments.forEach((comment) => {
      ctx.setFillStyle('#576b95')
      ctx.setFontSize(12)
      ctx.fillText(`${comment.author.nickname}：`, x + 7, cursorY)
      const nameWidth = ctx.measureText(`${comment.author.nickname}：`).width
      ctx.setFillStyle('#252825')
      ctx.fillText(comment.text.slice(0, 22), x + 7 + nameWidth, cursorY)
      cursorY += 23
    })
  }
  if (project.watermarkEnabled) {
    ctx.setFillStyle('rgba(20,30,25,0.55)')
    ctx.setFontSize(9)
    ctx.fillText('模拟生成 · 伪集赞', logical.width - 94, logical.height - 16)
  }
  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))
  await saveMiniCanvas(logical)
}

async function captureMiniProgram(project: EditorProject) {
  const logical = project.device === 'ios' ? { width: 393, height: 852 } : { width: 360, height: 800 }
  const ctx = Taro.createCanvasContext('capture-canvas')
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, logical.width, logical.height)
  let cursorY = 0 - project.scrollTop
  ctx.setFillStyle('#78918c')
  ctx.fillRect(0, cursorY, logical.width, 275)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(17)
  ctx.fillText(project.owner.nickname, logical.width - 142, cursorY + 248)
  cursorY += 292
  for (const post of project.posts.filter((item) => !item.hidden)) {
    const startY = cursorY
    drawAvatar(ctx, post, 13, cursorY + 16, 42)
    ctx.setFillStyle('#576b95')
    ctx.setFontSize(15)
    ctx.fillText(post.author.nickname, 67, cursorY + 32)
    ctx.setFillStyle('#151515')
    ctx.setFontSize(15)
    cursorY += 48 + wrapText(ctx, post.text, 67, cursorY + 28, logical.width - 84, 22, 6)
    if (post.images.length > 0) {
      const cols = post.images.length === 1 ? 1 : post.images.length === 4 ? 2 : 3
      const cell = cols === 1 ? 172 : (logical.width - 84 - (cols - 1) * 4) / cols
      const rows = Math.ceil(post.images.length / cols)
      post.images.forEach((image, index) => {
        const x = 67 + (index % cols) * (cell + 4)
        const y = cursorY + Math.floor(index / cols) * (cell + 4)
        if (image.src && !image.src.startsWith('data:')) ctx.drawImage(image.src, x, y, cell, cell)
        else {
          ctx.setFillStyle(AVATAR_COLORS[(image.gradientSeed ?? index) % AVATAR_COLORS.length]![1])
          ctx.fillRect(x, y, cell, cell)
        }
      })
      cursorY += rows * (cell + 4) + 8
    }
    ctx.setFillStyle('#8a8a8a')
    ctx.setFontSize(11)
    ctx.fillText(post.timeLabel, 67, cursorY + 18)
    cursorY += 29
    if (post.likers.length || post.comments.length) {
      ctx.setFillStyle('#f3f3f5')
      const boxHeight = Math.max(32, Math.ceil(post.likers.length / 9) * 18 + post.comments.length * 27 + 12)
      ctx.fillRect(67, cursorY, logical.width - 80, boxHeight)
      ctx.setFillStyle('#576b95')
      ctx.setFontSize(12)
      wrapText(ctx, `♡ ${post.likers.map((item) => item.nickname).join('，')}`, 74, cursorY + 18, logical.width - 95, 17, 6)
      cursorY += boxHeight
    }
    cursorY = Math.max(cursorY + 18, startY + 108)
    ctx.setStrokeStyle('#eeeeee')
    ctx.beginPath()
    ctx.moveTo(0, cursorY)
    ctx.lineTo(logical.width, cursorY)
    ctx.stroke()
  }
  ctx.setFillStyle(project.scrollTop > 168 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.18)')
  ctx.fillRect(0, 0, logical.width, project.device === 'ios' ? 91 : 76)
  ctx.setFillStyle('#111111')
  ctx.setFontSize(14)
  ctx.fillText('9:41', 22, 24)
  ctx.setFontSize(18)
  ctx.fillText('‹', 18, 68)
  ctx.fillText('▣', logical.width - 35, 68)
  if (project.scrollTop > 168) ctx.fillText('朋友圈', logical.width / 2 - 28, 68)
  if (project.watermarkEnabled) {
    ctx.setFillStyle('rgba(20,30,25,0.46)')
    ctx.setFontSize(9)
    ctx.fillText('模拟生成 · 伪集赞', logical.width - 92, logical.height - 16)
  }

  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))
  await saveMiniCanvas(logical)
}

export async function captureCurrentViewport(project: EditorProject) {
  if (Taro.getEnv() === Taro.ENV_TYPE.WEB) return captureWeb(project)
  if (project.mode === 'overlay') return captureMiniProgramOverlay(project)
  return captureMiniProgram(project)
}
