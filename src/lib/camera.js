const MAX_PX = 1600
const QUALITY = 0.82

export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
        else { width = Math.round(width * MAX_PX / height); height = MAX_PX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      resolve({ b64: dataUrl.split(',')[1], type: 'image/jpeg', dataUrl })
    }
    img.onerror = reject
    img.src = url
  })
}

export function downloadVcf(filename, content) {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Crop a photo to the card's box (0-1 fractions) with a little margin, so the review
// screen shows the card instead of the whole table. Resolves to a JPEG data URL.
export function cropToBox(dataUrl, box, pad = 0.04) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.width, H = img.height
      const x0 = Math.max(0, box.x - pad), y0 = Math.max(0, box.y - pad)
      const x1 = Math.min(1, box.x + box.width + pad), y1 = Math.min(1, box.y + box.height + pad)
      const sx = Math.round(x0 * W), sy = Math.round(y0 * H)
      const sw = Math.round((x1 - x0) * W), sh = Math.round((y1 - y0) * H)
      const canvas = document.createElement('canvas')
      canvas.width = sw; canvas.height = sh
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
