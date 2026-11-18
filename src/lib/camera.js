const MAX_PX = 1600
const QUALITY = 0.82

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

export const looksHeic = (f) => /\.(heic|heif)$/i.test(f.name || '') || /hei[cf]/i.test(f.type || '')

// iPhone HEIC photos can't be opened by Chrome/Firefox. Convert them to JPEG in the browser.
// The converter (~3 MB) is only downloaded the first time a HEIC file is picked.
export async function heicToJpeg(file) {
  const { heicTo, isHeic } = await import('heic-to')
  if (!looksHeic(file) && !(await isHeic(file))) throw new Error('not heic')
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 })
}

async function openImage(file) {
  if (looksHeic(file)) return loadImage(await heicToJpeg(file))
  try {
    return await loadImage(file)
  } catch (e) {
    // Some HEIC files arrive with no name or type; check the contents before giving up.
    try { return loadImage(await heicToJpeg(file)) } catch { throw e }
  }
}

export async function resizeImage(file) {
  const img = await openImage(file)
  let { width, height } = img
  if (width > MAX_PX || height > MAX_PX) {
    if (width >= height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
    else { width = Math.round(width * MAX_PX / height); height = MAX_PX }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return { b64: dataUrl.split(',')[1], type: 'image/jpeg', dataUrl }
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
export function cropToBox(dataUrl, box, pad = 0.04, maxPx = MAX_PX) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.width, H = img.height
      const x0 = Math.max(0, box.x - pad), y0 = Math.max(0, box.y - pad)
      const x1 = Math.min(1, box.x + box.width + pad), y1 = Math.min(1, box.y + box.height + pad)
      const sx = Math.round(x0 * W), sy = Math.round(y0 * H)
      const sw = Math.round((x1 - x0) * W), sh = Math.round((y1 - y0) * H)
      const scale = Math.min(1, maxPx / Math.max(sw, sh))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale)
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

// Smaller copy of the card for saving with the contact: cropped if we know where the card is,
// otherwise the whole photo, at most 900px on the long side.
export const CARD_IMAGE_PX = 900
export function cardImageFor(dataUrl, box) {
  return cropToBox(dataUrl, box || { x: 0, y: 0, width: 1, height: 1 }, box ? 0.04 : 0, CARD_IMAGE_PX)
}
