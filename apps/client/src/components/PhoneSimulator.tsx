import { Image, ScrollView, Text, View } from '@tarojs/components'
import type { EditorProject } from '@wejizan/contracts'
import { useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { EngagementPanel, MomentPostCard } from './MomentPostCard'
import { StatusBar } from './StatusBar'

interface FeedProps {
  project: EditorProject
  selectedPostId?: string
  openMenuId?: string
  capture?: boolean
  onSelectPost?: (id: string) => void
  onToggleMenu?: (id: string) => void
  onLike?: (id: string) => void
  onComment?: (id: string) => void
}

export function FeedContent(props: FeedProps) {
  const { project } = props
  return (
    <View className='wechat-feed-content'>
      <View className='moments-cover'>
        {project.cover?.src
          ? <Image src={project.cover.src} className='cover-image' mode='aspectFill' />
          : <View className='cover-image cover-image--mock'><View className='cover-glow' /><Text>今天也要认真生活</Text></View>}
        <View className='owner-profile'>
          <Text className='owner-name'>{project.owner.nickname}</Text>
          <Avatar identity={project.owner} size='large' />
        </View>
      </View>
      <View className='moments-list'>
        {project.posts.filter((post) => !post.hidden).map((post) => (
          <MomentPostCard
            key={post.id}
            post={post}
            selected={props.selectedPostId === post.id}
            menuOpen={props.openMenuId === post.id}
            capture={props.capture}
            onSelect={props.onSelectPost}
            onToggleMenu={props.onToggleMenu}
            onLike={props.onLike}
            onComment={props.onComment}
          />
        ))}
      </View>
    </View>
  )
}

interface PhoneSimulatorProps extends Omit<FeedProps, 'capture'> {
  scrollTop: number
  scrollIntoView?: string
  onScroll: (scrollTop: number) => void
  onOverlayChange?: (patch: Partial<NonNullable<EditorProject['overlay']>>) => void
}

interface OverlayDragState {
  startX: number
  startY: number
  originX: number
  originY: number
}

function pointFromEvent(event: any) {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0]
  return { x: touch?.clientX ?? event.clientX ?? 0, y: touch?.clientY ?? event.clientY ?? 0 }
}

function ScreenshotOverlayView({
  project,
  capture = false,
  onChange,
}: {
  project: EditorProject
  capture?: boolean
  onChange?: (patch: Partial<NonNullable<EditorProject['overlay']>>) => void
}) {
  const overlay = project.overlay ?? { x: 8, y: 58, width: 84, replaceStatusBar: false }
  const post = project.posts.find((item) => item.id === project.targetPostId) ?? project.posts[0]!
  const dragRef = useRef<OverlayDragState | null>(null)
  const [dragging, setDragging] = useState(false)

  const startDrag = (event: any) => {
    if (capture || !onChange) return
    event.stopPropagation?.()
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    const point = pointFromEvent(event)
    dragRef.current = { startX: point.x, startY: point.y, originX: overlay.x, originY: overlay.y }
    setDragging(true)
  }

  const moveDrag = (event: any) => {
    const drag = dragRef.current
    if (!drag || !onChange) return
    const point = pointFromEvent(event)
    const bounds = typeof document !== 'undefined'
      ? document.getElementById('overlay-screen')?.getBoundingClientRect()
      : undefined
    const width = bounds?.width ?? (project.device === 'ios' ? 393 : 360)
    const height = bounds?.height ?? (project.device === 'ios' ? 852 : 800)
    const x = drag.originX + ((point.x - drag.startX) / width) * 100
    const y = drag.originY + ((point.y - drag.startY) / height) * 100
    onChange({
      x: Math.max(0, Math.min(100 - overlay.width, Math.round(x * 2) / 2)),
      y: Math.max(3, Math.min(93, Math.round(y * 2) / 2)),
    })
  }

  const endDrag = () => {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <View
      id={capture ? undefined : 'overlay-screen'}
      className={`overlay-screen ${capture ? 'overlay-screen--capture' : ''}`}
      {...(!capture ? ({ onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag } as any) : {})}
      onTouchMove={!capture ? moveDrag : undefined}
      onTouchEnd={!capture ? endDrag : undefined}
      onTouchCancel={!capture ? endDrag : undefined}
    >
      {overlay.sourceImage?.src
        ? <Image className='overlay-source-image' src={overlay.sourceImage.src} mode='aspectFill' />
        : (
          <View className='overlay-empty-state'>
            <View className='overlay-empty-icon'>▧</View>
            <Text>上传一张朋友圈截图</Text>
            <Text>点赞与评论块可直接拖到合适位置</Text>
          </View>
        )}
      <View
        className={`overlay-engagement ${!capture ? 'overlay-engagement--interactive' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, width: `${overlay.width}%` }}
        {...(!capture ? ({ onPointerDown: startDrag } as any) : {})}
        onTouchStart={!capture ? startDrag : undefined}
      >
        {!capture && <Text className='overlay-drag-label'>拖动点赞与评论</Text>}
        <EngagementPanel post={post} />
      </View>
      {overlay.replaceStatusBar && (
        <View className='overlay-status-replacement'>
          <StatusBar scheme={project.statusBar} />
        </View>
      )}
      {project.watermarkEnabled && <Text className='screen-watermark'>模拟生成 · 伪集赞</Text>}
    </View>
  )
}

export function PhoneSimulator({ project, scrollTop, scrollIntoView, onScroll, onOverlayChange, ...feedProps }: PhoneSimulatorProps) {
  const isScrolled = scrollTop > 168
  return (
    <View className={`phone-shell phone-shell--${project.device}`}>
      <View className='phone-screen'>
        {project.mode === 'overlay'
          ? <ScreenshotOverlayView project={project} onChange={onOverlayChange} />
          : (
            <>
              <ScrollView
                className='phone-scroll'
                scrollY
                scrollTop={scrollTop}
                scrollIntoView={scrollIntoView}
                scrollWithAnimation
                enhanced
                showScrollbar={false}
                onScroll={(event) => onScroll(event.detail.scrollTop)}
              >
                <FeedContent project={project} {...feedProps} />
              </ScrollView>
              <View className={`wechat-fixed-chrome ${isScrolled ? 'wechat-fixed-chrome--solid' : ''}`}>
                <StatusBar scheme={project.statusBar} />
                <View className='wechat-nav'>
                  <Text className='wechat-nav-back'>‹</Text>
                  <Text className='wechat-nav-title'>{isScrolled ? '朋友圈' : ''}</Text>
                  <Text className='wechat-nav-camera'>▣</Text>
                </View>
              </View>
              {project.watermarkEnabled && <Text className='screen-watermark'>模拟生成 · 伪集赞</Text>}
            </>
          )}
      </View>
      <View className='phone-home-indicator' />
    </View>
  )
}

export function CaptureSurface({ project, openMenuId }: { project: EditorProject; openMenuId?: string }) {
  const dimensions = project.device === 'ios' ? { width: 393, height: 852 } : { width: 360, height: 800 }
  return (
    <View
      id='capture-surface'
      className={`capture-surface capture-surface--${project.device}`}
      style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
    >
      {project.mode === 'overlay'
        ? <ScreenshotOverlayView project={project} capture />
        : (
          <>
            <View className='capture-feed-window'>
              <View className='capture-feed-offset' style={{ transform: `translateY(-${project.scrollTop}px)` }}>
                <FeedContent project={project} openMenuId={openMenuId} capture />
              </View>
            </View>
            <View className={`wechat-fixed-chrome ${project.scrollTop > 168 ? 'wechat-fixed-chrome--solid' : ''}`}>
              <StatusBar scheme={project.statusBar} />
              <View className='wechat-nav'>
                <Text className='wechat-nav-back'>‹</Text>
                <Text className='wechat-nav-title'>{project.scrollTop > 168 ? '朋友圈' : ''}</Text>
                <Text className='wechat-nav-camera'>▣</Text>
              </View>
            </View>
            {project.watermarkEnabled && <Text className='screen-watermark'>模拟生成 · 伪集赞</Text>}
          </>
        )}
    </View>
  )
}
