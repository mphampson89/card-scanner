// Pull the latest deploy: refresh the service worker, clear its cached files, reload.
export async function updateApp({ reload = () => location.reload() } = {}) {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.update().catch(() => {})))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  reload()
}

// Set at build time in vite.config.js; shows which deploy is running.
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
