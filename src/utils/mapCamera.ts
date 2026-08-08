export interface MapFocusInput {
  centerXNorm: number
  centerYNorm: number
  viewportWidth: number
  viewportHeight: number
  zoom: number
  contentAspectRatio?: number
}

export const calculateFittedMapSize = (viewportWidth: number, viewportHeight: number, contentAspectRatio = 16 / 9) => {
  const viewportAspectRatio = viewportWidth / viewportHeight
  return viewportAspectRatio > contentAspectRatio
    ? { width: viewportHeight * contentAspectRatio, height: viewportHeight }
    : { width: viewportWidth, height: viewportWidth / contentAspectRatio }
}

export const calculateMapPanBounds = (viewportWidth: number, viewportHeight: number, zoom: number, contentAspectRatio = 16 / 9) => {
  const fitted = calculateFittedMapSize(viewportWidth, viewportHeight, contentAspectRatio)
  const scaledWidth = fitted.width * zoom
  const scaledHeight = fitted.height * zoom
  return {
    maxX: scaledWidth <= viewportWidth ? 0 : scaledWidth / 2,
    maxY: scaledHeight <= viewportHeight ? 0 : scaledHeight / 2
  }
}

export const calculateMapFocusOffset = ({
  centerXNorm,
  centerYNorm,
  viewportWidth,
  viewportHeight,
  zoom,
  contentAspectRatio = 16 / 9
}: MapFocusInput) => {
  const fitted = calculateFittedMapSize(viewportWidth, viewportHeight, contentAspectRatio)

  const deltaX = centerXNorm - .5
  const deltaY = centerYNorm - .5
  return {
    x: deltaX === 0 ? 0 : -deltaX * fitted.width * zoom,
    y: deltaY === 0 ? 0 : -deltaY * fitted.height * zoom
  }
}
