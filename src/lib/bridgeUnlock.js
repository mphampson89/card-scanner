export const MY_APP_ID = 'scanner'

// Prod + temporary branch-deploy. Remove the branch entry at Phase-2 close (spec §9/L).
export const TRUSTED_PARENTS = [
  'https://bridge-mph.netlify.app',
  'https://cockpit-shell--bridge-mph.netlify.app',
]

export function resolveTrustedParent(embedderOrigin) {
  return embedderOrigin && TRUSTED_PARENTS.includes(embedderOrigin) ? embedderOrigin : null
}

export function currentEmbedderOrigin() {
  try {
    const ao = window.location.ancestorOrigins
    if (ao && ao.length) return ao[0]
    return document.referrer ? new URL(document.referrer).origin : null
  } catch {
    return null
  }
}

export function pickTrustedParent() {
  return resolveTrustedParent(currentEmbedderOrigin())
}

// DOM-free so it is node-testable. Origin-authoritative; data.app is advisory.
export function validateUnlock(ev, cfg) {
  if (ev.origin !== cfg.parentOrigin) return { ok: false }
  if (ev.source !== cfg.parentWindow) return { ok: false }
  const d = ev.data
  if (!d || typeof d !== 'object') return { ok: false }
  if (d.type !== 'bridge.unlock' || d.v !== 1 || d.app !== MY_APP_ID) return { ok: false }
  if (typeof d.reqId !== 'string' || d.reqId.length === 0) return { ok: false }
  const cred = d.credential
  if (typeof cred !== 'string' || cred.length === 0 || cred.length > 256) return { ok: false }
  return { ok: true, credential: cred, reqId: d.reqId }
}
