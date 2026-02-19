/**
 * Compress an image file to max 800px width, JPEG quality 0.7.
 * Returns a base64 data URI string.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    const img = new Image()
    img.onload = () => {
      const maxWidth = 800
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(img.src)
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Count how many messages in localStorage have images attached.
 * Used to warn users about localStorage limits.
 */
export function getImageStorageCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem('constructionglue-messages')
    if (!raw) return 0
    const messages = JSON.parse(raw) as Array<{ image?: string }>
    return messages.filter(m => m.image).length
  } catch {
    return 0
  }
}
