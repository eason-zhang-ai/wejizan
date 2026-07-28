import { Button, Canvas, Input, ScrollView, Slider, Switch, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { EditorProject, MomentPost } from '@wejizan/contracts'
import {
  createComments,
  createIdentity,
  createProject,
  createStatusBar,
  replaceCommentCount,
  replaceLikeCount,
  rerollPost,
} from '@wejizan/editor-core'
import { useEffect, useMemo, useState } from 'react'
import { CaptureSurface, PhoneSimulator } from '../../components/PhoneSimulator'
import { StatusBarEditor } from '../../components/StatusBarEditor'
import { generateComments, polishCopy, testAiConfig } from '../../utils/api'
import { captureCurrentViewport } from '../../utils/capture'
import { chooseImages } from '../../utils/media'
import {
  activateAiConfig,
  deleteAiConfig,
  getActiveAiConfig,
  loadAiConfigs,
  loadProject,
  saveAiConfig,
  saveProject,
  type AiConfig,
  type AiConfigDraft,
} from '../../utils/storage'
import './index.scss'

type InspectorTab = 'content' | 'feed' | 'status' | 'ai'

const emptyAiConfig: AiConfigDraft = { name: '', baseUrl: '', apiKey: '', model: '' }

export default function EditorPage() {
  const initialProject = useMemo(() => createProject(), [])
  const [project, setProjectState] = useState<EditorProject>(initialProject)
  const [selectedPostId, setSelectedPostId] = useState(initialProject.targetPostId)
  const [openMenuId, setOpenMenuId] = useState('')
  const [scrollIntoView, setScrollIntoView] = useState('')
  const [activeTab, setActiveTab] = useState<InspectorTab>('content')
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>(() => loadAiConfigs())
  const [aiConfigDraft, setAiConfigDraft] = useState<AiConfigDraft>(emptyAiConfig)
  const [editingAiConfigId, setEditingAiConfigId] = useState<string | undefined>()
  const [aiConfigFormOpen, setAiConfigFormOpen] = useState(false)
  const [aiTestBusy, setAiTestBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [polishVariants, setPolishVariants] = useState<Array<{ tone: string; text: string }>>([])
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')

  useEffect(() => {
    loadProject().then((saved) => {
      if (!saved) return
      setProjectState(saved)
      setSelectedPostId(saved.targetPostId)
    })
  }, [])

  useEffect(() => {
    setSaveState('saving')
    const timer = setTimeout(() => {
      saveProject(project).then(() => setSaveState('saved'))
    }, 450)
    return () => clearTimeout(timer)
  }, [project])

  const setProject = (updater: EditorProject | ((current: EditorProject) => EditorProject)) => {
    setProjectState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...next, updatedAt: new Date().toISOString() }
    })
  }

  const selectedPost = (project.mode === 'overlay' ? project.posts.find((post) => post.id === project.targetPostId) : project.posts.find((post) => post.id === selectedPostId))
    ?? project.posts.find((post) => post.id === project.targetPostId)
    ?? project.posts[0]!

  const updatePost = (id: string, updater: Partial<MomentPost> | ((post: MomentPost) => MomentPost)) => {
    setProject((current) => ({
      ...current,
      posts: current.posts.map((post) => post.id === id
        ? typeof updater === 'function' ? updater(post) : { ...post, ...updater }
        : post),
    }))
  }

  const updateSelectedPost = (updater: Partial<MomentPost> | ((post: MomentPost) => MomentPost)) => updatePost(selectedPost.id, updater)

  const updateOverlay = (patch: Partial<NonNullable<EditorProject['overlay']>>) => {
    setProject((current) => ({
      ...current,
      overlay: {
        x: 8,
        y: 58,
        width: 84,
        replaceStatusBar: false,
        ...current.overlay,
        ...patch,
      },
    }))
  }

  const locateTarget = () => {
    setScrollIntoView(`post-${project.targetPostId}`)
    setTimeout(() => setScrollIntoView(''), 650)
  }

  const pickPostImages = async () => {
    try {
      const remaining = 9 - selectedPost.images.length
      if (remaining <= 0) return Taro.showToast({ title: '最多 9 张图片', icon: 'none' })
      const images = await chooseImages(remaining)
      updateSelectedPost({ images: [...selectedPost.images, ...images].slice(0, 9) })
    } catch (error) {
      if (!String(error).includes('cancel')) Taro.showToast({ title: '未能读取图片', icon: 'none' })
    }
  }

  const pickCover = async () => {
    try {
      const [cover] = await chooseImages(1)
      if (cover) setProject((current) => ({ ...current, cover }))
    } catch (error) {
      if (!String(error).includes('cancel')) Taro.showToast({ title: '未能读取封面', icon: 'none' })
    }
  }

  const pickOverlaySource = async () => {
    try {
      const [sourceImage] = await chooseImages(1)
      if (sourceImage) updateOverlay({ sourceImage })
    } catch (error) {
      if (!String(error).includes('cancel')) Taro.showToast({ title: '未能读取朋友圈截图', icon: 'none' })
    }
  }

  const pickAuthorAvatar = async () => {
    try {
      const [avatar] = await chooseImages(1)
      if (avatar) updateSelectedPost({ author: { ...selectedPost.author, avatarSrc: avatar.src } })
    } catch (error) {
      if (!String(error).includes('cancel')) Taro.showToast({ title: '未能读取头像', icon: 'none' })
    }
  }

  const pickOwnerAvatar = async () => {
    try {
      const [avatar] = await chooseImages(1)
      if (avatar) setProject((current) => ({ ...current, owner: { ...current.owner, avatarSrc: avatar.src } }))
    } catch (error) {
      if (!String(error).includes('cancel')) Taro.showToast({ title: '未能读取头像', icon: 'none' })
    }
  }

  const updateLikerNames = (value: string) => {
    const names = value.split(/[，,、\n]+/).map((name) => name.trim()).filter(Boolean).slice(0, 100)
    updateSelectedPost((post) => ({
      ...post,
      likers: names.map((nickname, index) => ({
        ...(post.likers[index] ?? createIdentity(post.author.avatarSeed + index + 1)),
        nickname: nickname.slice(0, 24),
      })),
    }))
  }

  const updateComment = (commentId: string, patch: { nickname?: string; text?: string }) => {
    updateSelectedPost((post) => ({
      ...post,
      comments: post.comments.map((comment) => comment.id === commentId
        ? {
          ...comment,
          text: patch.text ?? comment.text,
          author: patch.nickname === undefined ? comment.author : { ...comment.author, nickname: patch.nickname },
        }
        : comment),
    }))
  }

  const addComment = () => {
    if (selectedPost.comments.length >= 8) return
    const comment = createComments(1, Math.floor(Math.random() * 10_000))[0]
    if (comment) updateSelectedPost({ comments: [...selectedPost.comments, comment] })
  }

  const handleDevice = (device: 'ios' | 'android') => {
    setProject((current) => ({
      ...current,
      device,
      statusBar: current.statusBar.custom ? { ...current.statusBar, platform: device } : createStatusBar(device),
      scrollTop: 0,
    }))
  }

  const toggleLike = (postId: string) => {
    updatePost(postId, (post) => {
      const hasOwner = post.likers.some((liker) => liker.nickname === project.owner.nickname)
      return { ...post, likers: hasOwner ? post.likers.filter((liker) => liker.nickname !== project.owner.nickname) : [project.owner, ...post.likers].slice(0, 100) }
    })
    setOpenMenuId('')
  }

  const openCommentEditor = (postId: string) => {
    setSelectedPostId(postId)
    setActiveTab('content')
    setOpenMenuId('')
    Taro.showToast({ title: '已定位评论设置', icon: 'none' })
  }

  const toggleWatermark = async (enabled: boolean) => {
    if (!enabled) {
      const result = await Taro.showModal({
        title: '关闭模拟标识？',
        content: '生成图片可能被误解为真实截图。请仅用于娱乐、教学或界面原型。',
        confirmText: '仍要关闭',
        confirmColor: '#b94b42',
      })
      if (!result.confirm) return
    }
    setProject((current) => ({ ...current, watermarkEnabled: enabled }))
  }

  const activeAiConfig = aiConfigs.find((config) => config.active) ?? aiConfigs[0]

  const refreshAiConfigs = () => setAiConfigs(loadAiConfigs())

  const startAiConfig = (config?: AiConfig) => {
    setEditingAiConfigId(config?.id)
    setAiConfigDraft(config
      ? { id: config.id, name: config.name, baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model }
      : emptyAiConfig)
    setAiConfigFormOpen(true)
  }

  const saveCurrentAiConfig = () => {
    if (!aiConfigDraft.name.trim() || !aiConfigDraft.baseUrl.trim() || !aiConfigDraft.apiKey.trim() || !aiConfigDraft.model.trim()) {
      Taro.showToast({ title: '请完整填写 AI 配置', icon: 'none' })
      return
    }
    try {
      saveAiConfig({ ...aiConfigDraft, id: editingAiConfigId })
      refreshAiConfigs()
      setAiConfigFormOpen(false)
      Taro.showToast({ title: '已保存到本机', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
    }
  }

  const testCurrentAiConfig = async () => {
    if (!aiConfigDraft.baseUrl.trim() || !aiConfigDraft.apiKey.trim()) return Taro.showToast({ title: '请先填写 API 地址和密钥', icon: 'none' })
    setAiTestBusy(true)
    try {
      await testAiConfig({
        id: editingAiConfigId ?? 'unsaved',
        name: aiConfigDraft.name || '未命名配置',
        baseUrl: aiConfigDraft.baseUrl,
        apiKey: aiConfigDraft.apiKey,
        model: aiConfigDraft.model || 'unknown',
        active: false,
        createdAt: '',
        updatedAt: '',
      })
      Taro.showToast({ title: '连接成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '连接失败', icon: 'none' })
    } finally {
      setAiTestBusy(false)
    }
  }

  const requireAiConfig = () => {
    const config = getActiveAiConfig()
    if (config) return config
    setAiConfigFormOpen(true)
    throw new Error('请先添加本机 AI 配置')
  }

  const handlePolish = async () => {
    setAiBusy(true)
    try {
      const result = await polishCopy(selectedPost.text, requireAiConfig())
      setPolishVariants(result.variants)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '润色失败', icon: 'none' })
    } finally {
      setAiBusy(false)
    }
  }

  const handleAiComments = async () => {
    setAiBusy(true)
    try {
      const count = Math.max(1, selectedPost.comments.length || 3)
      const result = await generateComments(selectedPost.text, count, requireAiConfig())
      const identities = createComments(result.comments.length, Math.floor(Math.random() * 1000))
      updateSelectedPost({ comments: identities.map((comment, index) => ({ ...comment, text: result.comments[index]?.text ?? comment.text })) })
      setActiveTab('content')
      Taro.showToast({ title: '评论已生成', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '生成失败', icon: 'none' })
    } finally {
      setAiBusy(false)
    }
  }

  const handleCapture = async () => {
    try {
      await captureCurrentViewport(project)
      Taro.showToast({ title: Taro.getEnv() === Taro.ENV_TYPE.WEB ? '截图已下载' : '已保存到相册', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '截图失败', icon: 'none' })
    }
  }

  const movePost = (postId: string, direction: -1 | 1) => {
    setProject((current) => {
      const index = current.posts.findIndex((post) => post.id === postId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.posts.length) return current
      const posts = [...current.posts]
      const [item] = posts.splice(index, 1)
      if (item) posts.splice(target, 0, item)
      return { ...current, posts }
    })
  }

  return (
    <View className='editor-app'>
      <View className='app-topbar'>
        <View className='brand-lockup'>
          <View className='brand-mark'><Text>伪</Text></View>
          <View><Text className='brand-name'>伪集赞</Text><Text className='brand-subtitle'>朋友圈截图创作台</Text></View>
        </View>
        <View className='topbar-center'>
          <View className='segmented-control'>
            <Button className={project.mode === 'generated' ? 'is-active' : ''} onClick={() => { setProject((current) => ({ ...current, mode: 'generated' })); setSelectedPostId(project.targetPostId); setActiveTab('content') }}>生成模式</Button>
            <Button className={project.mode === 'overlay' ? 'is-active' : ''} onClick={() => { setProject((current) => ({ ...current, mode: 'overlay' })); setSelectedPostId(project.targetPostId); setActiveTab('content') }}>截图叠加</Button>
          </View>
          <View className='segmented-control segmented-control--compact'>
            <Button className={project.device === 'ios' ? 'is-active' : ''} onClick={() => handleDevice('ios')}>iOS</Button>
            <Button className={project.device === 'android' ? 'is-active' : ''} onClick={() => handleDevice('android')}>Android</Button>
          </View>
        </View>
        <View className='topbar-actions'>
          <Text className={`save-state ${saveState === 'saving' ? 'is-saving' : ''}`}>{saveState === 'saved' ? '已保存到本机' : '保存中…'}</Text>
          <Button className='secondary-button touch-feedback' onClick={locateTarget}>定位主内容</Button>
          <Button className='primary-button touch-feedback' onClick={handleCapture}>截取当前屏幕</Button>
        </View>
      </View>

      <View className='editor-workspace'>
        <View className='left-panel editor-panel'>
          <View className='panel-tabs'>
            {([
              ['content', '内容'], ['feed', '信息流'], ['status', '状态栏'], ['ai', 'AI'],
            ] as Array<[InspectorTab, string]>).map(([key, label]) => (
              <Button key={key} className={activeTab === key ? 'is-active' : ''} onClick={() => setActiveTab(key)}>{label}</Button>
            ))}
          </View>

          <ScrollView scrollY className='panel-scroll'>
            {activeTab === 'content' && (
              <View className='panel-section'>
                <View className='panel-heading-row'>
                  <View><Text className='panel-eyebrow'>{project.mode === 'overlay' ? '原图增强' : selectedPost.isTarget ? '主内容' : '陪衬内容'}</Text><Text className='panel-title'>{project.mode === 'overlay' ? '截图叠加' : '朋友圈内容'}</Text></View>
                  {project.mode === 'generated' && <Button size='mini' className='chip-button' onClick={() => updateSelectedPost({ author: createIdentity(Math.floor(Math.random() * 10_000)) })}>重抽身份</Button>}
                </View>
                {project.mode === 'overlay'
                  ? (
                    <>
                      <View className={`overlay-source-card ${project.overlay?.sourceImage?.src ? 'has-image' : ''}`}>
                        {project.overlay?.sourceImage?.src && <View className='overlay-source-thumb' style={{ backgroundImage: `url(${project.overlay.sourceImage.src})` }} />}
                        <View><Text className='field-label'>{project.overlay?.sourceImage?.src ? '已载入朋友圈截图' : '先载入朋友圈截图'}</Text><Text className='field-help'>建议使用原始长截图或当前屏幕截图</Text></View>
                        <Button size='mini' className='chip-button' onClick={pickOverlaySource}>{project.overlay?.sourceImage?.src ? '更换' : '上传'}</Button>
                      </View>
                      <Text className='overlay-tip'>直接在右侧手机里拖动灰色点赞/评论块；移动会与指针 1:1 跟随并自动限制在画面内。</Text>
                      <View className='field-block'>
                        <View className='field-row'><Text className='field-label'>叠加块宽度</Text><Text className='field-value'>{project.overlay?.width ?? 84}%</Text></View>
                        <Slider min={30} max={100} value={project.overlay?.width ?? 84} activeColor='#1f8f5f' onChanging={(event) => updateOverlay({ width: event.detail.value, x: Math.min(project.overlay?.x ?? 8, 100 - event.detail.value) })} onChange={(event) => updateOverlay({ width: event.detail.value, x: Math.min(project.overlay?.x ?? 8, 100 - event.detail.value) })} />
                      </View>
                      <View className='field-row'><View><Text className='field-label'>替换原图状态栏</Text><Text className='field-help'>开启后使用“状态栏”页签中的布局</Text></View><Switch checked={project.overlay?.replaceStatusBar ?? false} color='#1f8f5f' onChange={(event) => updateOverlay({ replaceStatusBar: event.detail.value })} /></View>
                    </>
                  )
                  : (
                    <>
                      <View className='field-block'>
                        <View className='field-row'><Text className='field-label'>作者昵称与头像</Text><Button size='mini' className='chip-button' onClick={pickAuthorAvatar}>上传头像</Button></View>
                        <Input className='text-field' value={selectedPost.author.nickname} onInput={(event) => updateSelectedPost({ author: { ...selectedPost.author, nickname: event.detail.value } })} />
                      </View>
                      <View className='field-block'><Text className='field-label'>朋友圈文案</Text><Textarea className='textarea-field' maxlength={2000} value={selectedPost.text} onInput={(event) => updateSelectedPost({ text: event.detail.value })} /></View>
                      <View className='field-row'><View><Text className='field-label'>产品图片</Text><Text className='field-help'>{selectedPost.images.length}/9，可继续添加</Text></View><Button size='mini' className='chip-button' onClick={pickPostImages}>添加图片</Button></View>
                      <View className='image-strip'>
                        {selectedPost.images.map((image, index) => (
                          <View key={image.id} className='image-thumb' style={image.src ? undefined : { background: `linear-gradient(145deg, #aebfc3, #e7c5b8)` }}>
                            {image.src && <View className='thumb-photo' style={{ backgroundImage: `url(${image.src})` }} />}
                            <Button className='thumb-remove' size='mini' onClick={() => updateSelectedPost({ images: selectedPost.images.filter((item) => item.id !== image.id) })}>×</Button>
                            <Text>{index + 1}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                <View className='field-block'>
                  <View className='field-row'><Text className='field-label'>点赞人数</Text><Text className='field-value'>{selectedPost.likers.length} 人</Text></View>
                  <Slider min={0} max={100} value={selectedPost.likers.length} activeColor='#1f8f5f' onChanging={(event) => updateSelectedPost((post) => replaceLikeCount(post, event.detail.value))} onChange={(event) => updateSelectedPost((post) => replaceLikeCount(post, event.detail.value))} />
                  <Text className='field-help'>可精确指定昵称，用中文逗号、英文逗号或换行分隔</Text>
                  <Textarea className='textarea-field textarea-field--names' maxlength={2400} value={selectedPost.likers.map((liker) => liker.nickname).join('，')} onBlur={(event) => updateLikerNames(event.detail.value)} />
                </View>
                <View className='field-block'>
                  <View className='field-row'><Text className='field-label'>评论内容</Text><View className='inline-actions'><Text className='field-value'>{selectedPost.comments.length}/8 条</Text><Button size='mini' className='chip-button' disabled={selectedPost.comments.length >= 8} onClick={addComment}>+ 添加</Button></View></View>
                  <Slider min={0} max={8} value={selectedPost.comments.length} activeColor='#1f8f5f' onChange={(event) => updateSelectedPost((post) => replaceCommentCount(post, event.detail.value))} />
                  <View className='comment-editor-list'>
                    {selectedPost.comments.map((comment) => (
                      <View className='comment-editor-row' key={comment.id}>
                        <Input className='text-field comment-name-field' value={comment.author.nickname} maxlength={24} onInput={(event) => updateComment(comment.id, { nickname: event.detail.value })} />
                        <Input className='text-field comment-copy-field' value={comment.text} maxlength={160} onInput={(event) => updateComment(comment.id, { text: event.detail.value })} />
                        <Button size='mini' className='comment-remove' onClick={() => updateSelectedPost({ comments: selectedPost.comments.filter((item) => item.id !== comment.id) })}>×</Button>
                      </View>
                    ))}
                  </View>
                </View>
                <View className='field-row'><Text className='field-label'>水印标识</Text><Switch checked={project.watermarkEnabled} color='#1f8f5f' onChange={(event) => toggleWatermark(event.detail.value)} /></View>
              </View>
            )}

            {activeTab === 'feed' && (
              <View className='panel-section'>
                <View className='panel-heading-row'><View><Text className='panel-eyebrow'>排序</Text><Text className='panel-title'>朋友圈信息流</Text></View><Button size='mini' className='chip-button' onClick={pickCover}>更换封面</Button></View>
                <Text className='section-description'>选择任意一条进行编辑；上下按钮控制它在截图中的位置。</Text>
                <View className='owner-editor-card'>
                  <View><Text className='field-label'>朋友圈主人</Text><Text className='field-help'>显示在封面右下角</Text></View>
                  <Input className='text-field' value={project.owner.nickname} maxlength={24} onInput={(event) => setProject((current) => ({ ...current, owner: { ...current.owner, nickname: event.detail.value } }))} />
                  <Button size='mini' className='chip-button' onClick={pickOwnerAvatar}>头像</Button>
                </View>
                <View className='feed-item-list'>
                  {project.posts.map((post, index) => (
                    <View key={post.id} className={`feed-list-item ${selectedPostId === post.id ? 'is-selected' : ''}`} onClick={() => { setSelectedPostId(post.id); setActiveTab('content') }}>
                      <View className='feed-list-index'>{index + 1}</View>
                      <View className='feed-list-copy'><Text>{post.author.nickname}</Text><Text>{post.isTarget ? '主集赞内容' : post.text.slice(0, 18)}</Text></View>
                      <View className='feed-list-actions'>
                        {!post.isTarget && <Button size='mini' onClick={(event) => { event.stopPropagation(); updatePost(post.id, rerollPost(post)) }}>↻</Button>}
                        <Button size='mini' disabled={index === 0} onClick={(event) => { event.stopPropagation(); movePost(post.id, -1) }}>↑</Button>
                        <Button size='mini' disabled={index === project.posts.length - 1} onClick={(event) => { event.stopPropagation(); movePost(post.id, 1) }}>↓</Button>
                        {!post.isTarget && <Switch checked={!post.hidden} color='#1f8f5f' onChange={(event) => updatePost(post.id, { hidden: !event.detail.value })} />}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'status' && <View className='panel-section'><StatusBarEditor scheme={project.statusBar} onChange={(statusBar) => setProject((current) => ({ ...current, statusBar }))} /></View>}

            {activeTab === 'ai' && (
              <View className='panel-section'>
                <View className='panel-heading-row'><View><Text className='panel-eyebrow'>本机直连</Text><Text className='panel-title'>AI 文案助手</Text></View><Button size='mini' className='chip-button' onClick={() => startAiConfig(activeAiConfig)}>管理配置</Button></View>
                <Text className='section-description'>密钥仅保存在当前设备；文案会直接发送给你选择的 AI 服务，不经过本项目服务器。</Text>
                {activeAiConfig
                  ? <View className='ai-config-summary'><View><Text className='field-label'>{activeAiConfig.name}</Text><Text className='field-help'>{activeAiConfig.baseUrl} · {activeAiConfig.model}</Text></View><Text className='ai-config-status'>当前使用</Text></View>
                  : <View className='ai-config-empty'><Text>尚未配置 AI 服务</Text><Button size='mini' className='chip-button' onClick={() => startAiConfig()}>添加配置</Button></View>}
                {aiConfigFormOpen && (
                  <View className='ai-config-editor'>
                    <View className='panel-heading-row'><Text className='field-label'>{editingAiConfigId ? '编辑本机配置' : '添加本机配置'}</Text><Button size='mini' className='chip-button' onClick={() => setAiConfigFormOpen(false)}>收起</Button></View>
                    <View className='field-block'><Text className='field-label'>配置名称</Text><Input className='text-field' value={aiConfigDraft.name} onInput={(event) => setAiConfigDraft((current) => ({ ...current, name: event.detail.value }))} placeholder='例如：我的 OpenAI' /></View>
                    <View className='field-block'><Text className='field-label'>OpenAI 兼容 API 地址</Text><Input className='text-field' value={aiConfigDraft.baseUrl} onInput={(event) => setAiConfigDraft((current) => ({ ...current, baseUrl: event.detail.value }))} placeholder='https://api.openai.com/v1' /></View>
                    <View className='field-block'><Text className='field-label'>API Key</Text><Input password className='text-field' value={aiConfigDraft.apiKey} onInput={(event) => setAiConfigDraft((current) => ({ ...current, apiKey: event.detail.value }))} placeholder='仅保存在此设备' /></View>
                    <View className='field-block'><Text className='field-label'>模型名称</Text><Input className='text-field' value={aiConfigDraft.model} onInput={(event) => setAiConfigDraft((current) => ({ ...current, model: event.detail.value }))} placeholder='例如：gpt-4.1-mini' /></View>
                    <Text className='field-help'>H5 服务须允许浏览器跨域请求；微信小程序还需在开发者后台配置请求合法域名。</Text>
                    <View className='ai-config-buttons'><Button size='mini' className='secondary-button' loading={aiTestBusy} onClick={testCurrentAiConfig}>测试连接</Button><Button size='mini' className='primary-button' onClick={saveCurrentAiConfig}>保存配置</Button></View>
                    {editingAiConfigId && <Button size='mini' className='danger-link' onClick={async () => { const result = await Taro.showModal({ title: '删除 AI 配置？', content: '该操作只会删除本机保存的配置。' }); if (result.confirm) { deleteAiConfig(editingAiConfigId); refreshAiConfigs(); setAiConfigFormOpen(false) } }}>删除此配置</Button>}
                  </View>
                )}
                {aiConfigs.length > 1 && <View className='ai-config-list'>{aiConfigs.map((config) => <View key={config.id} className='ai-config-list-item'><View><Text className='field-label'>{config.name}</Text><Text className='field-help'>{config.model}</Text></View><View className='ai-config-item-actions'>{!config.active && <Button size='mini' className='chip-button' onClick={() => { activateAiConfig(config.id); refreshAiConfigs() }}>使用</Button>}<Button size='mini' className='chip-button' onClick={() => startAiConfig(config)}>编辑</Button><Button size='mini' className='danger-link' onClick={async () => { const result = await Taro.showModal({ title: '删除 AI 配置？', content: '该操作只会删除本机保存的配置。' }); if (result.confirm) { deleteAiConfig(config.id); refreshAiConfigs() } }}>删除</Button></View></View>)}</View>}
                <Button className='primary-button primary-button--wide touch-feedback' loading={aiBusy} disabled={aiBusy || !selectedPost.text} onClick={handlePolish}>润色当前文案</Button>
                <Button className='secondary-button secondary-button--wide touch-feedback' loading={aiBusy} disabled={aiBusy || !selectedPost.text} onClick={handleAiComments}>根据内容生成评论</Button>
                {polishVariants.length > 0 && (
                  <View className='ai-variants'>
                    {polishVariants.map((variant) => (
                      <View key={variant.tone} className='ai-variant-card'>
                        <Text className='ai-tone'>{variant.tone}</Text><Text>{variant.text}</Text>
                        <Button size='mini' className='chip-button' onClick={() => { updateSelectedPost({ text: variant.text }); setPolishVariants([]); setActiveTab('content') }}>采用此版本</Button>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        <View className='preview-stage'>
          <View className='preview-label'><Text>实时手机预览</Text><Text>{project.device === 'ios' ? '393 × 852' : '360 × 800'} · {project.mode === 'overlay' ? `叠加位置 ${project.overlay?.x ?? 8}%, ${project.overlay?.y ?? 58}%` : `当前滚动 ${Math.round(project.scrollTop)}px`}</Text></View>
          <PhoneSimulator
            project={project}
            scrollTop={project.scrollTop}
            scrollIntoView={scrollIntoView}
            onScroll={(scrollTop) => setProjectState((current) => ({ ...current, scrollTop }))}
            selectedPostId={selectedPostId}
            openMenuId={openMenuId}
            onSelectPost={setSelectedPostId}
            onToggleMenu={(id) => setOpenMenuId((current) => current === id ? '' : id)}
            onLike={toggleLike}
            onComment={openCommentEditor}
            onOverlayChange={updateOverlay}
          />
          <View className='preview-help'><Text>{project.mode === 'overlay' ? '拖动灰色互动块调整位置' : '在手机屏幕内拖动浏览'}</Text><Text>{project.mode === 'overlay' ? '导出不会包含编辑辅助框' : '截图会保留当前滚动位置'}</Text></View>
        </View>

        <View className='right-panel editor-panel'>
          <View className='panel-section compact-summary'>
            <Text className='panel-eyebrow'>当前画面</Text><Text className='panel-title'>导出检查</Text>
            <View className='summary-card'><Text>目标点赞</Text><Text>{project.posts.find((post) => post.id === project.targetPostId)?.likers.length ?? 0} 人</Text></View>
            <View className='summary-card'><Text>目标评论</Text><Text>{project.posts.find((post) => post.id === project.targetPostId)?.comments.length ?? 0} 条</Text></View>
            <View className='summary-card'><Text>{project.mode === 'overlay' ? '原始截图' : '可见朋友圈'}</Text><Text>{project.mode === 'overlay' ? (project.overlay?.sourceImage?.src ? '已载入' : '未载入') : `${project.posts.filter((post) => !post.hidden).length} 条`}</Text></View>
            <View className='summary-card'><Text>输出尺寸</Text><Text>{project.device === 'ios' ? '1179×2556' : '1080×2400'}</Text></View>
            <View className='responsibility-note'><Text>生成内容默认带模拟标识，请勿用于冒充、欺骗或虚假交易。</Text></View>
            <Button className='primary-button primary-button--wide touch-feedback' onClick={handleCapture}>截取当前屏幕</Button>
          </View>
        </View>
      </View>

      <View className='capture-host'><CaptureSurface project={project} openMenuId={openMenuId} /></View>
      <Canvas className='capture-canvas' canvasId='capture-canvas' id='capture-canvas' />
    </View>
  )
}
