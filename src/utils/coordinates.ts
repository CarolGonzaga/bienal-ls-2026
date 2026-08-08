import * as THREE from 'three'
import { Point2D } from '../types'

export const MAP_ORIGINAL_WIDTH = 2026
export const MAP_ORIGINAL_HEIGHT = 1684

// World aspect ratio matches 2026 / 1684 = ~1.203
export const WORLD_WIDTH = 40
export const WORLD_HEIGHT = 33.25

export interface NormalizedPoint {
  xNormalized: number
  yNormalized: number
}

export interface WorldPoint {
  worldX: number
  worldZ: number
}

/**
 * Normalizes original image pixel coordinates (0..2026, 0..1684) to (0..1, 0..1)
 */
export function normalizeCoordinates(xOriginal: number, yOriginal: number): NormalizedPoint {
  return {
    xNormalized: xOriginal / MAP_ORIGINAL_WIDTH,
    yNormalized: yOriginal / MAP_ORIGINAL_HEIGHT
  }
}

/**
 * Denormalizes (0..1, 0..1) to original pixel values (0..2026, 0..1684)
 */
export function denormalizeCoordinates(xNormalized: number, yNormalized: number): Point2D {
  return {
    x: xNormalized * MAP_ORIGINAL_WIDTH,
    y: yNormalized * MAP_ORIGINAL_HEIGHT
  }
}

/**
 * Converts normalized coordinates to 3D world space (X, Z) with Y inverted for proper visual orientation
 */
export function toWorldCoordinates(xNormalized: number, yNormalized: number): WorldPoint {
  return {
    worldX: (xNormalized - 0.5) * WORLD_WIDTH,
    worldZ: (0.5 - yNormalized) * WORLD_HEIGHT
  }
}

/**
 * Converts 3D world space (worldX, worldZ) back to normalized coordinates (0..1, 0..1)
 */
export function fromWorldCoordinates(worldX: number, worldZ: number): NormalizedPoint {
  return {
    xNormalized: worldX / WORLD_WIDTH + 0.5,
    yNormalized: 0.5 - worldZ / WORLD_HEIGHT
  }
}

/**
 * Computes bounding box center of a polygon in world coordinates
 */
export function getPolygonWorldCenter(normalizedPolygon: Point2D[]): WorldPoint {
  if (!normalizedPolygon || normalizedPolygon.length === 0) {
    return { worldX: 0, worldZ: 0 }
  }

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  normalizedPolygon.forEach(p => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  })

  const centerXNorm = (minX + maxX) / 2
  const centerYNorm = (minY + maxY) / 2

  return toWorldCoordinates(centerXNorm, centerYNorm)
}

/**
 * Converts array of normalized 2D polygon points to a THREE.Shape centered relative to (0,0)
 */
export function polygonToRelativeWorldShape(normalizedPolygon: Point2D[], center: WorldPoint): THREE.Shape {
  const shape = new THREE.Shape()

  if (!normalizedPolygon || normalizedPolygon.length === 0) {
    return shape
  }

  const p0 = toWorldCoordinates(normalizedPolygon[0].x, normalizedPolygon[0].y)
  shape.moveTo(p0.worldX - center.worldX, p0.worldZ - center.worldZ)

  for (let i = 1; i < normalizedPolygon.length; i++) {
    const pt = toWorldCoordinates(normalizedPolygon[i].x, normalizedPolygon[i].y)
    shape.lineTo(pt.worldX - center.worldX, pt.worldZ - center.worldZ)
  }

  shape.closePath()
  return shape
}
