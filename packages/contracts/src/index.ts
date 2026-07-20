import { z } from 'zod'

export const deviceKindSchema = z.enum(['ios', 'android'])
export type DeviceKind = z.infer<typeof deviceKindSchema>

export const projectModeSchema = z.enum(['generated', 'overlay'])
export type ProjectMode = z.infer<typeof projectModeSchema>

export const identitySchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  avatarSeed: z.number().int().nonnegative(),
  avatarSrc: z.string().optional(),
})
export type Identity = z.infer<typeof identitySchema>

export const localImageSchema = z.object({
  id: z.string(),
  src: z.string(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  cropX: z.number().min(0).max(1).default(0.5),
  cropY: z.number().min(0).max(1).default(0.5),
  scale: z.number().min(1).max(4).default(1),
  gradientSeed: z.number().int().nonnegative().optional(),
})
export type LocalImage = z.infer<typeof localImageSchema>

export const commentSchema = z.object({
  id: z.string(),
  author: identitySchema,
  text: z.string().min(1).max(160),
})
export type MomentComment = z.infer<typeof commentSchema>

export const momentPostSchema = z.object({
  id: z.string(),
  author: identitySchema,
  text: z.string().max(2000),
  images: z.array(localImageSchema).max(9),
  timeLabel: z.string().max(24),
  location: z.string().max(40).optional(),
  likers: z.array(identitySchema).max(100),
  comments: z.array(commentSchema).max(8),
  isTarget: z.boolean().default(false),
  hidden: z.boolean().default(false),
})
export type MomentPost = z.infer<typeof momentPostSchema>

export const statusComponentTypeSchema = z.enum([
  'time',
  'carrier',
  'signal',
  'network',
  'wifi',
  'battery',
  'alarm',
  'bluetooth',
  'location',
  'silent',
  'hotspot',
])
export type StatusComponentType = z.infer<typeof statusComponentTypeSchema>

export const statusBarComponentSchema = z.object({
  id: z.string(),
  type: statusComponentTypeSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().min(0.6).max(1.8).default(1),
  value: z.string().default(''),
  visible: z.boolean().default(true),
})
export type StatusBarComponent = z.infer<typeof statusBarComponentSchema>

export const statusBarSchemeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(30),
  platform: deviceKindSchema,
  foreground: z.enum(['dark', 'light']).default('dark'),
  background: z.string().default('transparent'),
  custom: z.boolean().default(false),
  components: z.array(statusBarComponentSchema),
})
export type StatusBarScheme = z.infer<typeof statusBarSchemeSchema>

export const overlaySchema = z.object({
  sourceImage: localImageSchema.optional(),
  x: z.number().default(8),
  y: z.number().default(58),
  width: z.number().min(30).max(100).default(84),
  replaceStatusBar: z.boolean().default(false),
})
export type ScreenshotOverlay = z.infer<typeof overlaySchema>

export const editorProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string().min(1).max(60),
  mode: projectModeSchema,
  device: deviceKindSchema,
  owner: identitySchema,
  cover: localImageSchema.optional(),
  posts: z.array(momentPostSchema).min(1).max(12),
  targetPostId: z.string(),
  scrollTop: z.number().nonnegative().default(0),
  statusBar: statusBarSchemeSchema,
  watermarkEnabled: z.boolean().default(true),
  overlay: overlaySchema.optional(),
  updatedAt: z.string(),
})
export type EditorProject = z.infer<typeof editorProjectSchema>

export const polishRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  tone: z.enum(['natural', 'promotional', 'concise']).default('natural'),
})
export type PolishRequest = z.infer<typeof polishRequestSchema>

export const polishResponseSchema = z.object({
  variants: z.array(z.object({ tone: z.string(), text: z.string() })).length(3),
})
export type PolishResponse = z.infer<typeof polishResponseSchema>

export const commentsRequestSchema = z.object({
  copy: z.string().min(1).max(2000),
  count: z.number().int().min(1).max(8),
  imageDataUrl: z.string().max(2_800_000).optional(),
})
export type CommentsRequest = z.infer<typeof commentsRequestSchema>

export const commentsResponseSchema = z.object({
  comments: z.array(z.object({ text: z.string().min(1).max(160) })).min(1).max(8),
})
export type CommentsResponse = z.infer<typeof commentsResponseSchema>
