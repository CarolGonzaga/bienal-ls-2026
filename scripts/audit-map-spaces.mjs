import { MAPA_PNG_SPACES } from '../src/data/map/mapaPngSpaces.ts'

const pointInside = (space, x, y) => {
  if (!space.points) {
    const [x1, y1, x2, y2] = space.bounds
    return x > x1 && x < x2 && y > y1 && y < y2
  }
  let inside = false
  for (let i = 0, j = space.points.length - 1; i < space.points.length; j = i++) {
    const [xi, yi] = space.points[i]
    const [xj, yj] = space.points[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const overlaps = []
for (let i = 0; i < MAPA_PNG_SPACES.length; i += 1) {
  const first = MAPA_PNG_SPACES[i]
  const [ax1, ay1, ax2, ay2] = first.bounds
  for (let j = i + 1; j < MAPA_PNG_SPACES.length; j += 1) {
    const second = MAPA_PNG_SPACES[j]
    const [bx1, by1, bx2, by2] = second.bounds
    const left = Math.max(ax1, bx1)
    const top = Math.max(ay1, by1)
    const right = Math.min(ax2, bx2)
    const bottom = Math.min(ay2, by2)
    if (right - left <= 1 || bottom - top <= 1) continue
    let shared = 0
    for (let y = Math.ceil(top); y < bottom && shared === 0; y += 1) {
      for (let x = Math.ceil(left); x < right; x += 1) {
        if (pointInside(first, x + .5, y + .5) && pointInside(second, x + .5, y + .5)) { shared += 1; break }
      }
    }
    if (shared) overlaps.push(`${first.code} × ${second.code}`)
  }
}

const codes = new Set()
const duplicateCodes = []
for (const space of MAPA_PNG_SPACES) {
  const code = space.code.toUpperCase()
  if (codes.has(code)) duplicateCodes.push(code)
  codes.add(code)
}

console.log(JSON.stringify({ spaces: MAPA_PNG_SPACES.length, booths: MAPA_PNG_SPACES.filter(space => space.type === 'booth').length, overlaps, duplicateCodes }, null, 2))
if (overlaps.length || duplicateCodes.length) process.exitCode = 1
