import type { Point2D } from '../../types/index.ts'

export const REFERENCE_WIDTH = 1920
export const REFERENCE_HEIGHT = 1080
export const GUIDE_WIDTH = REFERENCE_WIDTH
export const GUIDE_HEIGHT = REFERENCE_HEIGHT
export const MAP_VIEWBOX_WIDTH = REFERENCE_WIDTH
export const MAP_VIEWBOX_HEIGHT = REFERENCE_HEIGHT

/** MAPA.png and the SVG now share the exact same native coordinate system. */
export const referenceToMap = (point: Point2D): Point2D => ({ ...point })
export const mapToReference = (point: Point2D): Point2D => ({ ...point })
export const referenceLengthToMap = (value: number) => value

export const referenceBoundsToMap = ([x1, y1, x2, y2]: [number, number, number, number]) => ({
  x: x1,
  y: y1,
  width: x2 - x1,
  height: y2 - y1
})

export const referencePolygonToMap = (points: Point2D[]) => points.map(point => ({ ...point }))

export const screenToMap = (clientPoint: Point2D, screenMatrix: DOMMatrix): Point2D => {
  const inverse = screenMatrix.inverse()
  return {
    x: inverse.a * clientPoint.x + inverse.c * clientPoint.y + inverse.e,
    y: inverse.b * clientPoint.x + inverse.d * clientPoint.y + inverse.f
  }
}
