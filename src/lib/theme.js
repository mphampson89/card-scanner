const THEME_KEY = 'cs_theme'
const META_COLOR = { dark: '#0e1013', light: '#eef0f2' }

// 'system' follows the phone's setting (read once at load; ponytail: no live listener).
export function getTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch { return 'system' }
}

function resolve(t) {
  if (t !== 'system') return t
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(t = getTheme()) {
  const mode = resolve(t)
  document.documentElement.setAttribute('data-theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = META_COLOR[mode]
}

export function setTheme(t) {
  try {
    if (t === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, t)
  } catch {}
  applyTheme(t)
}
