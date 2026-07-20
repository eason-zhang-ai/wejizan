import { Image, Text, View } from '@tarojs/components'
import type { Identity } from '@wejizan/contracts'
import { avatarGradient } from '@wejizan/editor-core'

interface AvatarProps {
  identity: Identity
  size?: 'tiny' | 'small' | 'medium' | 'large'
  className?: string
}

export function Avatar({ identity, size = 'medium', className = '' }: AvatarProps) {
  return (
    <View
      className={`avatar avatar--${size} ${className}`}
      style={{ background: avatarGradient(identity.avatarSeed) }}
      aria-label={`${identity.nickname}的头像`}
    >
      {identity.avatarSrc
        ? <Image className='avatar-photo' src={identity.avatarSrc} mode='aspectFill' />
        : <Text>{identity.nickname.slice(-1)}</Text>}
    </View>
  )
}
