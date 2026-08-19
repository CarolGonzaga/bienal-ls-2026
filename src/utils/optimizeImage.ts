export const optimizePassportPhoto = async (file: File) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.')
  let source: ImageBitmap | HTMLImageElement
  if ('createImageBitmap' in window) {
    try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch { source = await loadImageElement(file) }
  } else source = await loadImageElement(file)
  const maxSide = 768
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível processar a imagem.')
  context.drawImage(source, 0, 0, width, height)
  if ('close' in source && typeof source.close === 'function') source.close()
  let quality = .84
  let blob: Blob | null = null
  while (quality >= .58) {
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality))
    if (blob && blob.size <= 307200) break
    quality -= .08
  }
  if (!blob) throw new Error('Não foi possível converter a imagem.')
  if (blob.size > 307200) throw new Error('A foto continua muito grande após a otimização. Escolha outra imagem.')
  return { blob, width, height, mime: 'image/webp', size: blob.size }
}

const loadImageElement = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')) }
  image.src = url
})
