import { Text, View } from '@tarojs/components'
import type { StatusBarComponent, StatusBarScheme } from '@wejizan/contracts'

function StatusGlyph({ component }: { component: StatusBarComponent }) {
  switch (component.type) {
    case 'time':
    case 'carrier':
    case 'network':
      return <Text className='status-text'>{component.value || (component.type === 'network' ? '5G' : '')}</Text>
    case 'signal':
      return (
        <View className='signal-bars'>
          <View /><View /><View /><View />
        </View>
      )
    case 'wifi':
      return <View className='wifi-icon'><View /><View /><View /></View>
    case 'battery':
      return (
        <View className='battery-icon'>
          <View className='battery-fill' style={{ width: `${Math.max(8, Math.min(100, Number(component.value) || 86))}%` }} />
        </View>
      )
    case 'alarm': return <Text className='status-symbol'>◷</Text>
    case 'bluetooth': return <Text className='status-symbol'>ᛒ</Text>
    case 'location': return <Text className='status-symbol'>◆</Text>
    case 'silent': return <Text className='status-symbol'>⌁</Text>
    case 'hotspot': return <Text className='status-symbol'>∞</Text>
    default: return null
  }
}

interface StatusBarProps {
  scheme: StatusBarScheme
  className?: string
}

export function StatusBar({ scheme, className = '' }: StatusBarProps) {
  return (
    <View
      className={`status-bar status-bar--${scheme.foreground} ${className}`}
      style={{ background: scheme.background }}
    >
      {scheme.components.filter((item) => item.visible).map((component) => (
        <View
          key={component.id}
          className={`status-component status-component--${component.type}`}
          style={{
            left: `${component.x}%`,
            top: `${component.y}%`,
            transform: `translate(-50%, -50%) scale(${component.scale})`,
          }}
        >
          <StatusGlyph component={component} />
        </View>
      ))}
    </View>
  )
}
