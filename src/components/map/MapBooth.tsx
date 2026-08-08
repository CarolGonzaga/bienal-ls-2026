import React, { memo } from 'react'
import { Heart, Bookmark, CheckCircle2 } from 'lucide-react'
import type { Exhibitor } from '../../types/index.ts'
import type { MapFeature } from '../../data/map/map-layout.ts'
import type { GraphicsQuality } from '../../stores/useMapStore.ts'

interface MapBoothProps {
  feature: MapFeature
  exhibitor?: Exhibitor
  selected: boolean
  favorite: boolean
  visited: boolean
  inRoute: boolean
  isometric: boolean
  zoom: number
  dark: boolean
  quality: GraphicsQuality
  compact: boolean
  onSelect: () => void
}

const darker = (color: string) => color === '#7c3aed' ? '#4c1d95' : color === '#6d28d9' ? '#3b0764' : color === '#e54891' ? '#9d174d' : color === '#0f766e' ? '#134e4a' : color === '#d97706' ? '#92400e' : color === '#d43276' ? '#8f174e' : color === '#b94185' ? '#742453' : color === '#e11d74' ? '#9b114c' : color === '#cf005e' ? '#85003d' : '#9ca3af'

export const MapBooth = memo<MapBoothProps>(({ feature, exhibitor, selected, favorite, visited, inRoute, isometric, zoom, dark, quality, compact, onSelect }) => {
  const sourcePoints = feature.geometry.type === 'polygon' ? feature.geometry.points : null
  const rect = feature.geometry.type === 'rect' ? feature.geometry : (() => {
    const xs = feature.geometry.points.map(point => point.x)
    const ys = feature.geometry.points.map(point => point.y)
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
  })()
  const isBooth = feature.type === 'booth'
  const isService = !isBooth
  const routeCode = typeof feature.metadata?.routeCode === 'string' ? feature.metadata.routeCode : ''
  const isDiscreetAccess = feature.type === 'gate' && (/^P[A-F]$/.test(routeCode) || /^HALL[1-5]$/.test(routeCode))
  const isMainEntrance = routeCode === 'HALL1'
  const fill = isDiscreetAccess ? 'transparent' : isBooth
    ? exhibitor
      ? inRoute ? '#d97706' : visited ? '#0f766e' : favorite ? '#e54891' : selected ? '#cf005e' : '#b94185'
      : dark ? '#64748b' : '#cbd5e1'
    : dark ? '#4b1738' : '#f4e8ef'
  const stroke = isDiscreetAccess ? 'none' : isBooth
    ? exhibitor ? darker(fill) : dark ? '#94a3b8' : '#64748b'
    : dark ? '#98617f' : '#b98ca5'
  const gap = Math.min(3.8, rect.width * .09, rect.height * .14)
  const x = rect.x + gap
  const y = rect.y + gap
  const width = Math.max(1, rect.width - gap * 2)
  const height = Math.max(1, rect.height - gap * 2)
  const depth = isometric && isBooth ? Math.min(8, Math.max(2.5, height * .15)) : 0
  const label = feature.boothCode || feature.label || ''
  const showLabel = Boolean(label) && (quality !== 'eco' || !isBooth || selected || Boolean(exhibitor) || zoom >= 2)
  const fontSize = isMainEntrance ? 8.5 : isDiscreetAccess ? 6.5 : Math.max(2.4, Math.min(isService ? 10 : 8, width / Math.max(label.length * .7, 2), height * .32))
  const labelFill = isMainEntrance ? '#0d9488' : isDiscreetAccess ? dark ? '#cbd5e1' : '#64748b' : isBooth && exhibitor ? '#fff' : dark ? '#f8fafc' : '#334155'
  const labelHalo = isDiscreetAccess ? 'transparent' : isBooth && exhibitor ? darker(fill) : dark ? '#475569' : '#f8fafc'
  const compactOutlineWidth = selected ? 1.3 : exhibitor ? .8 : quality === 'eco' ? .28 : .45
  const desktopOutlineWidth = selected ? 1.8 : exhibitor ? 1.05 : quality === 'eco' ? .45 : .65
  const outlineWidth = isDiscreetAccess ? 0 : compact ? compactOutlineWidth * .85 : desktopOutlineWidth
  const labelHaloWidth = compact ? .5 : .65
  const accessibleName = exhibitor ? `Estande ${feature.boothCode} — ${exhibitor.name}${selected ? ' — selecionado' : ''}` : `${feature.label || feature.boothCode || feature.type}${selected ? ' — selecionado' : ''}`

  return <g
    role={feature.interactive ? 'button' : undefined}
    aria-label={accessibleName}
    aria-pressed={feature.interactive ? selected : undefined}
    tabIndex={feature.interactive ? 0 : undefined}
    className={feature.interactive ? 'cursor-pointer outline-none map-feature-focus' : undefined}
    onClick={feature.interactive ? event => { event.stopPropagation(); onSelect() } : undefined}
    onKeyDown={feature.interactive ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect() } } : undefined}
    data-feature-id={feature.id}
  >
    <title>{accessibleName}</title>
    {depth > 0 && <g aria-hidden="true" className="pointer-events-none">
      <path d={`M ${x} ${y + height} L ${x + width} ${y + height} L ${x + width + depth * .55} ${y + height + depth} L ${x + depth * .55} ${y + height + depth} Z`} fill={darker(fill)} opacity=".72" />
      <path d={`M ${x + width} ${y} L ${x + width} ${y + height} L ${x + width + depth * .55} ${y + height + depth} L ${x + width + depth * .55} ${y + depth} Z`} fill={darker(fill)} opacity=".55" />
    </g>}
    {sourcePoints
      ? <polygon
          points={sourcePoints.map(point => `${point.x},${point.y}`).join(' ')}
          fill={fill} stroke={stroke} strokeWidth={outlineWidth}
          data-map-face="top" data-highlighted={exhibitor ? 'true' : 'false'} data-space-code={feature.boothCode || feature.label || ''}
          vectorEffect="non-scaling-stroke"
        />
      : <rect
          x={x} y={y} width={width} height={height} rx={Math.min(3, height * .12)}
          fill={fill} stroke={stroke} strokeWidth={outlineWidth}
          data-map-face="top" data-highlighted={exhibitor ? 'true' : 'false'} data-space-code={feature.boothCode || feature.label || ''}
          vectorEffect="non-scaling-stroke"
        />}
    {showLabel && <text
      x={x + width / 2} y={y + height / 2}
      textAnchor="middle" dominantBaseline="middle"
      fill={labelFill} stroke={labelHalo} strokeWidth={labelHaloWidth} paintOrder="stroke"
      fontSize={fontSize} fontWeight={isDiscreetAccess && !isMainEntrance ? '700' : '900'}
      className="pointer-events-none select-none"
      data-booth-label={isBooth ? label : undefined}
      data-service-label={!isBooth ? label : undefined}
    >{isMainEntrance ? 'ENTRADA · HALL 1' : label}</text>}
    {exhibitor && quality !== 'eco' && (favorite || visited || inRoute) && zoom >= 1.1 && <g className="map-feature-status" transform={`translate(${x + width - 9},${y + 2})`} aria-hidden="true">
      <circle cx="5" cy="5" r="5" fill="#fff" stroke={stroke} strokeWidth="1" />
      {inRoute ? <Bookmark x="2" y="2" width="6" height="6" color="#b45309" fill="#b45309" /> : visited ? <CheckCircle2 x="2" y="2" width="6" height="6" color="#0f766e" /> : <Heart x="2" y="2" width="6" height="6" color="#e11d48" fill="#e11d48" />}
    </g>}
  </g>
})

MapBooth.displayName = 'MapBooth'
