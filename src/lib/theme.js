const THEME_KEY = 'cs_theme'
const META_COLOR = { dark: '#14171b', light: '#eceee9' }

export function getTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

export function applyTheme(t = getTheme()) {
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = META_COLOR[t] || META_COLOR.dark
}

export function setTheme(t) {
  try { localStorage.setItem(THEME_KEY, t) } catch {}
  applyTheme(t)
}
