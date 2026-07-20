import type {
  DeviceKind,
  EditorProject,
  Identity,
  MomentComment,
  MomentPost,
  StatusBarScheme,
} from '@wejizan/contracts'

export const AVATAR_COLORS = [
  ['#7d8aa3', '#cad3df'],
  ['#9a706f', '#ebc8b5'],
  ['#557d76', '#b7d5c8'],
  ['#726988', '#d3c9e7'],
  ['#b17d42', '#f0d3a8'],
  ['#58728c', '#b9d2e7'],
  ['#8f6a83', '#e2bfd2'],
  ['#6d8155', '#ccdaa9'],
] as const

const SURNAMES = ['林', '陈', '苏', '周', '顾', '许', '沈', '叶', '陆', '夏', '唐', '江', '宋', '温', '程', '白', '乔', '何', '黎', '罗']
const GIVEN_NAMES = ['小满', '清禾', '知夏', '安安', '阿北', '一川', '晚晴', '木木', '向阳', '可可', '星野', '予安', '南乔', '元宝', '小野', '念念', '小鹿', '橙子', '青岚', '景行']
const COMMENTS = [
  '看起来很不错，先支持一下！',
  '这个活动还有多久呀？',
  '已点赞，祝顺利达成～',
  '图片拍得很有质感。',
  '被种草了，求个链接。',
  '支持支持，冲一波！',
  '这个文案也太可爱了。',
  '已帮忙，记得请喝奶茶。',
  '刚好最近在看这一类。',
  '氛围感拉满了。',
]
const POST_TEXTS = [
  '周末散步遇到一片很温柔的光，随手记录一下。',
  '今天的快乐很简单：好天气、好咖啡，还有按时下班。',
  '最近在认真生活，也在认真收集每一个小小的好消息。',
  '分享一组刚整理好的照片，最喜欢第二张。',
  '把普通的一天过得闪闪发光。',
  '新发现的小店，窗边的位置很适合发呆。',
]

export function createId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createIdentity(seed = Math.floor(Math.random() * 10_000)): Identity {
  return {
    id: createId('person'),
    nickname: `${SURNAMES[seed % SURNAMES.length]}${GIVEN_NAMES[Math.floor(seed / SURNAMES.length) % GIVEN_NAMES.length]}`,
    avatarSeed: seed,
  }
}

export function createIdentities(count: number, offset = Math.floor(Math.random() * 1_000)): Identity[] {
  const used = new Set<string>()
  const result: Identity[] = []
  let cursor = offset
  while (result.length < count && cursor < offset + 10_000) {
    const identity = createIdentity(cursor)
    cursor += 1
    if (used.has(identity.nickname)) continue
    used.add(identity.nickname)
    result.push(identity)
  }
  return result
}

export function createComments(count: number, offset = 0): MomentComment[] {
  const identities = createIdentities(count, offset + 31)
  return identities.map((author, index) => ({
    id: createId('comment'),
    author,
    text: COMMENTS[(index + offset) % COMMENTS.length]!,
  }))
}

function createMockPost(index: number): MomentPost {
  return {
    id: createId('post'),
    author: createIdentity(index * 17 + 3),
    text: POST_TEXTS[index % POST_TEXTS.length]!,
    images: Array.from({ length: (index % 3) + 1 }, (_, imageIndex) => ({
      id: createId('image'),
      src: '',
      cropX: 0.5,
      cropY: 0.5,
      scale: 1,
      gradientSeed: index * 7 + imageIndex,
    })),
    timeLabel: `${index + 1}小时前`,
    location: index % 2 === 0 ? '杭州 · 西湖边' : undefined,
    likers: createIdentities(3 + index, index * 19),
    comments: createComments(index % 3, index * 5),
    isTarget: false,
    hidden: false,
  }
}

export function createStatusBar(device: DeviceKind): StatusBarScheme {
  const isIos = device === 'ios'
  return {
    id: `${device}-default`,
    name: isIos ? 'iOS 经典' : 'Android 经典',
    platform: device,
    foreground: 'dark',
    background: 'transparent',
    custom: false,
    components: [
      { id: createId('status'), type: 'time', x: isIos ? 13 : 7, y: 52, scale: 1, value: '9:41', visible: true },
      { id: createId('status'), type: 'carrier', x: isIos ? 69 : 22, y: 52, scale: 0.88, value: isIos ? '' : '中国移动', visible: !isIos },
      { id: createId('status'), type: 'signal', x: isIos ? 79 : 72, y: 52, scale: 1, value: '', visible: true },
      { id: createId('status'), type: 'wifi', x: isIos ? 86 : 80, y: 52, scale: 1, value: '', visible: true },
      { id: createId('status'), type: 'battery', x: isIos ? 94 : 91, y: 52, scale: 1, value: '86', visible: true },
    ],
  }
}

export function createProject(): EditorProject {
  const targetId = createId('post')
  const target: MomentPost = {
    id: targetId,
    author: createIdentity(88),
    text: '新店开业集赞活动开始啦！帮忙点个赞，感谢每一位朋友的支持。',
    images: [{ id: createId('image'), src: '', cropX: 0.5, cropY: 0.5, scale: 1, gradientSeed: 40 }],
    timeLabel: '2小时前',
    location: '城市生活广场',
    likers: createIdentities(28, 100),
    comments: createComments(3, 12),
    isTarget: true,
    hidden: false,
  }
  const fillers = Array.from({ length: 4 }, (_, index) => createMockPost(index))
  return {
    schemaVersion: 1,
    id: createId('project'),
    name: '我的集赞截图',
    mode: 'generated',
    device: 'ios',
    owner: createIdentity(42),
    posts: [fillers[0]!, target, ...fillers.slice(1)],
    targetPostId: targetId,
    scrollTop: 0,
    statusBar: createStatusBar('ios'),
    watermarkEnabled: true,
    overlay: {
      x: 8,
      y: 58,
      width: 84,
      replaceStatusBar: false,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function replaceLikeCount(post: MomentPost, count: number): MomentPost {
  const safeCount = Math.max(0, Math.min(100, Math.round(count)))
  return {
    ...post,
    likers: createIdentities(safeCount, post.author.avatarSeed + safeCount * 3),
  }
}

export function replaceCommentCount(post: MomentPost, count: number): MomentPost {
  const safeCount = Math.max(0, Math.min(8, Math.round(count)))
  return { ...post, comments: createComments(safeCount, post.author.avatarSeed + 17) }
}

export function rerollPost(post: MomentPost): MomentPost {
  const seed = Math.floor(Math.random() * 10_000)
  return {
    ...post,
    author: createIdentity(seed),
    text: POST_TEXTS[seed % POST_TEXTS.length]!,
    timeLabel: `${(seed % 8) + 1}小时前`,
    likers: createIdentities((seed % 8) + 2, seed),
    comments: createComments(seed % 4, seed),
  }
}

export function avatarGradient(seed: number) {
  const pair = AVATAR_COLORS[seed % AVATAR_COLORS.length]!
  return `linear-gradient(145deg, ${pair[0]}, ${pair[1]})`
}
