const MAX_IMAGE_BYTES = 307200
const MAX_IMAGE_SIDE = 768

export const detectPassportPhotoMime = (type = '', name = '') => {
  const normalizedType = type.trim().toLowerCase()
  if (normalizedType === 'image/jpg' || normalizedType === 'image/pjpeg') return 'image/jpeg'
  if (['image/jpeg', 'image/png', 'image/webp'].includes(normalizedType)) return normalizedType

  const extension = name.trim().toLowerCase().split('.').pop()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return ''
}

export const optimizePassportPhoto = async (file: File) => {
  if (!detectPassportPhotoMime(file.type, file.name)) {
    throw new Error('Use uma imagem JPG, JPEG, PNG ou WebP.')
  }

  let source: ImageBitmap | HTMLImageElement
  if ('createImageBitmap' in window) {
    try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch { source = await loadImageElement(file) }
  } else source = await loadImageElement(file)

  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const initialScale = Math.min(1, MAX_IMAGE_SIDE / Math.max(sourceWidth, sourceHeight))
  let width = Math.max(1, Math.round(sourceWidth * initialScale))
  let height = Math.max(1, Math.round(sourceHeight * initialScale))
  const canvas = document.createElement('canvas')

  try {
    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível processar a imagem.')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(source, 0, 0, width, height)

      for (const mime of ['image/webp', 'image/jpeg']) {
        for (let quality = .84; quality >= .48; quality -= .08) {
          const blob = await canvasToBlob(canvas, mime, quality)
          if (!blob || blob.type !== mime) break
          if (blob.size <= MAX_IMAGE_BYTES) {
            return {
              blob,
              width,
              height,
              mime,
              extension: mime === 'image/webp' ? 'webp' : 'jpg',
              size: blob.size,
            }
          }
        }
      }

      width = Math.max(1, Math.round(width * .82))
      height = Math.max(1, Math.round(height * .82))
    }
  } finally {
    if ('close' in source && typeof source.close === 'function') source.close()
  }

  throw new Error('Não foi possível reduzir a foto para o tamanho permitido. Escolha outra imagem.')
}

const canvasToBlob = (canvas: HTMLCanvasElement, mime: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, quality))

const loadImageElement = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem. Verifique se o arquivo não está corrompido.')) }
  image.src = url
})
