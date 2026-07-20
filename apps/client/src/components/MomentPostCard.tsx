import { Image, Text, View } from '@tarojs/components'
import type { MomentPost } from '@wejizan/contracts'
import { avatarGradient } from '@wejizan/editor-core'
import { Avatar } from './Avatar'

interface PostCardProps {
  post: MomentPost
  selected?: boolean
  menuOpen?: boolean
  capture?: boolean
  onSelect?: (id: string) => void
  onToggleMenu?: (id: string) => void
  onLike?: (id: string) => void
  onComment?: (id: string) => void
}

export function EngagementPanel({ post }: { post: MomentPost }) {
  if (post.likers.length === 0 && post.comments.length === 0) return null
  return (
    <View className='engagement-box'>
      {post.likers.length > 0 && (
        <View className='likes-row'>
          <Text className='heart-icon'>♡</Text>
          <Text className='likes-copy'>{post.likers.map((liker) => liker.nickname).join('，')}</Text>
        </View>
      )}
      {post.comments.length > 0 && (
        <View className='comments-list'>
          {post.comments.map((comment) => (
            <View className='comment-row' key={comment.id}>
              <Text><Text className='comment-author'>{comment.author.nickname}</Text>：{comment.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function Picture({ src, seed = 0, index }: { src: string; seed?: number; index: number }) {
  if (src) return <Image className='moment-image' src={src} mode='aspectFill' />
  const colors = [
    ['#e9c7b9', '#879f9b'], ['#aebbc9', '#ead9b7'], ['#c8b8d6', '#8497b8'],
    ['#b4c99a', '#f0d7b0'], ['#d3a9a0', '#6e8199'], ['#a7c8c3', '#e8c3c8'],
  ]
  const pair = colors[(seed + index) % colors.length]!
  return (
    <View className='moment-image moment-image--placeholder' style={{ background: `linear-gradient(145deg, ${pair[0]}, ${pair[1]})` }}>
      <View className='placeholder-orb' />
      <Text>{index % 2 === 0 ? '日常' : '记录'}</Text>
    </View>
  )
}

export function MomentPostCard({
  post,
  selected = false,
  menuOpen = false,
  capture = false,
  onSelect,
  onToggleMenu,
  onLike,
  onComment,
}: PostCardProps) {
  const stop = (event: { stopPropagation?: () => void }) => event.stopPropagation?.()
  return (
    <View
      id={`post-${post.id}`}
      className={`moment-card ${selected && !capture ? 'moment-card--selected' : ''}`}
      onClick={() => onSelect?.(post.id)}
    >
      <Avatar identity={post.author} size='medium' className='moment-avatar' />
      <View className='moment-body'>
        <Text className='moment-author'>{post.author.nickname}</Text>
        <Text className='moment-copy'>{post.text}</Text>
        {post.images.length > 0 && (
          <View className={`moment-grid moment-grid--${Math.min(post.images.length, 9)}`}>
            {post.images.map((image, index) => (
              <Picture key={image.id} src={image.src} seed={image.gradientSeed} index={index} />
            ))}
          </View>
        )}
        {post.location && <Text className='moment-location'>{post.location}</Text>}
        <View className='moment-meta'>
          <Text>{post.timeLabel}</Text>
          <View className='moment-actions-anchor'>
            <View
              className='moment-more touch-feedback'
              onClick={(event) => {
                stop(event)
                onToggleMenu?.(post.id)
              }}
            >
              <Text>••</Text>
            </View>
            <View className={`wechat-action-menu ${menuOpen ? 'wechat-action-menu--open' : ''}`} onClick={stop}>
              <View className='wechat-action-item touch-feedback' onClick={() => onLike?.(post.id)}>
                <Text>♡</Text><Text>赞</Text>
              </View>
              <View className='wechat-action-item touch-feedback' onClick={() => onComment?.(post.id)}>
                <Text>◌</Text><Text>评论</Text>
              </View>
            </View>
          </View>
        </View>
        <EngagementPanel post={post} />
      </View>
    </View>
  )
}
