import { Button, Input, Picker, Slider, Switch, Text, View } from '@tarojs/components'
import type { StatusBarComponent, StatusBarScheme, StatusComponentType } from '@wejizan/contracts'
import { createId } from '@wejizan/editor-core'
import { useRef, useState } from 'react'
import { StatusBar } from './StatusBar'

const componentOptions: Array<{ type: StatusComponentType; label: string }> = [
  { type: 'time', label: '时间' },
  { type: 'carrier', label: '运营商文字' },
  { type: 'signal', label: '信号强度' },
  { type: 'network', label: '网络类型（4G/5G）' },
  { type: 'wifi', label: 'Wi‑Fi' },
  { type: 'battery', label: '电池电量' },
  { type: 'alarm', label: '闹钟' },
  { type: 'bluetooth', label: '蓝牙' },
  { type: 'location', label: '定位服务' },
  { type: 'silent', label: '静音' },
  { type: 'hotspot', label: '个人热点' },
]

const componentGroups = [
  { label: '基础信息', types: ['time', 'carrier'] as StatusComponentType[] },
  { label: '连接状态', types: ['signal', 'network', 'wifi', 'hotspot'] as StatusComponentType[] },
  { label: '设备状态', types: ['battery', 'alarm', 'bluetooth', 'location', 'silent'] as StatusComponentType[] },
]

function defaultValueFor(type: StatusComponentType) {
  if (type === 'time') return '9:41'
  if (type === 'network') return '5G'
  if (type === 'battery') return '86'
  return ''
}

interface DragState {
  id: string
  startX: number
  startY: number
  originX: number
  originY: number
}

interface StatusBarEditorProps {
  scheme: StatusBarScheme
  onChange: (scheme: StatusBarScheme) => void
}

function pointFromEvent(event: any) {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0]
  return { x: touch?.clientX ?? event.clientX ?? 0, y: touch?.clientY ?? event.clientY ?? 0 }
}

export function StatusBarEditor({ scheme, onChange }: StatusBarEditorProps) {
  const [selectedId, setSelectedId] = useState(scheme.components[0]?.id ?? '')
  const dragRef = useRef<DragState | null>(null)
  const selected = scheme.components.find((item) => item.id === selectedId)

  const updateComponent = (id: string, patch: Partial<StatusBarComponent>) => {
    onChange({
      ...scheme,
      custom: true,
      id: scheme.custom ? scheme.id : createId('scheme'),
      name: scheme.custom ? scheme.name : `${scheme.name}副本`,
      components: scheme.components.map((item) => item.id === id ? { ...item, ...patch } : item),
    })
  }

  const startDrag = (component: StatusBarComponent, event: any) => {
    event.stopPropagation?.()
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    const point = pointFromEvent(event)
    dragRef.current = { id: component.id, startX: point.x, startY: point.y, originX: component.x, originY: component.y }
    setSelectedId(component.id)
  }

  const moveDrag = (event: any) => {
    const drag = dragRef.current
    if (!drag) return
    const point = pointFromEvent(event)
    const width = typeof document !== 'undefined'
      ? document.getElementById('status-editor-canvas')?.getBoundingClientRect().width ?? 340
      : 340
    const height = typeof document !== 'undefined'
      ? document.getElementById('status-editor-canvas')?.getBoundingClientRect().height ?? 54
      : 54
    const rawX = drag.originX + ((point.x - drag.startX) / width) * 100
    const rawY = drag.originY + ((point.y - drag.startY) / height) * 100
    updateComponent(drag.id, {
      x: Math.max(2, Math.min(98, Math.round(rawX / 2) * 2)),
      y: Math.max(12, Math.min(88, Math.round(rawY / 4) * 4)),
    })
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const addComponent = (type: StatusComponentType) => {
    const item: StatusBarComponent = {
      id: createId('status'),
      type,
      x: 50,
      y: 52,
      scale: 1,
      value: defaultValueFor(type),
      visible: true,
    }
    onChange({ ...scheme, custom: true, id: scheme.custom ? scheme.id : createId('scheme'), name: scheme.custom ? scheme.name : `${scheme.name}副本`, components: [...scheme.components, item] })
    setSelectedId(item.id)
  }

  const updateSelectedScale = (value: number) => {
    if (!selected || !Number.isFinite(value)) return
    updateComponent(selected.id, { scale: Math.max(0.6, Math.min(1.8, value / 100)) })
  }

  return (
    <View className='status-editor'>
      <View className='panel-heading-row'>
        <View><Text className='panel-eyebrow'>布局</Text><Text className='panel-title'>状态栏编辑器</Text></View>
        <Text className='panel-hint'>拖动图标，2% 网格吸附</Text>
      </View>
      <View
        id='status-editor-canvas'
        className='status-editor-canvas'
        {...({ onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag } as any)}
        onTouchMove={moveDrag}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
      >
        <StatusBar scheme={scheme} />
        {scheme.components.filter((item) => item.visible).map((component) => (
          <View
            key={component.id}
            className={`status-drag-target ${selectedId === component.id ? 'status-drag-target--selected' : ''}`}
            style={{ left: `${component.x}%`, top: `${component.y}%`, transform: `translate(-50%, -50%) scale(${component.scale})` }}
            {...({ onPointerDown: (event: any) => startDrag(component, event) } as any)}
            onTouchStart={(event) => startDrag(component, event)}
          />
        ))}
      </View>

      <View className='status-component-palette'>
        {componentGroups.map((group) => (
          <View key={group.label} className='status-component-group'>
            <Text className='status-component-group-label'>{group.label}</Text>
            <View className='status-component-group-buttons'>
              {group.types.map((type) => {
                const option = componentOptions.find((item) => item.type === type)!
                return <Button key={option.type} size='mini' className='chip-button status-component-add touch-feedback' onClick={() => addComponent(option.type)}>+ {option.label}</Button>
              })}
            </View>
          </View>
        ))}
      </View>

      {selected && (
        <View className='status-inspector'>
          <View className='field-row'>
            <Text className='field-label'>组件</Text>
            <Picker
              mode='selector'
              range={componentOptions.map((item) => item.label)}
              value={Math.max(0, componentOptions.findIndex((item) => item.type === selected.type))}
              onChange={(event) => {
                const type = componentOptions[Number(event.detail.value)]?.type ?? selected.type
                updateComponent(selected.id, { type, value: selected.value || defaultValueFor(type) })
              }}
            >
              <View className='picker-field'>{componentOptions.find((item) => item.type === selected.type)?.label}</View>
            </Picker>
          </View>
          {['time', 'carrier', 'network', 'battery'].includes(selected.type) && (
            <View className='field-row'>
              <Text className='field-label'>显示值</Text>
              <Input className='text-field text-field--compact' value={selected.value} onInput={(event) => updateComponent(selected.id, { value: event.detail.value })} />
            </View>
          )}
          <View className='field-block'>
            <View className='field-row'><Text className='field-label'>缩放</Text><Text className='field-value'>{selected.scale.toFixed(1)}×</Text></View>
            <View className='scale-control'>
              <Button size='mini' className='scale-stepper' disabled={selected.scale <= 0.6} onClick={() => updateSelectedScale(Math.round(selected.scale * 100) - 5)}>−</Button>
              <Slider min={60} max={180} step={5} value={Math.round(selected.scale * 100)} activeColor='#1f8f5f' onChanging={(event) => updateSelectedScale(Number(event.detail.value))} onChange={(event) => updateSelectedScale(Number(event.detail.value))} />
              <Button size='mini' className='scale-stepper' disabled={selected.scale >= 1.8} onClick={() => updateSelectedScale(Math.round(selected.scale * 100) + 5)}>+</Button>
            </View>
          </View>
          <View className='field-row'>
            <Text className='field-label'>显示</Text>
            <Switch checked={selected.visible} color='#1f8f5f' onChange={(event) => updateComponent(selected.id, { visible: event.detail.value })} />
          </View>
          <Button className='danger-link' size='mini' onClick={() => {
            onChange({ ...scheme, custom: true, components: scheme.components.filter((item) => item.id !== selected.id) })
            setSelectedId('')
          }}>移除组件</Button>
        </View>
      )}
    </View>
  )
}
