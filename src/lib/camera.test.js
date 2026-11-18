import { describe, it, expect, vi, beforeEach } from 'vitest'

const heicTo = vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' }))
const isHeic = vi.fn(async () => false)
vi.mock('heic-to', () => ({ heicTo, isHeic }))

// jsdom can't decode images; fake Image so .heic/garbage fails and image/jpeg loads.
let loaded = []
class FakeImage {
  set src(url) {
    const blob = FakeImage.blobs.get(url)
    loaded.push(blob)
    this.width = 2000; this.height = 1000
    setTimeout(() => (blob.type === 'image/jpeg' ? this.onload() : this.onerror(new Error('decode'))))
  }
}
FakeImage.blobs = new Map()

beforeEach(() => {
  loaded = []; heicTo.mockClear(); isHeic.mockReset(); isHeic.mockResolvedValue(false)
  globalThis.Image = FakeImage
  let n = 0
  URL.createObjectURL = (b) => { const u = `blob:${n++}`; FakeImage.blobs.set(u, b); return u }
  URL.revokeObjectURL = () => {}
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage: () => {} })
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,OUT'
})

const { resizeImage, looksHeic } = await import('./camera.js')

describe('resizeImage', () => {
  it('opens a normal JPEG without loading the HEIC converter', async () => {
    const out = await resizeImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(out.b64).toBe('OUT')
    expect(heicTo).not.toHaveBeenCalled()
  })

  it('converts a .heic file to JPEG first', async () => {
    const out = await resizeImage(new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' }))
    expect(heicTo).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg' }))
    expect(out.b64).toBe('OUT')
  })

  it('converts a HEIC file that arrived with no name or type', async () => {
    isHeic.mockResolvedValue(true)
    const out = await resizeImage(new File(['x'], 'image', { type: '' }))
    expect(heicTo).toHaveBeenCalled()
    expect(out.b64).toBe('OUT')
  })

  it('still fails for a file that is neither readable nor HEIC', async () => {
    await expect(resizeImage(new File(['x'], 'doc.bin', { type: '' }))).rejects.toBeTruthy()
    expect(heicTo).not.toHaveBeenCalled()
  })

  it('recognizes HEIC names and types', () => {
    expect(looksHeic({ name: 'x.heif' })).toBe(true)
    expect(looksHeic({ name: 'x', type: 'image/heic' })).toBe(true)
    expect(looksHeic({ name: 'x.jpg', type: 'image/jpeg' })).toBe(false)
  })
})
