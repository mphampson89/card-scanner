import { describe, it, expect, vi } from 'vitest'
import { updateApp } from './update.js'

describe('updateApp', () => {
  it('refreshes the service worker, clears caches, then reloads', async () => {
    const update = vi.fn(async () => {})
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true,
      value: { getRegistrations: async () => [{ update }] } })
    const del = vi.fn(async () => true)
    window.caches = { keys: async () => ['card-scanner-v3'], delete: del }
    const reload = vi.fn()
    await updateApp({ reload })
    expect(update).toHaveBeenCalled()
    expect(del).toHaveBeenCalledWith('card-scanner-v3')
    expect(reload).toHaveBeenCalled()
  })
})
