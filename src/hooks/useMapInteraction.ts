import { useState, useCallback, useRef, useEffect } from 'react'
import { calculateMapFocusOffset, calculateMapPanBounds } from '../utils/mapCamera.ts'

interface MapTransform {
  x: number
  y: number
  zoom: number
  tiltDeg: number
}

interface UseMapInteractionOptions {
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  minTilt?: number
  maxTilt?: number
  initialTilt?: number
  zoomStep?: number
  focusZoom?: number
  reducedMotion?: boolean
}

interface UseMapInteractionReturn {
  transform: MapTransform
  containerRef: React.RefObject<HTMLDivElement>
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onWheel: (e: React.WheelEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onDoubleClick: (e: React.MouseEvent) => void
    onClickCapture: (e: React.MouseEvent) => void
  }
  animateToStand: (centerXNorm: number, centerYNorm: number) => void
  resetView: () => void
  setTilt: (deg: number) => void
  zoomIn: () => void
  zoomOut: () => void
}

export function useMapInteraction(options: UseMapInteractionOptions = {}): UseMapInteractionReturn {
  const {
    minZoom = 0.4,
    maxZoom = 4,
    initialZoom = 1,
    minTilt = 0,
    maxTilt = 55,
    initialTilt = 45,
    zoomStep = 0.15,
    focusZoom = 2.2,
    reducedMotion = false
  } = options

  const containerRef = useRef<HTMLDivElement>(null)

  const [transform, setTransform] = useState<MapTransform>({
    x: 0,
    y: 0,
    zoom: Math.min(Math.max(initialZoom, minZoom), maxZoom),
    tiltDeg: initialTilt
  })

  // Dragging state
  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const transformStart = useRef({ x: 0, y: 0 })

  // Pinch zoom state
  const lastPinchDistance = useRef(0)

  // Animation frame ref
  const animFrameRef = useRef<number>()

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    isDragging.current = true
    hasDragged.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    transformStart.current = { x: transform.x, y: transform.y }
    e.preventDefault()
  }, [transform.x, transform.y])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (!hasDragged.current && Math.hypot(dx, dy) < 3) return
    hasDragged.current = true
    const rect = containerRef.current?.getBoundingClientRect()
    setTransform(prev => {
      const width = rect?.width || 1000
      const height = rect?.height || 700
      const bounds = calculateMapPanBounds(width, height, prev.zoom)
      return { ...prev,
        x: clamp(transformStart.current.x + dx, -bounds.maxX, bounds.maxX),
        y: clamp(transformStart.current.y + dy, -bounds.maxY, bounds.maxY)
      }
    })
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    window.setTimeout(() => { hasDragged.current = false }, 0)
  }, [])

  const onMouseLeave = useCallback(() => {
    isDragging.current = false
    hasDragged.current = false
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const rect = containerRef.current?.getBoundingClientRect()
    setTransform(prev => {
      const zoom = clamp(prev.zoom + delta * prev.zoom, minZoom, maxZoom)
      if (!rect || zoom === prev.zoom) return { ...prev, zoom }
      const ratio = zoom / prev.zoom
      const focalX = e.clientX - rect.left - rect.width / 2
      const focalY = e.clientY - rect.top - rect.height / 2
      const x = prev.x + (1 - ratio) * (focalX - prev.x)
      const y = prev.y + (1 - ratio) * (focalY - prev.y)
      const bounds = calculateMapPanBounds(rect.width, rect.height, zoom)
      return {
        ...prev,
        x: clamp(x, -bounds.maxX, bounds.maxX),
        y: clamp(y, -bounds.maxY, bounds.maxY),
        zoom
      }
    })
  }, [minZoom, maxZoom])

  // Touch handlers
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      hasDragged.current = false
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      transformStart.current = { x: transform.x, y: transform.y }
    } else if (e.touches.length === 2) {
      lastPinchDistance.current = getTouchDistance(e.touches)
    }
  }, [transform.x, transform.y])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      if (!hasDragged.current && Math.hypot(dx, dy) < 3) return
      hasDragged.current = true
      const rect = containerRef.current?.getBoundingClientRect()
      setTransform(prev => {
        const width = rect?.width || 1000
        const height = rect?.height || 700
        const bounds = calculateMapPanBounds(width, height, prev.zoom)
        return {
          ...prev,
          x: clamp(transformStart.current.x + dx, -bounds.maxX, bounds.maxX),
          y: clamp(transformStart.current.y + dy, -bounds.maxY, bounds.maxY)
        }
      })
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      if (lastPinchDistance.current > 0) {
        const scale = dist / lastPinchDistance.current
        const rect = containerRef.current?.getBoundingClientRect()
        setTransform(prev => {
          const zoom = clamp(prev.zoom * scale, minZoom, maxZoom)
          const bounds = calculateMapPanBounds(rect?.width || 1000, rect?.height || 700, zoom)
          return { ...prev, zoom, x: clamp(prev.x, -bounds.maxX, bounds.maxX), y: clamp(prev.y, -bounds.maxY, bounds.maxY) }
        })
      }
      lastPinchDistance.current = dist
    }
  }, [minZoom, maxZoom])

  const onTouchEnd = useCallback(() => {
    isDragging.current = false
    lastPinchDistance.current = 0
    window.setTimeout(() => { hasDragged.current = false }, 0)
  }, [])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!hasDragged.current) return
    e.preventDefault()
    e.stopPropagation()
    hasDragged.current = false
  }, [])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setTransform(prev => ({ ...prev, zoom: clamp(prev.zoom * 1.35, minZoom, maxZoom) }))
  }, [minZoom, maxZoom])

  // Smooth animation to center on a stand
  const animateToStand = useCallback((centerXNorm: number, centerYNorm: number) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const targetZoom = clamp(focusZoom, minZoom, maxZoom)
    const { x: targetX, y: targetY } = calculateMapFocusOffset({
      centerXNorm,
      centerYNorm,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      zoom: targetZoom
    })

    if (reducedMotion) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setTransform(prev => ({ ...prev, x: targetX, y: targetY, zoom: targetZoom }))
      return
    }

    const startTransform = { ...transform }
    const startTime = performance.now()
    const duration = 600 // ms

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)

      setTransform({
        x: startTransform.x + (targetX - startTransform.x) * ease,
        y: startTransform.y + (targetY - startTransform.y) * ease,
        zoom: startTransform.zoom + (targetZoom - startTransform.zoom) * ease,
        tiltDeg: startTransform.tiltDeg
      })

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)
  }, [focusZoom, maxZoom, minZoom, reducedMotion, transform])

  const resetView = useCallback(() => {
    if (reducedMotion) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setTransform(prev => ({ ...prev, x: 0, y: 0, zoom: initialZoom, tiltDeg: initialTilt }))
      return
    }
    const startTransform = { ...transform }
    const startTime = performance.now()
    const duration = 500

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)

      setTransform({
        x: startTransform.x * (1 - ease),
        y: startTransform.y * (1 - ease),
        zoom: startTransform.zoom + (initialZoom - startTransform.zoom) * ease,
        tiltDeg: startTransform.tiltDeg + (initialTilt - startTransform.tiltDeg) * ease
      })

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)
  }, [transform, initialTilt, initialZoom, reducedMotion])

  const setTilt = useCallback((deg: number) => {
    const clamped = clamp(deg, minTilt, maxTilt)
    if (reducedMotion) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setTransform(prev => ({ ...prev, tiltDeg: clamped }))
      return
    }
    const startTilt = transform.tiltDeg
    const startTime = performance.now()
    const duration = 400

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)

      setTransform(prev => ({
        ...prev,
        tiltDeg: startTilt + (clamped - startTilt) * ease
      }))

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)
  }, [transform.tiltDeg, minTilt, maxTilt, reducedMotion])

  const zoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    setTransform(prev => {
      const zoom = clamp(prev.zoom + zoomStep, minZoom, maxZoom)
      const bounds = calculateMapPanBounds(rect?.width || 1000, rect?.height || 700, zoom)
      return { ...prev, zoom, x: clamp(prev.x, -bounds.maxX, bounds.maxX), y: clamp(prev.y, -bounds.maxY, bounds.maxY) }
    })
  }, [minZoom, maxZoom, zoomStep])

  const zoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    setTransform(prev => {
      const zoom = clamp(prev.zoom - zoomStep, minZoom, maxZoom)
      const bounds = calculateMapPanBounds(rect?.width || 1000, rect?.height || 700, zoom)
      return { ...prev, zoom, x: clamp(prev.x, -bounds.maxX, bounds.maxX), y: clamp(prev.y, -bounds.maxY, bounds.maxY) }
    })
  }, [minZoom, maxZoom, zoomStep])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return {
    transform,
    containerRef,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd
      ,onDoubleClick,
      onClickCapture
    },
    animateToStand,
    resetView,
    setTilt,
    zoomIn,
    zoomOut
  }
}
