import React from 'react'
import type { CalculatedRouteSegment } from '../../services/mapRoutingService.ts'

export const MapRoute: React.FC<{ segments: CalculatedRouteSegment[]; compact?: boolean }> = ({ segments, compact = false }) => {
  if (!segments.length) return null
  const origin = segments[0].points[0]
  const outerWidth = compact ? 2.6 : 4
  const innerWidth = compact ? 1.25 : 2
  const destinationRadius = compact ? 6 : 8
  const originRadius = compact ? 5 : 7
  return <g id="route-layer" data-testid="gps-route" className="pointer-events-none">
    {segments.map(segment => {
      const d = segment.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
      return <g key={`${segment.fromId}-${segment.toId}`} data-route-segment={segment.index + 1} data-route-from={segment.fromLabel} data-route-to={segment.toLabel} data-route-color={segment.color}>
        <path d={d} fill="none" stroke="#fff" strokeWidth={outerWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke={segment.color} strokeWidth={innerWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
    })}
    {segments.map(segment => {
      const destination = segment.points[segment.points.length - 1]
      return <g key={`marker-${segment.fromId}-${segment.toId}`} transform={`translate(${destination.x} ${destination.y})`}>
          <circle r={destinationRadius} fill={segment.color} stroke="#fff" strokeWidth={compact ? 1 : 1.5} vectorEffect="non-scaling-stroke"/>
          <text textAnchor="middle" dominantBaseline="middle" fontSize={compact ? 6 : 8} fontWeight="900" fill="#fff">{segment.index + 1}</text>
      </g>
    })}
    <g transform={`translate(${origin.x} ${origin.y})`}><circle r={originRadius} fill="#b94185" stroke="#fff" strokeWidth={compact ? 1 : 1.5} vectorEffect="non-scaling-stroke"/><circle r={compact ? 1.7 : 2.2} fill="#fff"/></g>
  </g>
}
