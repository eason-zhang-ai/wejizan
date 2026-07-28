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
    case 'alarm':
      return <View className='status-icon status-icon--alarm'><View className='alarm-bell alarm-bell--left' /><View className='alarm-bell alarm-bell--right' /><View className='alarm-face'><View className='alarm-hand alarm-hand--short' /><View className='alarm-hand alarm-hand--long' /></View><View className='alarm-leg alarm-leg--left' /><View className='alarm-leg alarm-leg--right' /></View>
    case 'bluetooth':
      return <View className='status-icon status-icon--bluetooth'><View className='bluetooth-line bluetooth-line--stem' /><View className='bluetooth-line bluetooth-line--top-left' /><View className='bluetooth-line bluetooth-line--top-right' /><View className='bluetooth-line bluetooth-line--bottom-left' /><View className='bluetooth-line bluetooth-line--bottom-right' /></View>
    case 'location':
      return <View className='status-icon status-icon--location'><View className='location-pin'><View className='location-pin-dot' /></View></View>
    case 'silent':
      return <View className='status-icon status-icon--silent'><View className='silent-bell' /><View className='silent-clapper' /><View className='silent-slash' /></View>
    case 'hotspot':
      return <View className='status-icon status-icon--hotspot'><View className='hotspot-ring hotspot-ring--outer' /><View className='hotspot-ring hotspot-ring--inner' /><View className='hotspot-dot' /></View>
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
